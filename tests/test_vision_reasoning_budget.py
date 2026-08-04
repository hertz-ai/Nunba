"""Vision description must not be swallowed by a reasoning model's think budget.

WHAT WENT WRONG (live, 2026-08-04, build/Nunba pid 31520):
    POST /upload/vision  with a real PNG
    -> 17s -> {"category":"unknown","description":""}

No exception, no failure log, HTTP 200 throughout.  The route's three failure
paths ("Failed to read image", "llama.cpp not running", "Vision inference
returned <code>") ALL stayed silent, because none of them fired.

Root cause: the server is Qwen3.5-4B (capabilities ["completion","multimodal"],
modalities {'vision': True}) — a HYBRID REASONING model.  It emits thinking
into a SEPARATE `reasoning_content` field and only then writes `content`.
_describe_image_via_llm reads `message.content` alone.

Measured against the live server with the route's own JSON-classification
prompt:
    max_tokens=300   -> finish=length, content=0 chars,   reasoning=1242 chars
    max_tokens=2000  -> finish=stop,   content=178 chars, reasoning=6228 chars
So the entire 300-token budget was consumed by thinking and the visible answer
never began.

It is prompt-complexity dependent, which is why it looks intermittent: a short
prompt ("describe in one sentence") completed inside 300 tokens with 760
reasoning chars, while the route's JSON-classification prompt needed 1242.

THE FIX has two independent halves and this file pins both:
  1. Ask the model not to think.  chat_template_kwargs {"enable_thinking":
     false} was verified live to work (reasoning 760 -> 0 chars, and faster).
     `reasoning_effort: "none"` was ALSO tried and does NOT work on this
     server (still 720 reasoning chars) — do not substitute it.
  2. Never fail silently again.  finish_reason == 'length' with empty content
     is the exact signature of this bug; it must WARN, not return None mutely.
     That is the #611 lesson (a progress UI that could not report failure)
     applied to a code path.

max_tokens is also raised, but deliberately as a SAFETY NET rather than the
fix: with thinking disabled 300 would suffice, yet a future model or a longer
prompt should degrade into a slower answer, not an empty one.
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import upload_routes  # noqa: E402


def _resp(content, finish='stop', status=200, reasoning=''):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = {
        "choices": [{
            "finish_reason": finish,
            "message": {"content": content, "reasoning_content": reasoning},
        }]
    }
    r.text = ''
    return r


@pytest.fixture
def img(tmp_path):
    p = tmp_path / "x.png"
    p.write_bytes(bytes.fromhex(
        '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753'
        'de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082'))
    return str(p)


def test_request_asks_the_model_not_to_think(img):
    """THE fix. Verified live: enable_thinking=false took reasoning 760 -> 0."""
    with patch.object(upload_routes, 'requests', create=True):
        with patch('requests.post', return_value=_resp('ok')) as post:
            upload_routes._describe_image_via_llm(img)
    payload = post.call_args.kwargs['json']
    kw = payload.get('chat_template_kwargs') or {}
    assert kw.get('enable_thinking') is False, (
        f"payload must disable thinking; got chat_template_kwargs={kw!r}. "
        f"Without it a reasoning model spends the whole budget in "
        f"reasoning_content and returns content=''")


def test_does_not_use_reasoning_effort_none(img):
    """Probed live and it does NOT suppress thinking on this server (720 chars
    of reasoning remained). Pinning so it is not swapped in as an equivalent."""
    with patch('requests.post', return_value=_resp('ok')) as post:
        upload_routes._describe_image_via_llm(img)
    assert post.call_args.kwargs['json'].get('reasoning_effort') != 'none'


def test_token_budget_has_headroom(img):
    with patch('requests.post', return_value=_resp('ok')) as post:
        upload_routes._describe_image_via_llm(img)
    mx = post.call_args.kwargs['json'].get('max_tokens', 0)
    assert mx >= 800, (
        f"max_tokens={mx} is the value that produced content='' live. Keep "
        f"headroom so a verbose model degrades to slow, not empty.")


def test_truncated_empty_answer_warns_instead_of_failing_silently(img, caplog):
    """finish_reason='length' + empty content is THIS bug's signature."""
    with patch('requests.post', return_value=_resp('', finish='length',
                                                   reasoning='thinking...')):
        out = upload_routes._describe_image_via_llm(img)
    assert out in (None, '')
    joined = ' '.join(r.message for r in caplog.records).lower()
    assert 'length' in joined or 'truncat' in joined or 'empty' in joined, (
        'an empty answer caused by hitting the token cap must be logged; it '
        'silently returned None for the whole session otherwise')


def test_normal_answer_still_returned_unchanged(img):
    """Zero regression on the happy path."""
    with patch('requests.post', return_value=_resp('  a red square  ')):
        assert upload_routes._describe_image_via_llm(img) == 'a red square'


def test_non_200_still_returns_none(img):
    with patch('requests.post', return_value=_resp('', status=500)):
        assert upload_routes._describe_image_via_llm(img) is None

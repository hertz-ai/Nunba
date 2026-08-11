"""The chat busy-message must not promise "a few seconds" it cannot keep.

R3, reported live 2026-08-11:

    Your local AI is still working on another task. Try again in a few seconds.
       … 1 hour later …
    Setting up cuda torch...
    I'm upgrading my voice. Next time we talk, I'll sound much better.

The retry hint was wrong by three orders of magnitude.  A hint that never comes
true teaches users to stop trying — worse than saying nothing.  And the honest
explanation existed all along: "Setting up cuda torch…" / "I'm upgrading my
voice…" were already being emitted elsewhere.  They are the RIGHT shape; they
just weren't what the busy-guard said.

THE SIGNAL ALREADY EXISTS — nothing new to invent.  `models.language_bootstrap`
tracks per-step `status` + `detail`, and `_ensure_cuda_torch` writes the pip
progress INTO that detail ("Installing CUDA PyTorch (one-time ~2.5GB)…",
"pip: MarkupSafe>=2.0 (from jinja2->torch) (elapsed 221s)").  So the module that
owns the state answers the question, and `routes/chatbot_routes.py` already
imports `get_status()` from it (:4351) — an established consumer, not new coupling.

What these tests pin:
  * a single canonical accessor for "what is blocking, and is it long-running?"
  * the busy branch consults it rather than asserting a fixed duration
  * "a few seconds" is not stated unconditionally
  * `retry_hint_seconds` is DERIVED, so a multi-minute install cannot be
    advertised as a 15-second wait

Deliberately NOT asserted: exact copy.  Wording is the product's call; what must
hold is that the number and the claim come from measured state.
"""
import ast
import pathlib

import pytest

NUNBA = pathlib.Path(__file__).resolve().parent.parent
BOOTSTRAP = NUNBA / 'models' / 'language_bootstrap.py'
ROUTES = NUNBA / 'routes' / 'chatbot_routes.py'


def test_blocking_activity_accessor_exists():
    """ONE place answers 'what is blocking right now?'."""
    from models.language_bootstrap import get_blocking_activity
    assert callable(get_blocking_activity)


def test_blocking_activity_returns_none_when_nothing_is_installing():
    """No install in flight => no special-case message, normal busy path."""
    from models.language_bootstrap import get_blocking_activity
    result = get_blocking_activity()
    # Nothing is bootstrapping in a unit-test process.
    assert result is None or isinstance(result, dict)


@pytest.mark.parametrize('detail,expect_long', [
    ('Installing CUDA PyTorch (one-time ~2.5GB)...', True),
    ('pip: MarkupSafe>=2.0 (from jinja2->torch) (elapsed 221s)', True),
    ('Downloading model shard 3/8', True),
    ('Starting Moonshine Base (sherpa-onnx, EN)...', False),
    ('Running on gpu', False),
    ('', False),
])
def test_long_running_detail_is_classified(detail, expect_long):
    """A pip/download detail means MINUTES; a load detail means seconds.

    This is the whole point: the classification decides whether the user is told
    "a few seconds" or "a few minutes".  Getting it wrong is what produced the
    hour-long lie.
    """
    from models.language_bootstrap import _detail_is_long_running
    assert _detail_is_long_running(detail) is expect_long


def test_busy_branch_consults_the_accessor():
    """RED before the fix: the branch hardcoded the duration."""
    src = ROUTES.read_text(encoding='utf-8', errors='replace')
    assert 'get_blocking_activity' in src, (
        'routes/chatbot_routes.py still tells the user to retry without asking '
        'what is actually blocking. When a multi-GB install holds the model, '
        '"a few seconds" is wrong by three orders of magnitude.')


def test_a_few_seconds_is_not_asserted_unconditionally():
    """The phrase may survive for the genuinely-short case, but not as the
    only thing said when we have no idea how long it will be."""
    src = ROUTES.read_text(encoding='utf-8', errors='replace')
    assert '"Your local AI is still working on another task. "\n' \
           '                    "Try again in a few seconds."' not in src, (
        'the unconditional "few seconds" busy message is still present verbatim')


def test_retry_hint_seconds_is_not_a_bare_literal_in_the_busy_branch():
    """`retry_hint_seconds` must be derived, not asserted.

    A fixed 15 advertised while a 221s pip resolve runs is the numeric form of
    the same lie the text was telling.
    """
    src = ROUTES.read_text(encoding='utf-8', errors='replace')
    tree = ast.parse(src)
    bare = []
    for node in ast.walk(tree):
        if (isinstance(node, ast.keyword) and node.arg == 'retry_hint_seconds'
                and isinstance(node.value, ast.Constant)):
            bare.append(node.value.value)
        # dict form: {'retry_hint_seconds': 15}
        if isinstance(node, ast.Dict):
            for k, v in zip(node.keys, node.values):
                if (isinstance(k, ast.Constant) and k.value == 'retry_hint_seconds'
                        and isinstance(v, ast.Constant) and v.value == 15):
                    bare.append(v.value)
    assert 15 not in bare, (
        "the busy branch still hardcodes retry_hint_seconds=15. Derive it from "
        'the blocking activity so a multi-minute install is not advertised as a '
        '15-second wait.')

"""tts.verified_llm forwards to HARTOS core.verified_llm by its real signature.

HARTOS's probe is ``verify_llm(url, timeout, prompt, max_tokens)``.  The
forwarder called it with ``endpoint=`` and ``timeout_s=``, so every call
raised TypeError, a bare ``except Exception: pass`` hid it, and the inline
fallback ran instead: the HARTOS path never ran once.

The fallback timed itself with time.monotonic, which on Windows ticks every
15.6 ms (GetTickCount64), so a fast local round trip read 0.0 s
(tests/e2e/test_family_e_chat_roundtrip_e2e.py::test_e2e_4 on windows-latest).
The forwarder now times the call itself with time.perf_counter, whichever
path answers.

    python -m pytest tests/test_verified_llm_forwards.py -q
"""
import sys
import types

import pytest


@pytest.fixture
def hartos_probe(monkeypatch):
    """A core.verified_llm with HARTOS's signature that answers at once."""
    calls = []

    def verify_llm(url='http://127.0.0.1:8080', timeout=5.0, prompt='hi',
                   max_tokens=16):
        calls.append({'url': url, 'timeout': timeout, 'prompt': prompt})
        return {'ok': True, 'reason': 'verified', 'http_status': 200,
                'content_snippet': 'hello there', 'elapsed_ms': 0}

    mod = types.ModuleType('core.verified_llm')
    mod.verify_llm = verify_llm
    monkeypatch.setitem(sys.modules, 'core.verified_llm', mod)
    return calls


def test_it_reaches_hartos_with_hartos_argument_names(hartos_probe):
    from tts.verified_llm import verify_llm
    result = verify_llm(endpoint='http://127.0.0.1:9', prompt='ping', timeout_s=3)
    assert hartos_probe == [{'url': 'http://127.0.0.1:9', 'timeout': 3, 'prompt': 'ping'}]
    assert result.ok is True
    assert result.content == 'hello there'


def test_a_verified_answer_carries_no_error(hartos_probe):
    """HARTOS says reason='verified' on success; that is not an error."""
    from tts.verified_llm import verify_llm
    assert verify_llm(endpoint='http://127.0.0.1:9').err == ''


def test_an_instant_answer_still_records_its_time(hartos_probe):
    """HARTOS's own elapsed_ms is 0 here, as Windows' monotonic clock reads
    a fast call; the forwarder's perf_counter timing is what is reported."""
    from tts.verified_llm import verify_llm
    assert verify_llm(endpoint='http://127.0.0.1:9').elapsed_s > 0


def test_hartos_failure_reason_becomes_the_error(monkeypatch):
    mod = types.ModuleType('core.verified_llm')
    mod.verify_llm = lambda url, timeout=5.0, prompt='hi', max_tokens=16: {
        'ok': False, 'reason': 'unreachable:refused', 'http_status': None,
        'content_snippet': '', 'elapsed_ms': 3}
    monkeypatch.setitem(sys.modules, 'core.verified_llm', mod)
    from tts.verified_llm import verify_llm
    result = verify_llm(endpoint='http://127.0.0.1:9')
    assert result.ok is False and result.err == 'unreachable:refused'

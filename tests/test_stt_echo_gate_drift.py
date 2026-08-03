"""The mic echo-cancellation gate must read LIVE playback state, not a closure.

WHY A SOURCE-LEVEL GUARD AND NOT A UNIT TEST: the regression is invisible in
review. `if (tts.isSpeaking || isPlayingResponse) return;` inside
`processor.onaudioprocess` reads perfectly correct — and is inert, because that
callback is assigned ONCE and closes over the render that created it. `tts` is a
fresh object from useTTS() every render (useTTS.js:68 holds isSpeaking in
useState, returned by value at :623) and isPlayingResponse is a captured
primitive, so both stay pinned at their start-of-capture values (false) forever
and the gate never fires. Reproducing that in Jest would mean mounting Demopage
with a faked AudioContext, WebSocket and useTTS — disproportionate for a
three-line fix, and it would still not stop someone "simplifying" the ref away.

WHAT WENT WRONG (shipped build #4, pid 33028, 2026-08-04 04:05): the gate was
already present at Demopage.js:3152 with the comment "Echo cancellation: don't
send mic audio while TTS is playing", and the composer STILL filled with
    "(swoosh) (swoosh) (swoosh) (swoosh) (swoosh) (swoosh) (swoosh) ("
alongside a card reading "... Smiling face with smiling eyes ... [Music]" —
Nunba transcribing its own TTS (an emoji spoken as its unicode name, plus a
Whisper non-speech tag). With auto-send firing 1s after each final transcript
(Demopage.js:3122 -> handleSendRef.current()), that closed into a self-driving
conversation loop.

The neighbouring `handleSendRef` exists for precisely this reason, which is the
pattern this fix mirrors.
"""

import os
import re

import pytest

_DEMOPAGE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'landing-page', 'src', 'pages', 'Demopage.js')


@pytest.fixture(scope='module')
def src():
    with open(_DEMOPAGE, encoding='utf-8') as fh:
        return fh.read()


def _strip_js_line_comments(text):
    """Drop // comments before pattern-matching.

    Needed because the fix's own explanatory comment names the very symbols this
    guard forbids ("Read through the ref, NOT tts.isSpeaking || isPlayingResponse
    directly"). Scanning raw text flagged that prose as a violation — a false
    positive that this guard hit on its first run.
    """
    return re.sub(r'//[^\n]*', '', text)


def _onaudioprocess_body(src):
    """The persistent-callback region whose closure is the whole problem.

    Anchored on the ASSIGNMENT (`processor.onaudioprocess =`), not the bare
    identifier: the bare string also appears in the ttsActiveRef declaration's
    comment ~2900 lines earlier, and matching that instead made this guard scan
    the wrong region entirely on its first run.
    """
    m = re.search(r'processor\.onaudioprocess\s*=', src)
    assert m, 'processor.onaudioprocess assignment vanished — re-point this guard'
    return src[m.start():m.start() + 1600]


def test_gate_reads_through_the_ref(src):
    body = _onaudioprocess_body(src)
    assert 'ttsActiveRef.current' in body, (
        'the echo gate no longer reads ttsActiveRef.current — a direct read of '
        'tts.isSpeaking / isPlayingResponse here is PINNED by the closure and '
        'silently disables echo cancellation')


def test_gate_does_not_read_render_scope_state_directly(src):
    body = _strip_js_line_comments(_onaudioprocess_body(src))
    offenders = re.findall(r'\btts\.isSpeaking\b|\bisPlayingResponse\b', body)
    assert not offenders, (
        f'{offenders} read directly inside processor.onaudioprocess. That '
        f'callback is assigned once, so these are frozen at their capture-time '
        f'values (false) and the gate never fires. Route them through '
        f'ttsActiveRef instead.')


def test_the_ref_is_declared_and_kept_in_sync(src):
    assert re.search(r'const\s+ttsActiveRef\s*=\s*useRef\(', src), \
        'ttsActiveRef declaration missing'
    assert re.search(r'ttsActiveRef\.current\s*=\s*tts\.isSpeaking\s*\|\|\s*isPlayingResponse', src), \
        ('ttsActiveRef is never refreshed — a ref that is not re-assigned each '
         'render is just a slower stale closure')


def test_sync_happens_in_render_body_not_an_effect(src):
    """An effect runs AFTER paint; audio frames arrive continuously.

    Assigning in the render body (as handleSendRef does) means the ref is
    already current when the next frame is processed.
    """
    i = src.find('ttsActiveRef.current = tts.isSpeaking')
    assert i != -1
    preceding = src[max(0, i - 400):i]
    assert 'useEffect' not in preceding.split('handleSendRef.current')[-1], (
        'the ttsActiveRef sync appears to sit inside a useEffect — keep it in '
        'the render body next to handleSendRef.current = handleSend')


def test_auto_send_still_goes_through_the_stable_ref(src):
    """Guards the sibling pattern this fix mirrors — if handleSendRef were
    replaced by a direct handleSend call it would break the same way."""
    assert 'handleSendRef.current()' in src, (
        'auto-send no longer uses handleSendRef.current — a direct handleSend '
        'call from the WS callback has the same stale-closure defect')

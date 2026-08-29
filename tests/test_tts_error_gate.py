"""#716 — internal error text must never reach TTS.

The chat reply string is handed straight to the speech engine, so when a
backend fault produced the reply the app READ THE ERROR ALOUD.  On
2026-08-29 the owner heard, spoken by the app:

    "An error occurred: Error code: 400 - {'error': {'code': 400,
     'message': 'request (11236 tokens) exceeds the available context
     size (8192 tokens) ...', 'n_ctx': 8192}}"
    "Error creating agents: 'guest_87986098626'"

That reads HTTP codes, token budgets and an internal user_id+prompt_id
key to anyone in earshot.  The strings below are the real ones captured
from that session — not invented samples.

The gate lives at the single chokepoint both call sites go through
(routes/chatbot_routes._fire_nunba_tts), so these tests exercise the
module-level predicate directly rather than re-implementing it here.
"""
import routes.chatbot_routes as cr


def _suppressed(text):
    """Mirror of the gate's decision, using the module's own constants."""
    probe = (text or '').lstrip()
    return (probe.startswith(cr._TTS_ERROR_PREFIXES)
            or bool(cr._TTS_ERROR_ENVELOPE_RE.search(probe)))


# Verbatim from the 2026-08-29 session — these were spoken to the owner.
SPOKEN_ERRORS = [
    "An error occurred: Error code: 400 - {'error': {'code': 400, "
    "'message': 'request (11236 tokens) exceeds the available context "
    "size (8192 tokens), try increasing it', 'type': "
    "'exceed_context_size_error', 'n_prompt_tokens': 11236, 'n_ctx': 8192}}",
    "An error occurred: Error code: 500 - {'error': {'code': 500, "
    "'message': 'Context size has been exceeded.', 'type': 'server_error'}}",
    "Error creating agents: 'guest_87986098626'",
    '{"error": {"code": 400, "message": "bad"}}',
]

# Must still be spoken.  The last two are the traps: one is ordinary prose
# ABOUT errors, the other is the busy notice, which is a real user-facing
# message and not an internal fault.
LEGIT_REPLIES = [
    "Japan's capital is **Tokyo**. It is located in the western part of "
    "the country, in the Honshu region.",
    "25 times 4 is 100.",
    "Got Agent details successfully lets move on to review them one at a time",
    "I need your input to finish building this agent. Step 1 isn't coming "
    "together from what I have so far.",
    "An error code is a number a program returns when something goes "
    "wrong; 404 means not found.",
    "Your local AI is busy with another task right now. Send your message "
    "again in a moment.",
]


def test_spoken_errors_are_suppressed():
    still_spoken = [t for t in SPOKEN_ERRORS if not _suppressed(t)]
    assert not still_spoken, (
        f'these would be READ ALOUD to the user: {still_spoken!r}')


def test_real_answers_are_not_suppressed():
    wrongly_muted = [t for t in LEGIT_REPLIES if _suppressed(t)]
    assert not wrongly_muted, (
        f'these are real replies and must still be spoken: {wrongly_muted!r}')


def test_gate_constants_exist_at_module_level():
    """Guards the NameError this fix originally shipped with.

    _TTS_ERROR_ENVELOPE_RE is built with re.compile at import time, and
    `re` was NOT among chatbot_routes' module-level imports — it was
    imported inside a nested function.  py_compile passed (syntax only)
    while importing the module would have raised NameError and taken the
    whole blueprint down.  Importing this module at all is the assertion.
    """
    assert isinstance(cr._TTS_ERROR_PREFIXES, tuple)
    assert cr._TTS_ERROR_PREFIXES, 'prefix tuple must not be empty'
    assert cr._TTS_ERROR_ENVELOPE_RE.search("{'error': {'code': 1}}")

"""#591 — a context overflow must not be reported to the user as "busy".

The chat route's fall-through assumes that if BOTH tiers failed and
/health returns 200, the model must be busy with other work
(routes/chatbot_routes.py, the `if _server_alive:` branch).  That is an
inference, not a measurement: the real exception is logged at WARNING
and discarded, so ANY tier failure on a live server becomes "Your local
AI is busy with another task right now."

Measured 2026-08-29: context-overflow 400s failed both tiers while the
box was demonstrably idle — a plain casual turn answered in 2526 ms
while this guard was firing on another request.  The user was told the
AI was busy; it was not.

These strings are verbatim from that session.
"""
import routes.chatbot_routes as cr

# Real overflow errors seen on the live build.
OVERFLOW_ERRORS = [
    "Error code: 400 - {'error': {'code': 400, 'message': 'request (11236 "
    "tokens) exceeds the available context size (8192 tokens), try "
    "increasing it', 'type': 'exceed_context_size_error', "
    "'n_prompt_tokens': 11236, 'n_ctx': 8192}}",
    "Error code: 500 - {'error': {'code': 500, 'message': 'Context size has "
    "been exceeded.', 'type': 'server_error'}}",
    "request (4386 tokens) exceeds the available context size (2048 tokens)",
]

# Failures that are NOT overflow — these may legitimately fall through to
# the existing busy/starting handling.
NON_OVERFLOW_ERRORS = [
    "HTTPConnectionPool(host='127.0.0.1', port=8081): Read timed out.",
    "Connection refused",
    "'guest_87986098626'",
    "",
    None,
]


def test_overflow_errors_are_classified_as_overflow():
    missed = [e for e in OVERFLOW_ERRORS if not cr._is_context_overflow(e)]
    assert not missed, (
        f'these would still be reported to the user as "busy": {missed!r}')


def test_unrelated_failures_are_not_classified_as_overflow():
    wrong = [e for e in NON_OVERFLOW_ERRORS if cr._is_context_overflow(e)]
    assert not wrong, (
        f'these are not overflows and must not be relabelled: {wrong!r}')


def test_busy_text_is_not_used_for_an_overflow():
    """The generic busy string must not be the answer for an overflow.

    Guards the actual user-visible regression: the box was idle and the
    user was told it was busy.
    """
    generic = ('Your local AI is busy with another task right now. '
               'Send your message again in a moment.')
    for err in OVERFLOW_ERRORS:
        assert cr._is_context_overflow(err), err
        # The route picks its message from this classification; an
        # overflow must select something other than the generic notice.
        assert cr._busy_text_for_failure(err) != generic, (
            f'overflow still yields the generic busy notice: {err!r}')

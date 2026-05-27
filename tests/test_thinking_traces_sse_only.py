"""#171 — HTTP /chat response no longer carries `thinking_steps`.

Thinking traces stream live via SSE 'chat.response' events (EventBus.
emit fan-out, HARTOS commit 29ac1b9).  The HTTP-attached batch was
redundant — every trace was already delivered in real-time, AND the
client's resultData.thinking_steps.forEach burst was the source of
the "all at once" UI rendering the user reported.

Tests:
  1. drain_thinking_traces is still callable (diag/observability) but
     is NOT called by chatbot_routes.chat() during normal response
     assembly.
  2. The /chat handler does not assign response_json['thinking_steps'].

These are grep-level invariant checks — they pin that the canonical
flow no longer routes traces through HTTP.  Live integration runs in
the existing chat_integration suite.
"""
from __future__ import annotations

import os
import sys
import unittest


_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)


def _read_chatbot_routes_source() -> str:
    path = os.path.join(_REPO_ROOT, 'routes', 'chatbot_routes.py')
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


class HTTPAttachRemovedTests(unittest.TestCase):

    def test_no_thinking_steps_assignment_in_chatbot_routes(self):
        """grep invariant: chatbot_routes.py must not assign
        response_json['thinking_steps'] or error_response['thinking_steps']
        anywhere.  Either re-introduces the redundant HTTP batch path."""
        src = _read_chatbot_routes_source()
        self.assertNotIn(
            "response_json['thinking_steps']", src,
            "HTTP-attach path re-introduced (response_json) — see #171; "
            "thinking traces must stream via SSE only.",
        )
        self.assertNotIn(
            "error_response['thinking_steps']", src,
            "HTTP-attach path re-introduced (error_response) — see #171; "
            "thinking traces must stream via SSE only.",
        )

    def test_drain_thinking_traces_not_called_in_chatbot_routes(self):
        """drain_thinking_traces stays exported (diag/observability),
        but chatbot_routes' /chat handler must not call it during
        normal response assembly.  The function may still be imported
        and used by /diag endpoints or tests — only the chat() call
        sites are the regression we're guarding against."""
        src = _read_chatbot_routes_source()
        # Count occurrences — the import line counts as 1.  Any
        # additional reference means a call site survived.
        n = src.count('drain_thinking_traces')
        self.assertLessEqual(
            n, 1,
            f"drain_thinking_traces referenced {n} times in chatbot_routes.py "
            f"— the import is allowed (n=1), but call sites must be 0 "
            f"after #171.",
        )

    def test_capture_thinking_still_buffers(self):
        """The buffer + drain helpers remain available for diag use
        even though HTTP no longer attaches traces."""
        from routes.hartos_backend_adapter import (
            _capture_thinking, drain_thinking_traces, _thinking_traces_by_request,
            _thinking_traces_lock,
        )
        with _thinking_traces_lock:
            _thinking_traces_by_request.clear()
        _capture_thinking({
            'priority': 49,
            'action': 'Thinking',
            'request_id': 'r-diag',
            'msg_id': 'm-1',
            'message': 'Diag-only path',
        })
        traces = drain_thinking_traces('r-diag')
        self.assertEqual(len(traces), 1)
        self.assertEqual(traces[0]['msg_id'], 'm-1')


if __name__ == '__main__':
    unittest.main()

"""#215 — verified_tool_call.py contract tests.

Mocks urllib.request.urlopen to feed canned LLM responses through the
verifier without needing a live llama-server.
"""
import io
import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

_TTS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'tts'))
if _TTS_DIR not in sys.path:
    sys.path.insert(0, _TTS_DIR)


def _fake_response(body_dict):
    """Build a fake urlopen() return whose .read() yields body_dict as JSON."""
    fake = MagicMock()
    fake.read.return_value = json.dumps(body_dict).encode('utf-8')
    fake.__enter__ = MagicMock(return_value=fake)
    fake.__exit__ = MagicMock(return_value=False)
    return fake


def _well_formed_tool_call_response():
    return {
        'choices': [{
            'message': {
                'content': None,
                'tool_calls': [{
                    'id': 'call_1',
                    'type': 'function',
                    'function': {
                        'name': 'add',
                        'arguments': json.dumps({'a': 2, 'b': 2}),
                    },
                }],
            },
        }],
    }


def _no_tool_call_response():
    """Model ignored the tools and returned plain content instead."""
    return {
        'choices': [{
            'message': {
                'content': 'The answer is 4.',
            },
        }],
    }


def _malformed_args_response():
    return {
        'choices': [{
            'message': {
                'tool_calls': [{
                    'id': 'call_1',
                    'type': 'function',
                    'function': {
                        'name': 'add',
                        'arguments': '{a: 2, b: 2}',  # not valid JSON
                    },
                }],
            },
        }],
    }


def _schema_violation_response():
    return {
        'choices': [{
            'message': {
                'tool_calls': [{
                    'id': 'call_1',
                    'type': 'function',
                    'function': {
                        'name': 'add',
                        'arguments': json.dumps({'a': 'not-an-int', 'b': 2}),
                    },
                }],
            },
        }],
    }


def _empty_function_name_response():
    return {
        'choices': [{
            'message': {
                'tool_calls': [{
                    'id': 'call_1',
                    'type': 'function',
                    'function': {
                        'name': '',
                        'arguments': json.dumps({'a': 1, 'b': 2}),
                    },
                }],
            },
        }],
    }


class VerifiedToolCallTests(unittest.TestCase):
    @patch('verified_tool_call.urllib.request.urlopen')
    def test_well_formed_tool_call_passes(self, mock_open):
        mock_open.return_value = _fake_response(_well_formed_tool_call_response())
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertTrue(r.ok, f"err={r.err}")
        self.assertEqual(r.tool_name, 'add')
        self.assertEqual(r.arguments, {'a': 2, 'b': 2})

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_no_tool_calls_fails(self, mock_open):
        mock_open.return_value = _fake_response(_no_tool_call_response())
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('no tool_calls', r.err)

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_malformed_json_arguments_fails(self, mock_open):
        mock_open.return_value = _fake_response(_malformed_args_response())
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('not valid JSON', r.err)

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_empty_function_name_fails(self, mock_open):
        mock_open.return_value = _fake_response(_empty_function_name_response())
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('name missing', r.err)

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_schema_violation_fails_when_jsonschema_available(self, mock_open):
        try:
            import jsonschema  # noqa: F401
        except ImportError:
            self.skipTest('jsonschema not installed — schema check skipped')
        mock_open.return_value = _fake_response(_schema_violation_response())
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('schema', r.err.lower())

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_network_error_caught(self, mock_open):
        import urllib.error
        mock_open.side_effect = urllib.error.URLError('connection refused')
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=2)
        self.assertFalse(r.ok)
        self.assertIn('URLError', r.err)

    @patch('verified_tool_call.urllib.request.urlopen')
    def test_arguments_as_dict_also_accepted(self, mock_open):
        """Some servers parse arguments themselves and return them as
        a dict rather than the OpenAI-canonical JSON string."""
        body = _well_formed_tool_call_response()
        body['choices'][0]['message']['tool_calls'][0]['function']['arguments'] = {
            'a': 5, 'b': 7,
        }
        mock_open.return_value = _fake_response(body)
        from verified_tool_call import verify_tool_call
        r = verify_tool_call(timeout_s=5)
        self.assertTrue(r.ok)
        self.assertEqual(r.arguments, {'a': 5, 'b': 7})


if __name__ == '__main__':
    unittest.main()

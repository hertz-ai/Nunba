"""`_get_hart_user_id` must not explode on the GET routes that share it.

routes/chatbot_routes.py:4195 read the request body via the bare `request.json`
property:

    return request.json.get('user_id') or request.args.get('user_id')

`request.json` RAISES (Flask 2.3+: 415 UnsupportedMediaType) when the request
Content-Type is not application/json.  A GET has no body and no such header, so
the raise happens while evaluating the left operand — meaning
`or request.args.get('user_id')` is DEAD CODE that can never run, even though
the author clearly wrote it as the fallback.

Live 2026-08-04 on the shipped build (pid 6960):
    GET /api/hart/profile -> 500
    {"error":"415 Unsupported Media Type: Did not attempt to load JSON data
      because the request Content-Type was not 'application/json'."}
The route's broad `except Exception -> 500` relabelled a content-type problem as
a server fault, which is why it read as a crash rather than a bad request.

Confirmed by two probes that both still failed, proving the fallback is
unreachable rather than merely unused:
    -H 'Content-Type: application/json'  -> still 500 (body is empty)
    ?user_id=probe                       -> still 500 (never consulted)

Four routes share the helper — /api/hart/advance, /generate, /seal (POST, where
`request.json` happens to work) and /profile, /check (GET, where it cannot).
/check masked the same failure by degrading to {"check":"local"}.

`get_json(silent=True)` is already this file's convention: 9 uses against the
single bare `request.json` fixed here, so this conforms rather than invents.
"""

import os
import sys

import pytest
from flask import Flask

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.chatbot_routes import _get_hart_user_id  # noqa: E402

app = Flask(__name__)


def test_get_with_query_param_returns_it_instead_of_raising():
    """THE regression: a GET carries user_id in the query string, not a body."""
    with app.test_request_context('/api/hart/profile?user_id=probe-user',
                                  method='GET'):
        assert _get_hart_user_id() == 'probe-user'


def test_bare_get_returns_none_rather_than_raising():
    """No token, no body, no query param -> None, so the caller can answer 400.

    The route is written to do exactly that (`if not user_id: return 400`); the
    raise is what turned a clean 400 into a 500.
    """
    with app.test_request_context('/api/hart/profile', method='GET'):
        assert _get_hart_user_id() is None


def test_post_json_body_still_works():
    """The 3 POST routes (advance/generate/seal) must not regress."""
    with app.test_request_context('/api/hart/advance', method='POST',
                                  json={'user_id': 'body-user'}):
        assert _get_hart_user_id() == 'body-user'


def test_post_with_declared_json_but_empty_body_does_not_raise():
    """Flask raises on an empty body even WITH the right Content-Type — which is
    why the live probe still 500'd when I added the header."""
    with app.test_request_context('/api/hart/advance', method='POST',
                                  data='', content_type='application/json'):
        assert _get_hart_user_id() is None


def test_bearer_token_wins_over_body_and_query():
    """Priority order is part of the contract: JWT first, then body, then query."""
    import jwt as pyjwt
    token = pyjwt.encode({'user_id': 'token-user'}, 'unused', algorithm='HS256')
    with app.test_request_context(
            '/api/hart/profile?user_id=query-user', method='GET',
            headers={'Authorization': f'Bearer {token}'}):
        assert _get_hart_user_id() == 'token-user'


def test_malformed_token_falls_through_to_query_param():
    """A junk Authorization header must not become a hard failure."""
    with app.test_request_context('/api/hart/profile?user_id=query-user',
                                  method='GET',
                                  headers={'Authorization': 'Bearer not-a-jwt'}):
        assert _get_hart_user_id() == 'query-user'


def test_body_user_id_preferred_over_query_when_both_present():
    with app.test_request_context('/api/hart/advance?user_id=query-user',
                                  method='POST', json={'user_id': 'body-user'}):
        assert _get_hart_user_id() == 'body-user'


@pytest.mark.parametrize('method', ['GET', 'POST'])
def test_never_raises_regardless_of_method(method):
    """Broadest statement of the contract: this helper returns, it does not throw.

    Its callers wrap everything in `except Exception -> 500`, so any raise here
    surfaces to the user as a server error no matter what actually went wrong.
    """
    with app.test_request_context('/api/hart/profile', method=method):
        _get_hart_user_id()

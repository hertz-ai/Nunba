"""Shared authentication decorators for Nunba Flask routes.

Single source of truth — used by main.py and chatbot_routes.py.
"""
import hmac
import os
from functools import wraps

from flask import jsonify, request

# Read once at import time (not per-request)
API_TOKEN = os.environ.get('NUNBA_API_TOKEN', '')


def _is_local_request():
    """Check if request is truly local, accounting for proxies.

    When running behind a reverse proxy, *all* requests appear as 127.0.0.1
    because the proxy connects locally.  If the ``TRUSTED_PROXY`` env-var is
    set to the proxy's address we inspect ``X-Forwarded-For`` to determine the
    *real* client IP.  Without the env-var, only ``remote_addr`` is checked
    (safe default for direct connections).

    CI bypass: when ``NUNBA_CI=1`` (set ONLY by docker-compose.staging.yml)
    all requests are trusted.  The e2e probe hits the container via docker
    NAT so requests appear from the docker bridge IP, not 127.0.0.1, and
    would otherwise be rejected.  Production builds NEVER set this var.
    """
    if os.environ.get('NUNBA_CI', '') == '1':
        return True
    trusted_proxy = os.environ.get('TRUSTED_PROXY', '')
    if trusted_proxy and request.remote_addr == trusted_proxy:
        forwarded_for = request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
        return forwarded_for in ('127.0.0.1', '::1', 'localhost')
    # Direct connection - check remote_addr
    return request.remote_addr in ('127.0.0.1', '::1')


def _has_valid_token():
    """True when the request carries `Authorization: Bearer <NUNBA_API_TOKEN>`.

    Compared as bytes: hmac.compare_digest on two str raises TypeError if
    either holds a non-ASCII character, and the header is caller-controlled,
    so a junk token surfaced as a 500 instead of a 401.
    """
    if not API_TOKEN:
        return False
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    return hmac.compare_digest(auth_header[7:].encode('utf-8', 'surrogatepass'),
                               API_TOKEN.encode('utf-8', 'surrogatepass'))


def require_local_or_token(f):
    """Decorator to protect sensitive endpoints.

    Allows access if:
    1. Request comes from localhost (127.0.0.1 or ::1), accounting for proxies
    2. Valid API token is provided in Authorization header
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if _is_local_request() or _has_valid_token():
            return f(*args, **kwargs)

        return jsonify({
            'error': 'Unauthorized',
            'message': 'This endpoint requires local access or valid API token'
        }), 401

    return decorated_function


def _browser_origin_allowed():
    """HARTOS's Origin/Referer check, core.auth_local.is_safe_csrf_origin.

    Imported rather than copied, so "is this a same-origin browser request"
    has one implementation.  If HARTOS cannot be imported, only requests with
    no Origin and no Referer (non-browser callers) pass.
    """
    try:
        from core.auth_local import is_safe_csrf_origin
    except ImportError:
        return not (request.headers.get('Origin') or request.headers.get('Referer'))
    return is_safe_csrf_origin()


def require_local_or_token_csrf_safe(f):
    """require_local_or_token, plus a refusal for cross-origin browser requests.

    For state-changing routes a web page could reach.  A page in the user's
    browser sends its request from 127.0.0.1, so the local check alone cannot
    tell Nunba's own page from any other: at d2f33033 a POST from 127.0.0.1
    carrying `Origin: https://evil.example` was served by /time_agent
    (tests/test_inprocess_dispatch_reachable.py, red run 2026-09-14).
    Callers with no Origin (the scheduler, call_stop_api) and same-origin
    pages pass.  A valid NUNBA_API_TOKEN skips the Origin check, as HARTOS's
    decorator of the same name does.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if _has_valid_token():
            return f(*args, **kwargs)
        if not _is_local_request():
            return jsonify({
                'error': 'Unauthorized',
                'message': 'This endpoint requires local access or valid API token'
            }), 401
        if not _browser_origin_allowed():
            return jsonify({
                'error': 'Forbidden',
                'message': 'Cross-origin browser request rejected'
            }), 403
        return f(*args, **kwargs)

    return decorated_function

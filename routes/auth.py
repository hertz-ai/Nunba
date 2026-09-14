"""Shared authentication decorators for Nunba Flask routes.

Single source of truth — used by main.py and chatbot_routes.py.
"""
import hmac
import logging
import os
from functools import wraps

from flask import jsonify, request

# Read once at import time (not per-request)
API_TOKEN = os.environ.get('NUNBA_API_TOKEN', '')


def _ci_trusts_every_caller():
    """HARTOS's rule for Nunba's staging container
    (core.auth_local.ci_trusts_every_caller), imported rather than copied so
    the dispatcher, these decorators and HARTOS's gate cannot disagree about
    it.  Without HARTOS, nobody is trusted that way."""
    try:
        from core.auth_local import ci_trusts_every_caller
    except Exception:
        return False
    return ci_trusts_every_caller()


def is_local_environ(environ):
    """True when a WSGI request comes from this machine, accounting for proxies.

    When running behind a reverse proxy, *all* requests appear as 127.0.0.1
    because the proxy connects locally.  If the ``TRUSTED_PROXY`` env-var is
    set to the proxy's address we inspect ``X-Forwarded-For`` to determine the
    *real* client IP.  Without the env-var, only ``REMOTE_ADDR`` is checked
    (safe default for direct connections).

    CI bypass: HARTOS's core.auth_local.ci_trusts_every_caller, imported
    rather than copied so the two rules cannot diverge again.  NUNBA_CI=1
    (set ONLY by docker-compose.staging.yml, whose e2e probe arrives through
    Docker's port mapping from the bridge IP, not 127.0.0.1) trusts every
    caller in a build run from source; an installed (frozen) build ignores
    it.  Without HARTOS, nobody is trusted that way.

    The one loopback rule: _is_local_request applies it to the current Flask
    request, and app.py's dispatcher to a raw environ before any app has it.
    """
    if _ci_trusts_every_caller():
        return True
    remote_addr = environ.get('REMOTE_ADDR', '')
    trusted_proxy = os.environ.get('TRUSTED_PROXY', '')
    if trusted_proxy and remote_addr == trusted_proxy:
        forwarded_for = environ.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        return forwarded_for in ('127.0.0.1', '::1', 'localhost')
    # Direct connection - check REMOTE_ADDR
    return remote_addr in ('127.0.0.1', '::1')


def _is_local_request():
    """Check if the current Flask request is truly local (is_local_environ)."""
    return is_local_environ(request.environ)


def app_for_caller(environ, full_app, boot_app):
    """The app a request is served by, for app.py's dispatcher.

    This machine's callers get full_app as soon as it exists.  Another machine
    gets it only once HARTOS's API gate is confirmed on it
    (security.middleware.install_api_gate sets ``_hartos_api_gate`` after
    checking the hook is in place), and boot_app's stubs until then, so the
    desktop never serves /chat ungated to its network whatever fails at boot.
    Peers see the stubs for that window too.
    """
    if full_app is None:
        return boot_app
    if getattr(full_app, '_hartos_api_gate', False) or is_local_environ(environ):
        return full_app
    return boot_app


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


_origin_check_unavailable_logged = False


def _browser_origin_allowed():
    """HARTOS's Origin/Referer check, core.auth_local.is_safe_csrf_origin.

    Imported rather than copied, so "is this a same-origin browser request"
    has one implementation.  A request with neither header is not from a
    browser (the scheduler, call_stop_api) and passes without HARTOS being
    importable.  If HARTOS's check cannot be loaded, anything a browser sent
    is refused, Nunba's own loopback page included: none of the routes behind
    this guard has a browser caller.
    """
    global _origin_check_unavailable_logged
    if not (request.headers.get('Origin') or request.headers.get('Referer')):
        return True
    try:
        from core.auth_local import is_safe_csrf_origin
    except Exception as e:
        if not _origin_check_unavailable_logged:
            _origin_check_unavailable_logged = True
            logging.getLogger(__name__).warning(
                "HARTOS core.auth_local.is_safe_csrf_origin unavailable (%s); "
                "browser requests to CSRF-guarded routes are refused", e)
        return False
    return is_safe_csrf_origin()


def _refuse_cross_origin(f):
    """403 for a browser request from another origin.  A valid NUNBA_API_TOKEN
    skips the check: a page in the browser cannot read the token."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if _has_valid_token() or _browser_origin_allowed():
            return f(*args, **kwargs)
        return jsonify({
            'error': 'Forbidden',
            'message': 'Cross-origin browser request rejected'
        }), 403

    return decorated_function


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

    Composed from require_local_or_token rather than restating it, so the
    local-or-token rule and its 401 have one implementation.
    """
    return require_local_or_token(_refuse_cross_origin(f))

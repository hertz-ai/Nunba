"""Which request paths must 404 rather than fall back to the SPA shell.

``main.handle_404`` exists so BrowserRouter deep links (``/social/feed``,
``/admin/models``) survive a hard refresh: any unknown path is answered with
``index.html`` and React resolves it client-side.  That is right for *routes*
and wrong for *assets*.

Measured 2026-08-04 against the running desktop build::

    GET /local                      -> 200, len 20597    (index.html)
    GET /static/js/main.66d05810.js -> 200, len 20597    <-- byte-identical
    GET /static/js/main.04ab9965.js -> 200, len 2473771  (the real bundle)

``main.66d05810.js`` exists nowhere on disk.  Because the miss was answered
200-with-HTML instead of 404, the browser cached HTML under a ``.js`` URL as a
perfectly valid response and never revalidated it — a debugging session was
spent measuring a bundle that had not shipped since the previous build.

Kept free of Flask imports on purpose: ``main`` drags in the whole runtime
(torch, sympy, transformers), so the decision has to live somewhere a unit test
can import in milliseconds.  ``main`` imports FROM here — this is the single
source of truth, not a second copy of the rule.
"""

# Path prefixes served by an explicit asset route (main.serve_static /
# main.serve_fonts).  A miss under one of these is a genuinely absent file:
# there is no client-side route it could still resolve to.
ASSET_PREFIXES = frozenset({'static', 'fonts'})

# Paths that are BOTH an API namespace and an SPA page — the same first
# segment speaks two vocabularies.  `agents` sits in main.API_ENDPOINTS
# because real top-level APIs live under it (/agents/sync, /agents/migrate,
# /agents/contact — chatbot_routes.py:4478+), so a missing /agents/* call
# must 404 as JSON, not cache HTML under an API URL (the #618 trap).  But the
# EXACT path /agents is the Agents Hub PAGE (MainRoute.js), and classifying
# it as API meant a deep link or F5 on the hub showed raw
# {"error":"API endpoint not found"} — found live by route-smoke.cy.js on
# 2026-08-07 (task #628).  The override wins only on the exact page path;
# everything deeper keeps the API rule.
SPA_PAGE_OVERRIDES = frozenset({'/agents'})


def is_spa_page_override(path):
    """True when `path` is exactly a page that shares its prefix with APIs."""
    return (path or '').rstrip('/') in SPA_PAGE_OVERRIDES


# Cache policy for every response that carries the SPA SHELL (index.html).
# `no-cache` = the client may store it but MUST revalidate before reuse; the
# shell Response carries no validators, so revalidation is a full refetch of
# ~20KB.  Without this the shell has NO Cache-Control at all, and Chromium
# (browser AND the installed WebView2) heuristically reuses a cached shell
# whose old hash-named bundle still exists on disk after an upgrade — the app
# then executes the PREVIOUS version's JS with zero errors.  Measured live
# 2026-08-07: a fresh install served main.e6517cb7.js, while Chrome executed
# main.430a6f8a.js from a cached shell.  Hash-named /static/* assets are
# immutable by construction and deliberately keep their default caching —
# only the shell must always revalidate.
SPA_SHELL_CACHE_CONTROL = 'no-cache'


def first_path_segment(path):
    """``/static/js/app.js`` -> ``'static'``; ``/`` and ``''`` -> ``''``."""
    parts = (path or '').split('/')
    return parts[1] if len(parts) > 1 else ''


def is_asset_path(path):
    """True when `path` belongs to an asset route and must 404 when missing."""
    return first_path_segment(path) in ASSET_PREFIXES

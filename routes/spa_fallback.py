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


def first_path_segment(path):
    """``/static/js/app.js`` -> ``'static'``; ``/`` and ``''`` -> ``''``."""
    parts = (path or '').split('/')
    return parts[1] if len(parts) > 1 else ''


def is_asset_path(path):
    """True when `path` belongs to an asset route and must 404 when missing."""
    return first_path_segment(path) in ASSET_PREFIXES

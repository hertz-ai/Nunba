"""Guards #618 — a missing static asset must 404, not 200 + index.html.

Measured 2026-08-04 against the running desktop build::

    GET /local                      -> 200, len 20597    (index.html)
    GET /static/js/main.66d05810.js -> 200, len 20597    <-- byte-identical
    GET /static/js/main.04ab9965.js -> 200, len 2473771  (the real bundle)

``main.66d05810.js`` exists nowhere on disk.  ``main.handle_404`` treated it as
a BrowserRouter deep link and answered with the SPA shell, so the browser
cached HTML under a ``.js`` URL as a valid 200 and never revalidated.  A whole
debugging session was then spent measuring a bundle that had not shipped since
the previous build.

These tests import ``routes.spa_fallback`` only — importing ``main`` pulls in
torch/sympy/transformers and takes minutes, which is precisely why the decision
was extracted there.  ``main`` is covered by the source guards below instead.
"""
import ast
from pathlib import Path

import pytest

from routes.spa_fallback import ASSET_PREFIXES, first_path_segment, is_asset_path

REPO = Path(__file__).resolve().parents[1]


# ── the decision itself ───────────────────────────────────────────────

@pytest.mark.parametrize("path", [
    "/static/js/main.66d05810.js",      # the exact path that regressed
    "/static/js/definitely-missing.js",
    "/static/css/app.css",
    "/static/media/logo.svg",
    "/fonts/inter.woff2",
])
def test_asset_paths_are_recognised(path):
    assert is_asset_path(path), f"{path} must 404 when missing, not serve the SPA"


@pytest.mark.parametrize("path", [
    "/", "/local", "/social", "/social/feed", "/admin/models",
    "/s/abc123",                        # share deep link
    "",                                 # degenerate
])
def test_spa_routes_are_not_assets(path):
    """Zero-regression: real client-side routes must still reach index.html."""
    assert not is_asset_path(path), f"{path} is a client-side route, must NOT 404"


@pytest.mark.parametrize("path,expected", [
    ("/static/js/a.js", "static"),
    ("/local", "local"),
    ("/", ""),
    ("", ""),
    (None, ""),
])
def test_first_path_segment(path, expected):
    assert first_path_segment(path) == expected


def test_asset_prefixes_match_the_explicit_asset_routes():
    """ASSET_PREFIXES must cover every route that serves files from disk.

    ``main`` declares ``/static/<path:path>`` and ``/fonts/<path:path>``.  If a
    third asset route is added and not listed here, its misses silently fall
    back to the SPA again — the original defect, one prefix over.
    """
    src = (REPO / "main.py").read_text(encoding="utf-8", errors="replace")
    declared = {
        line.split("'")[1].strip("/").split("/")[0]
        for line in src.splitlines()
        if line.startswith("@app.route('/") and "<path:path>'" in line
    }
    missing = declared - ASSET_PREFIXES - {"api"}
    assert not missing, (
        f"asset route(s) {sorted(missing)} serve files from disk but are not in "
        "ASSET_PREFIXES, so a miss under them still returns index.html"
    )


# ── drift guards on main.handle_404 ───────────────────────────────────

def _handle_404_node():
    tree = ast.parse((REPO / "main.py").read_text(encoding="utf-8", errors="replace"))
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "handle_404":
            return node
    pytest.fail("main.handle_404 not found — was it renamed?")


def _call_lines(node, func_name):
    return [
        n.lineno for n in ast.walk(node)
        if isinstance(n, ast.Call)
        and isinstance(n.func, ast.Name) and n.func.id == func_name
    ]


def test_handle_404_consults_the_asset_check():
    assert _call_lines(_handle_404_node(), "is_asset_path"), (
        "main.handle_404 must call is_asset_path — without it every missing "
        "asset falls through to the SPA shell again (#618)"
    )


def test_asset_check_runs_before_the_spa_fallback():
    """Order is the whole guard: after _render_spa_index it can never fire."""
    node = _handle_404_node()
    asset = min(_call_lines(node, "is_asset_path"))
    spa = _call_lines(node, "_render_spa_index")
    assert spa, "expected handle_404 to still have an SPA fallback"
    assert asset < min(spa), (
        "is_asset_path must be consulted BEFORE _render_spa_index; placed "
        "after, the SPA shell has already been returned and the check is dead"
    )

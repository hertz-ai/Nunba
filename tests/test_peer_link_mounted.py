"""Every entry point must build its ASGI app through core.serve.

A bare `AsyncioWSGIMiddleware(app)` is WSGI and cannot see a websocket scope, so
ws://<node>/peer_link falls through and Hypercorn answers 403 -- PeerLink.accept()
is then never called and every reader of PeerLinkManager._links sees zero peers.

That is not hypothetical. Three entry points each had their own copy of the serve
stack, the peer_link mount was added to exactly one, and the other two shipped
without it:

  HARTOS hart_intelligence_entry._serve_app   -- had the mount
  Nunba  app.py:start_flask (cx_Freeze entry) -- did not
  Nunba  main.py __main__   (dev / daemon)    -- did not

core.serve.build_asgi_app is now the one place that composition lives. This test
walks the AST of all three call sites and fails if any of them stops going
through it -- either by assigning a bare middleware again, or by dropping the
canonical call. Grep would be fooled by a rename or a reformat; the AST is not.

If a serve path MOVES, re-point this guard at its new home. Do not delete it:
the mount can go unmounted again in total silence, and nothing else notices.
"""
import ast
import os
import unittest

_NUNBA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MIDDLEWARE = 'AsyncioWSGIMiddleware'
_CANONICAL = 'build_asgi_app'


def _callee(node):
    """Callee name for both `f(...)` and `mod.f(...)`."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def audit_source(source):
    """(bare_middleware_lines, canonical_call_lines) for one module."""
    tree = ast.parse(source)
    bare, canonical = [], []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = _callee(node.func)
        if name == _MIDDLEWARE:
            # Wrapped directly in the canonical helper is still acceptable;
            # bare, or wrapped in anything else, is the defect.
            bare.append(node.lineno)
        elif name == _CANONICAL:
            canonical.append(node.lineno)
    return bare, canonical


def _hartos_entry_path():
    """Locate hart_intelligence_entry.py — sibling checkout or installed pkg."""
    sibling = os.path.join(os.path.dirname(_NUNBA), 'HARTOS',
                           'hart_intelligence_entry.py')
    if os.path.exists(sibling):
        return sibling
    try:
        import importlib.util
        spec = importlib.util.find_spec('hart_intelligence_entry')
    except (ImportError, ValueError):
        return None
    return spec.origin if spec and spec.origin else None


class TestEntryPointsUseCanonicalAsgiStack(unittest.TestCase):

    def _check(self, path, label):
        with open(path, encoding='utf-8') as fh:
            bare, canonical = audit_source(fh.read())

        self.assertEqual(
            bare, [],
            f"{label}:{bare} constructs {_MIDDLEWARE} directly. Use "
            f"core.serve.{_CANONICAL}() or websocket scopes for /peer_link "
            f"fall through to WSGI and Hypercorn answers 403."
        )
        self.assertTrue(
            canonical,
            f"{label} never calls core.serve.{_CANONICAL}(). If the serve path "
            f"moved, re-point this guard at its new home -- do not delete it, "
            f"or the /peer_link listener can silently go unmounted again."
        )

    def test_frozen_entry_app_py(self):
        self._check(os.path.join(_NUNBA, 'app.py'), 'app.py')

    def test_dev_entry_main_py(self):
        self._check(os.path.join(_NUNBA, 'main.py'), 'main.py')

    def test_hartos_entry_serve_app(self):
        path = _hartos_entry_path()
        if not path:
            self.skipTest('hart_intelligence_entry.py not resolvable here')
        self._check(path, 'hart_intelligence_entry.py')


class TestAuditorItself(unittest.TestCase):
    """A guard that cannot fail for its own defect is not a guard."""

    def test_flags_a_bare_middleware_assignment(self):
        bare, canonical = audit_source(
            'asgi_app = AsyncioWSGIMiddleware(app)\n')
        self.assertEqual(bare, [1])
        self.assertEqual(canonical, [])

    def test_accepts_the_canonical_call(self):
        bare, canonical = audit_source('asgi_app = build_asgi_app(app)\n')
        self.assertEqual(bare, [])
        self.assertEqual(canonical, [1])

    def test_flags_middleware_wrapped_in_something_else(self):
        """Only core.serve may own the composition."""
        bare, _ = audit_source(
            'asgi_app = some_other_wrapper(AsyncioWSGIMiddleware(app))\n')
        self.assertEqual(bare, [1])


if __name__ == '__main__':
    unittest.main()

"""Both Nunba serve paths must mount the PeerLink websocket listener.

AsyncioWSGIMiddleware is WSGI and cannot see a websocket scope, so a bare
`AsyncioWSGIMiddleware(app)` makes ws://<node>/peer_link answer 403 and
PeerLink.accept() is never called.  HARTOS wrapped its own entry point
(hart_intelligence_entry) but both Nunba serve paths were left bare:

  * app.py   -- the cx_Freeze entry, i.e. the installed desktop
  * main.py  -- `python main.py`, i.e. dev

This walks the AST rather than grepping, so a rename or a reformat cannot
quietly satisfy it.  Every assignment whose value builds an
AsyncioWSGIMiddleware must have that call wrapped in peer_link_asgi(...).
"""
import ast
import os
import unittest

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MIDDLEWARE = 'AsyncioWSGIMiddleware'
_WRAPPER = 'peer_link_asgi'


def _func_name(node):
    """Callee name for both `f(...)` and `mod.f(...)`."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def find_middleware_assignments(source):
    """(is_wrapped, lineno) for every assignment that builds the middleware."""
    found = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Assign) or not isinstance(node.value, ast.Call):
            continue
        call = node.value
        name = _func_name(call.func)
        if name == _MIDDLEWARE:
            found.append((False, node.lineno))
        elif name == _WRAPPER:
            inner = call.args[0] if call.args else None
            if isinstance(inner, ast.Call) and _func_name(inner.func) == _MIDDLEWARE:
                found.append((True, node.lineno))
    return found


class TestPeerLinkMounted(unittest.TestCase):

    def _check(self, filename):
        path = os.path.join(_REPO, filename)
        with open(path, encoding='utf-8') as fh:
            found = find_middleware_assignments(fh.read())

        self.assertTrue(
            found,
            f"{filename}: no AsyncioWSGIMiddleware assignment found at all. "
            f"If the serve path moved, re-point this guard -- do not delete "
            f"it, or the /peer_link listener can silently go unmounted again."
        )
        bare = [lineno for wrapped, lineno in found if not wrapped]
        self.assertEqual(
            bare, [],
            f"{filename}:{bare} assigns a bare {_MIDDLEWARE}(...). Wrap it in "
            f"{_WRAPPER}(...) or websocket scopes for /peer_link fall through "
            f"to WSGI and Hypercorn answers 403."
        )

    def test_frozen_entry_mounts_peer_link(self):
        self._check('app.py')

    def test_dev_entry_mounts_peer_link(self):
        self._check('main.py')


if __name__ == '__main__':
    unittest.main()

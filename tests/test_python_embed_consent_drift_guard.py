"""AST-level drift guard against the bundled-HARTOS consent surface.

Background:
    The legacy ``register_consent_routes`` (no JWT, UPSERT-rewriting
    ``granted_at``) was deleted from live HARTOS in commit 76f99dee
    as part of the consent-surface consolidation (orchestrator review
    ``acd11f55``).  All HTTP writes to ``user_consents`` now flow
    through ``integrations.social.consent_api`` (JWT-authed,
    APPEND-only, mounted at ``/api/social/consent``).

    The Nunba installer bundles HARTOS into
    ``python-embed/Lib/site-packages/`` via ``scripts/build.py``.
    Master-orchestrator ``a73b4a29`` discovered the bundle had drifted
    behind live HARTOS — installed-.exe users hit the very
    parallel-path violation 76f99dee was meant to eliminate, breaking
    the append-only audit invariant that the F3 PrivacySettingsPage
    UX claim rests on.

This test prevents that drift class from recurring silently:

    * It walks the AST of the bundled
      ``integrations/social/consent_service.py`` and asserts there is
      no ``register_consent_routes`` function definition.
    * It walks the AST of the bundled ``hart_intelligence_entry.py``
      and asserts there is no ``register_consent_routes`` import or
      call site.

The test SKIPS cleanly when ``python-embed/`` doesn't exist (e.g.,
CI environments that don't run a freeze build, or a fresh checkout
before first ``python scripts/build.py``).  The point is to fail
LOUDLY whenever a build IS present but stale.
"""
from __future__ import annotations

import ast
import os

import pytest

_NUNBA_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_BUNDLE_ROOT = os.path.join(
    _NUNBA_ROOT, 'python-embed', 'Lib', 'site-packages',
)
_CONSENT_SERVICE = os.path.join(
    _BUNDLE_ROOT, 'integrations', 'social', 'consent_service.py',
)
_HART_ENTRY = os.path.join(_BUNDLE_ROOT, 'hart_intelligence_entry.py')


def _bundle_present() -> bool:
    """Is python-embed/ a real freeze bundle on this machine?"""
    return (
        os.path.isdir(_BUNDLE_ROOT)
        and os.path.isfile(_CONSENT_SERVICE)
        and os.path.isfile(_HART_ENTRY)
    )


@pytest.mark.skipif(
    not _bundle_present(),
    reason='python-embed bundle not present (no freeze build on this '
           'machine yet) — drift guard is a no-op until a build runs.',
)
def test_bundled_consent_service_has_no_register_consent_routes():
    """The bundled consent_service must NOT define
    ``register_consent_routes``.  The legacy HTTP route surface was
    consolidated into ``consent_api.py`` in HARTOS 76f99dee.  If the
    Nunba installer ships a bundle that still defines this symbol,
    end-users will hit a parallel-path violation: legacy
    ``/api/consent/<user_id>/*`` (no JWT) registered alongside the
    canonical ``/api/social/consent`` (JWT-authed, append-only).
    """
    with open(_CONSENT_SERVICE, encoding='utf-8') as f:
        source = f.read()
    tree = ast.parse(source, filename=_CONSENT_SERVICE)

    illegal_defs = [
        node.name
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef)
        and node.name == 'register_consent_routes'
    ]
    assert not illegal_defs, (
        f'STALE BUNDLE: {_CONSENT_SERVICE} still defines '
        f'`register_consent_routes`. Live HARTOS removed it in '
        f'commit 76f99dee.  Run `python scripts/build.py` to '
        f'regenerate python-embed from the live HARTOS source.'
    )


@pytest.mark.skipif(
    not _bundle_present(),
    reason='python-embed bundle not present (no freeze build on this '
           'machine yet) — drift guard is a no-op until a build runs.',
)
def test_bundled_hart_intelligence_entry_has_no_register_consent_routes():
    """The bundled hart_intelligence_entry must NOT import OR call
    ``register_consent_routes``.  The call site was deleted in
    HARTOS 76f99dee (replaced by a tombstone comment block).  If the
    bundle still has it, ``init_app`` registers the legacy unauthed
    routes on top of the canonical JWT-authed ones.
    """
    with open(_HART_ENTRY, encoding='utf-8') as f:
        source = f.read()
    tree = ast.parse(source, filename=_HART_ENTRY)

    # Check 1 — no `from integrations.social.consent_service
    # import register_consent_routes` (or aliased import).
    illegal_imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == 'register_consent_routes':
                    illegal_imports.append(node.lineno)
    assert not illegal_imports, (
        f'STALE BUNDLE: {_HART_ENTRY} still imports '
        f'`register_consent_routes` at line(s) {illegal_imports}. '
        f'Live HARTOS removed the import + call in 76f99dee. '
        f'Run `python scripts/build.py` to regenerate python-embed.'
    )

    # Check 2 — no bare-name call (e.g., `register_consent_routes(app)`).
    illegal_calls = []
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == 'register_consent_routes'
        ):
            illegal_calls.append(node.lineno)
    assert not illegal_calls, (
        f'STALE BUNDLE: {_HART_ENTRY} still calls '
        f'`register_consent_routes(...)` at line(s) {illegal_calls}. '
        f'Live HARTOS replaced the call with a tombstone comment in '
        f'76f99dee.  Run `python scripts/build.py` to regenerate.'
    )


@pytest.mark.skipif(
    not _bundle_present(),
    reason='python-embed bundle not present',
)
def test_bundled_consent_service_grant_consent_is_append_only():
    """The bundled ``ConsentService.grant_consent`` must use APPEND
    semantics (always ``db.add`` a new row), not UPSERT-rewrite.
    The pre-76f99dee implementation rewrote ``granted_at`` on a
    matching ``(user_id, agent_id, consent_type, scope)`` tuple,
    which broke the immutable-audit-trail invariant.

    AST signal: the function body must contain ``db.add(...)``.  If
    we instead see an assignment like ``consent.granted_at = now``,
    that's the stale UPSERT path.
    """
    with open(_CONSENT_SERVICE, encoding='utf-8') as f:
        source = f.read()
    tree = ast.parse(source, filename=_CONSENT_SERVICE)

    grant_fn = None
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.FunctionDef)
            and node.name == 'grant_consent'
        ):
            grant_fn = node
            break
    assert grant_fn is not None, (
        'consent_service.py must define ConsentService.grant_consent'
    )

    # Append signal: at least one db.add() Call inside the function.
    has_db_add = False
    for inner in ast.walk(grant_fn):
        if (
            isinstance(inner, ast.Call)
            and isinstance(inner.func, ast.Attribute)
            and inner.func.attr == 'add'
        ):
            has_db_add = True
            break
    assert has_db_add, (
        f'STALE BUNDLE: {_CONSENT_SERVICE}::grant_consent has no '
        f'`db.add(...)` call — looks like the pre-76f99dee UPSERT '
        f'path.  Run `python scripts/build.py` to regenerate.'
    )

    # Anti-signal: no `consent.granted_at = ...` assignment in the
    # body.  Append-only means we INSERT, never rewrite.
    illegal_grant_at_writes = []
    for inner in ast.walk(grant_fn):
        if isinstance(inner, ast.Assign):
            for target in inner.targets:
                if (
                    isinstance(target, ast.Attribute)
                    and target.attr == 'granted_at'
                    and isinstance(target.value, ast.Name)
                    # Allow assignments to a NEW row's attribute
                    # (rare; canonical impl sets via constructor) but
                    # specifically reject the legacy `consent.<...>`
                    # rewrite of an EXISTING row.  The legacy code
                    # used the local name `consent`; flag that exact
                    # idiom.
                    and target.value.id == 'consent'
                ):
                    illegal_grant_at_writes.append(inner.lineno)
    assert not illegal_grant_at_writes, (
        f'STALE BUNDLE: {_CONSENT_SERVICE}::grant_consent rewrites '
        f'`consent.granted_at` at line(s) {illegal_grant_at_writes} '
        f'— the pre-76f99dee UPSERT path.  Append-only semantics '
        f'require a NEW row per grant.  Run `python scripts/build.py` '
        f'to regenerate.'
    )

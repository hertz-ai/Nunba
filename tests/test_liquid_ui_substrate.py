"""Drift-guard for the Liquid UI substrate contract.

Every `agent_ui_update(...)` emit type in HARTOS/Nunba must be both:
  1. allowlisted in HARTOS `liquid_ui_service.COMPONENT_TYPES`, AND
  2. rendered in Nunba `landing-page/src/components/AgentOverlay/AgentOverlay.jsx`
     `OverlayContent` switch.

Wires the `scripts/probe_liquid_ui_audit.py` walker into pytest so
regression-by-typo or regression-by-missing-renderer is caught at PR.

The walker skips test suites (`tests/` in either repo): their emits are
fixtures on purpose, such as the typo'd `'meet_copliot'` in HARTOS's
`tests/unit/test_liquid_ui_meet_copilot.py`, which checks that HARTOS
rejects it.  Before the walker found the real trees, those had to be
whitelisted here by name.

Captured 2026-05-14 after the audit found 4 substrate bugs that
shipped silently (qr_pair / oauth_link / toast / meet_copliot).
"""
from __future__ import annotations

import pathlib
import sys

# Allow importing the audit script as a module.
_REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO / 'scripts'))

import probe_liquid_ui_audit as audit  # noqa: E402


def _gather():
    hart = audit.HARTOS_ROOT
    nunba = audit.NUNBA_ROOT
    sites = audit.scan_emit_sites(hart) + audit.scan_emit_sites(nunba)
    emitted = {ty for _, ty in sites}
    allowlist = audit.parse_component_types(
        hart / 'integrations' / 'agent_engine' / 'liquid_ui_service.py')
    switch = audit.parse_switch_cases(
        nunba / 'landing-page' / 'src' / 'components'
        / 'AgentOverlay' / 'AgentOverlay.jsx')
    return sites, emitted, allowlist, switch


def test_every_emit_type_is_allowlisted():
    _, emitted, allowlist, _ = _gather()
    not_allowed = emitted - allowlist
    assert not not_allowed, (
        "Liquid UI emits would be rejected by HARTOS allowlist: "
        f"{sorted(not_allowed)}.  Add them to COMPONENT_TYPES in "
        "HARTOS/integrations/agent_engine/liquid_ui_service.py."
    )


def test_every_emit_type_has_web_renderer():
    _, emitted, _, switch = _gather()
    no_renderer = emitted - switch
    assert not no_renderer, (
        "Liquid UI emits have no web renderer (will show JSON blob): "
        f"{sorted(no_renderer)}.  Add a case to OverlayContent in "
        "Nunba/landing-page/src/components/AgentOverlay/AgentOverlay.jsx."
    )


def test_audit_script_executes_cleanly():
    """The probe script itself must not crash on the current tree."""
    sites, _, allowlist, switch = _gather()
    assert len(sites) > 0, "Audit found 0 emit sites — walker is broken"
    assert len(allowlist) >= 20, (
        f"Allowlist parsed only {len(allowlist)} types — "
        "COMPONENT_TYPES parser may be broken")
    assert len(switch) >= 15, (
        f"Switch parsed only {len(switch)} cases — "
        "OverlayContent parser may be broken")

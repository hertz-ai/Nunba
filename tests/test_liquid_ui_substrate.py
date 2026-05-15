"""Drift-guard for the Liquid UI substrate contract.

Every `agent_ui_update(...)` emit type in HARTOS/Nunba must be both:
  1. allowlisted in HARTOS `liquid_ui_service.COMPONENT_TYPES`, AND
  2. rendered in Nunba `landing-page/src/components/AgentOverlay/AgentOverlay.jsx`
     `OverlayContent` switch.

Wires the `scripts/probe_liquid_ui_audit.py` walker into pytest so
regression-by-typo or regression-by-missing-renderer is caught at PR.

The one allowed exception is the intentional negative test in
`tests/unit/test_liquid_ui_meet_copilot.py` which emits a typo'd
`'meet_copliot'` to verify HARTOS rejects it.  That emit is whitelisted
below.

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


# Intentional negative-test emits — these are SUPPOSED to fail HARTOS
# allowlist validation, so they don't count as substrate drift.
_NEGATIVE_TESTS = {
    'meet_copliot',  # tests/unit/test_liquid_ui_meet_copilot.py — typo
}


def _gather():
    hart = pathlib.Path('C:/Users/sathi/PycharmProjects/HARTOS')
    nunba = pathlib.Path(
        'C:/Users/sathi/PycharmProjects/Nunba-HART-Companion')
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
    not_allowed = (emitted - allowlist) - _NEGATIVE_TESTS
    assert not not_allowed, (
        f"Liquid UI emits would be rejected by HARTOS allowlist: "
        f"{sorted(not_allowed)}.  Add them to COMPONENT_TYPES in "
        f"HARTOS/integrations/agent_engine/liquid_ui_service.py."
    )


def test_every_emit_type_has_web_renderer():
    _, emitted, _, switch = _gather()
    no_renderer = (emitted - switch) - _NEGATIVE_TESTS
    assert not no_renderer, (
        f"Liquid UI emits have no web renderer (will show JSON blob): "
        f"{sorted(no_renderer)}.  Add a case to OverlayContent in "
        f"Nunba/landing-page/src/components/AgentOverlay/AgentOverlay.jsx."
    )


def test_audit_script_executes_cleanly():
    """The probe script itself must not crash on the current tree."""
    sites, _, allowlist, switch = _gather()
    assert len(sites) > 0, "Audit found 0 emit sites — walker is broken"
    assert len(allowlist) >= 20, (
        f"Allowlist parsed only {len(allowlist)} types — "
        f"COMPONENT_TYPES parser may be broken")
    assert len(switch) >= 15, (
        f"Switch parsed only {len(switch)} cases — "
        f"OverlayContent parser may be broken")

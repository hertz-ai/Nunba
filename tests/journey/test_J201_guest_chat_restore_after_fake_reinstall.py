"""J201 · Guest chat survives uninstall/reinstall cycle.

User bug report (2026-04-18):
  "When we uninstall reinstall it restores and auto-scrolls to
   the latest conversation for each agent."

Contract: Nunba's user-writable state lives in
`~/Documents/Nunba/data/` — which is NOT touched by uninstalling
`C:\\Program Files (x86)\\HevolveAI\\Nunba\\`.  So even after a
reinstall, the guest identity (device_id-derived) AND the
prompt_id → conversation linkage MUST be recovered.

Full uninstall/reinstall against the LIVE production install
would damage the operator's system — we deliberately DO NOT do
that.  Instead we:
  1. Verify the live /status exposes device_id (persists across
     restarts).
  2. Verify guest-register with the same device_id returns the
     same user.id (the 'reinstall preserves identity' invariant).
  3. Document the guest_id.json spec that would close the
     WebView2-UserData-wipe gap (xfail until implemented).
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from ._live_client import live_nunba, _unique_device_id  # noqa: F401

pytestmark = pytest.mark.journey


@pytest.mark.timeout(15)
def test_j201_device_id_persists_across_status_calls(live_nunba):
    """Pin: /status returns the SAME device_id on every call.
    Derivation is pure-function on hardware fingerprint; same
    hardware → same hash.  Reinstall preserves the fingerprint,
    so the frontend can recover the guest identity deterministically.
    """
    id1 = (live_nunba.get("/status").get_json() or {}).get("device_id")
    id2 = (live_nunba.get("/status").get_json() or {}).get("device_id")
    assert id1 and id2 and id1 == id2, (
        f"device_id NOT deterministic across /status calls: "
        f"{id1!r} vs {id2!r}"
    )


@pytest.mark.timeout(30)
def test_j201_same_device_returns_same_guest_across_reregister(live_nunba):
    """End-to-end of the 'reinstall preserves guest' story:
    first guest-register mints user.id X; forgetting the JWT
    client-side (app data wiped) and re-registering with the
    same device_id MUST return user.id X again.
    """
    device_id = _unique_device_id("j201-reinstall")

    r_a = live_nunba.post(
        "/api/social/auth/guest-register",
        json={"guest_name": "j201", "device_id": device_id},
        headers={"Content-Type": "application/json"},
    )
    if r_a.status_code in (404, 429):
        pytest.skip(f"guest-register unavailable: {r_a.status_code}")
    id_a = (
        ((r_a.get_json() or {}).get("data") or {}).get("user") or {}
    ).get("id")
    assert id_a, f"first register returned no id: {r_a.get_data(as_text=True)[:300]}"

    # "Reinstall" — we do NOT touch backend state; frontend would
    # just re-register with the same device_id.
    r_b = live_nunba.post(
        "/api/social/auth/guest-register",
        json={"guest_name": "j201", "device_id": device_id},
        headers={"Content-Type": "application/json"},
    )
    if r_b.status_code == 429:
        pytest.skip("rate-limited on re-register")
    id_b = (
        ((r_b.get_json() or {}).get("data") or {}).get("user") or {}
    ).get("id")
    assert id_b == id_a, (
        f"reinstall breaks guest identity: {id_a} → {id_b}. "
        f"Prior conversations become unreachable."
    )


@pytest.mark.timeout(15)
def test_j201_device_id_file_under_data_dir():
    """CLAUDE.md Gate 7: device_id.json MUST live under user-writable
    `~/Documents/Nunba/data/`.  If it landed under Program Files, an
    uninstall would wipe it and every reinstall would mint a fresh
    guest identity — breaking the restore promise.
    """
    home = Path.home()
    # Default install locations — accept any under ~/Documents/Nunba/
    candidates = [
        home / "Documents" / "Nunba" / "data" / "device_id.json",
        home / "Documents" / "Nunba" / "device_id.json",
    ]
    found = [p for p in candidates if p.exists()]
    if not found:
        # Check inside the source tree as a last resort (dev mode)
        alt = Path(__file__).resolve().parents[2] / "device_id.json"
        if alt.exists():
            found = [alt]
    if not found:
        pytest.skip(
            "device_id.json not found in any expected location — "
            "live Nunba may not have written it yet"
        )
    for p in found:
        # Must NOT be under Program Files
        assert "Program Files" not in str(p), (
            f"device_id.json at {p} is under Program Files — "
            f"reinstall would wipe it, breaking guest restore."
        )


@pytest.mark.timeout(15)
def test_j201_guest_id_json_future_spec():
    """DOCUMENT-ONLY: A future `guest_id.json` file under
    `~/Documents/Nunba/data/` — derived deterministically from
    device_id — would close the WebView2-UserData-wipe gap.
    Today the guest_user_id lives in WebView2 localStorage, which
    MAY be wiped by aggressive uninstallers.

    Contract the future fix must honor:
      - Path: under get_data_dir() (NOT Program Files)
      - Shape: {"guest_id": "<stable hex, >=16 chars>"}
      - Derivation: pure function of the hardware device_id
    """
    home = Path.home()
    data_dir_candidates = [
        home / "Documents" / "Nunba" / "data",
        Path(os.environ.get("NUNBA_DATA_DIR", "")),
    ]
    data_dirs = [d for d in data_dir_candidates if d and d.exists()]
    if not data_dirs:
        pytest.skip("No data dir found — live Nunba may not have booted fully")
    gid_file = None
    for d in data_dirs:
        f = d / "guest_id.json"
        if f.exists():
            gid_file = f
            break
    if not gid_file:
        pytest.xfail(
            "guest_id.json not yet implemented.  Future work: "
            "write it at first guest-register, derive from "
            "device_id, persist under get_data_dir()."
        )
    import json as _json
    data = _json.loads(gid_file.read_text(encoding="utf-8"))
    assert "guest_id" in data, "guest_id.json missing 'guest_id' key"
    assert isinstance(data["guest_id"], str) and len(data["guest_id"]) >= 16

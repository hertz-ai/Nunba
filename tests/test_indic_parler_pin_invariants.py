"""Indic Parler TTS venv package-pin invariants — regression guard.

Witnessed user-facing failure (2026-04-20):
    "Indic Parler TTS unavailable — using fallback voice engine"

Root cause (from ~/Documents/Nunba/logs/venv_indic_parler.log):
    pip's dependency resolver backtracks through every historical
    colorama version (0.4.x → 0.3.x → 0.2.x → 0.1.15) when installing
    parler-tts's transitive chain:
        parler-tts 0.2.2 → transformers 4.46.1 → tqdm >=4.27
        → colorama (unconstrained)
    colorama 0.1.15 has neither setup.py nor pyproject.toml and
    crashes the install with "does not appear to be a Python project".

Fix: pre-pin colorama and tqdm to modern versions FIRST in
BACKEND_VENV_PACKAGES['indic_parler'] so pip's resolver never enters
the backtrack tarpit.

This test locks the pin so a future refactor doesn't silently
reintroduce the backtrack.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class TestIndicParlerVenvPins:
    def _pkg_list(self) -> list[str]:
        from tts.package_installer import BACKEND_VENV_PACKAGES
        return list(BACKEND_VENV_PACKAGES.get('indic_parler', []))

    def test_indic_parler_backend_is_registered(self):
        from tts.package_installer import BACKEND_VENV_PACKAGES
        assert 'indic_parler' in BACKEND_VENV_PACKAGES, (
            'indic_parler backend missing from BACKEND_VENV_PACKAGES'
        )

    def test_colorama_pinned_with_minimum_floor(self):
        """colorama MUST be pinned with a floor that excludes the
        ancient no-setup.py versions.  Floor 0.4.0 is the minimum
        that ships with modern setup metadata."""
        pkgs = self._pkg_list()
        colorama_specs = [p for p in pkgs if p.lower().startswith('colorama')]
        assert colorama_specs, (
            'colorama pin missing from indic_parler venv packages. '
            'Without it, pip backtracks to colorama 0.1.15 (no setup.py) '
            'and the install crashes. Root cause of the user-visible '
            '"Indic Parler TTS unavailable" banner.'
        )
        # At least one spec must include a >= floor ≥ 0.4.0.
        import re
        has_floor = False
        for spec in colorama_specs:
            m = re.search(r'>=\s*(\d+)\.(\d+)', spec)
            if m:
                major, minor = int(m.group(1)), int(m.group(2))
                if (major, minor) >= (0, 4):
                    has_floor = True
                    break
            # Also accept exact pin at 0.4+.
            m2 = re.search(r'==\s*(\d+)\.(\d+)', spec)
            if m2:
                major, minor = int(m2.group(1)), int(m2.group(2))
                if (major, minor) >= (0, 4):
                    has_floor = True
                    break
        assert has_floor, (
            f'colorama pin has no >= 0.4 floor in {colorama_specs} — '
            f'pip will still backtrack to 0.1.x tarpit'
        )

    def test_tqdm_pinned_with_modern_floor(self):
        """tqdm must have a modern floor so pip resolves modern
        colorama in one step (no backtracking)."""
        pkgs = self._pkg_list()
        tqdm_specs = [p for p in pkgs if p.lower().startswith('tqdm')]
        assert tqdm_specs, (
            'tqdm pin missing from indic_parler venv packages'
        )
        import re
        has_modern_floor = False
        for spec in tqdm_specs:
            m = re.search(r'>=\s*(\d+)\.(\d+)', spec)
            if m:
                major, minor = int(m.group(1)), int(m.group(2))
                # tqdm >=4.65 is the minimum modern floor.
                if (major, minor) >= (4, 50):
                    has_modern_floor = True
                    break
        assert has_modern_floor, (
            f'tqdm has no >= 4.50 floor in {tqdm_specs}'
        )

    def test_colorama_and_tqdm_precede_parler_tts_in_install_order(self):
        """Install order matters: pip's resolver sees already-installed
        packages and won't try to downgrade them.  colorama + tqdm MUST
        be installed BEFORE parler-tts so the modern versions are
        already present when pip resolves parler-tts's deps."""
        pkgs = self._pkg_list()
        parler_idx = next(
            (i for i, p in enumerate(pkgs) if p.startswith('parler-tts')),
            -1,
        )
        colorama_idx = next(
            (i for i, p in enumerate(pkgs) if p.startswith('colorama')),
            -1,
        )
        tqdm_idx = next(
            (i for i, p in enumerate(pkgs) if p.startswith('tqdm')),
            -1,
        )
        assert parler_idx >= 0, 'parler-tts missing from package list'
        assert colorama_idx >= 0, 'colorama missing'
        assert tqdm_idx >= 0, 'tqdm missing'
        assert colorama_idx < parler_idx, (
            f'colorama (idx={colorama_idx}) MUST be installed before '
            f'parler-tts (idx={parler_idx}) to prevent resolver backtrack'
        )
        assert tqdm_idx < parler_idx, (
            f'tqdm (idx={tqdm_idx}) MUST be installed before '
            f'parler-tts (idx={parler_idx})'
        )

    def test_transformers_still_pinned_to_4_46_1(self):
        """parler-tts 0.2.2 requires transformers <4.47.  Pin is exact
        at 4.46.1 for cross-platform reproducibility."""
        pkgs = self._pkg_list()
        tr_specs = [p for p in pkgs if p.startswith('transformers')]
        assert tr_specs, 'transformers pin missing'
        assert any('==4.46.1' in s for s in tr_specs), (
            f'transformers==4.46.1 pin changed: {tr_specs}'
        )

    def test_parler_tts_still_pinned_to_0_2_2(self):
        """parler-tts 0.2.3 has DacModel.decode() API mismatch.
        Keep at 0.2.2."""
        pkgs = self._pkg_list()
        pt_specs = [p for p in pkgs if p.startswith('parler-tts')]
        assert pt_specs, 'parler-tts pin missing'
        assert any('==0.2.2' in s for s in pt_specs), (
            f'parler-tts==0.2.2 pin changed: {pt_specs} — '
            f'0.2.3 has a DacModel.decode() API mismatch that silently '
            f'regresses audio synthesis'
        )

"""Indic Parler python-embed bundle transitive-dep invariants.

Witnessed user-facing failure (2026-04-21):
    integrations.service_tools.gpu_worker - INFO - [indic_parler]
    ModuleNotFoundError: No module named 'dac'

Root cause:
    setup_freeze_nunba.py's _tts_deps list pulled in parler_tts via
    `pip install --target python-embed/Lib/site-packages parler-tts`
    but --target does NOT always resolve transitive deps (it does an
    install-but-don't-solve) so the peer dep `dac` (from
    descript-audio-codec) wasn't installed.

    parler_tts/dac_wrapper/modeling_dac.py:
        from dac.model import DAC
    \u2026crashes with ModuleNotFoundError at first parler_tts import.

Fix: added an explicit `descript-audio-codec` entry to _tts_deps so
python-embed ships a top-level `dac` package.

This test locks the dep in the _tts_deps list so a future refactor
doesn't silently regress.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.timeout(5)


class TestIndicParlerBundleDeps:
    FREEZE_SCRIPT = PROJECT_ROOT / 'scripts' / 'setup_freeze_nunba.py'

    def test_freeze_script_exists(self):
        assert self.FREEZE_SCRIPT.exists()

    def _freeze_src(self) -> str:
        return self.FREEZE_SCRIPT.read_text(encoding='utf-8', errors='replace')

    def test_parler_tts_still_declared_in_tts_deps(self):
        """parler-tts must still be in the _tts_deps list."""
        src = self._freeze_src()
        assert '("parler-tts"' in src, (
            'parler-tts missing from _tts_deps; breaks Indian TTS'
        )

    def test_dac_from_descript_audio_codec_declared(self):
        """descript-audio-codec ships the top-level `dac` package.
        parler_tts.dac_wrapper imports `from dac.model import DAC`.
        Without this in _tts_deps, the frozen bundle ships parler_tts
        but omits dac, so indic_parler crashes at load."""
        src = self._freeze_src()
        # The _tts_deps tuple for dac should reference either
        # 'descript-audio-codec' pip name or 'dac' import name.
        has_dac_tuple = bool(re.search(
            r'\(\s*["\']descript-audio-codec["\']\s*,\s*'
            r'["\']descript-audio-codec["\']\s*,\s*["\']dac["\']',
            src,
        ))
        assert has_dac_tuple, (
            'descript-audio-codec (dac) not in _tts_deps.  Frozen '
            'bundle will crash indic_parler with '
            '"ModuleNotFoundError: No module named \'dac\'" at first '
            'parler_tts import.'
        )

    def test_dac_entry_precedes_parler_tts_OR_no_order_constraint(self):
        """Install order isn't strictly required here (pip --target
        resolves deps independently per invocation), but if dac IS
        ordered, it should be AFTER parler-tts so parler_tts's own
        pip resolve has a chance first.  This test is a documentation
        guard only."""
        src = self._freeze_src()
        parler_idx = src.find('("parler-tts"')
        dac_idx = src.find('("descript-audio-codec"')
        # Both must exist.
        assert parler_idx > 0 and dac_idx > 0, (
            'Either parler-tts or descript-audio-codec missing from _tts_deps'
        )
        # No hard assertion on order; this test documents intent.

    def test_parler_tts_and_dac_have_matching_tuple_shape(self):
        """All _tts_deps entries follow the same 4-tuple shape:
        (label, pip_name, import_name, extra_args_list).  Regression
        guard against typos.

        Scans the whole file for 4-tuple matches rather than trying
        to extract the _tts_deps block body (nested brackets defeat
        non-greedy regex).
        """
        src = self._freeze_src()
        # Every tuple should be (str, str, str, [...]) shape.
        # The _tts_deps entries are the only 4-tuples with pip-style
        # hyphenated names (chatterbox-tts, parler-tts, etc.) so match
        # on that shape.
        tuples = re.findall(
            r'\(\s*"([a-z][a-z0-9\-_]+)"\s*,\s*"[a-z][a-z0-9\-_]+"\s*,\s*"[a-z][a-z0-9_]+"\s*,\s*\[',
            src,
        )
        # Expect at least 5 entries: chatterbox-tts, parler-tts,
        # descript-audio-codec, faster-whisper, ctranslate2.
        assert len(tuples) >= 5, (
            f'_tts_deps has only {len(tuples)} well-formed tuples '
            f'(expected >=5): {tuples}'
        )
        # descript-audio-codec must be in the list.
        assert 'descript-audio-codec' in tuples, (
            f'descript-audio-codec missing from _tts_deps: {tuples}'
        )
        # parler-tts must be in the list.
        assert 'parler-tts' in tuples, (
            f'parler-tts missing from _tts_deps: {tuples}'
        )

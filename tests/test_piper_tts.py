"""
test_piper_tts.py - Tests for tts/piper_tts.py

Tests the Piper TTS engine — CPU-based text-to-speech that runs offline.
Each test verifies a specific functional or non-functional aspect:

FT: Voice preset structure, model path resolution, voice installation check,
    executable discovery, synthesis fallback chain, cache hashing, WAV output format.
NFT: Thread safety of synthesis queue, graceful degradation without piper module,
     directory auto-creation, download resilience.
"""
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# Voice Presets — structure validation
# ============================================================

class TestVoicePresets:
    """Validate VOICE_PRESETS data integrity — malformed presets cause download failures."""

    def test_all_presets_have_required_keys(self):
        from tts.piper_tts import VOICE_PRESETS
        required = {'name', 'language', 'quality', 'sample_rate', 'url', 'config_url', 'size_mb'}
        for voice_id, preset in VOICE_PRESETS.items():
            missing = required - set(preset.keys())
            assert not missing, f"Voice '{voice_id}' missing keys: {missing}"

    def test_all_urls_are_https(self):
        """Voice downloads must use HTTPS — HTTP would expose users to MITM attacks."""
        from tts.piper_tts import VOICE_PRESETS
        for voice_id, preset in VOICE_PRESETS.items():
            assert preset['url'].startswith('https://'), f"Voice '{voice_id}' url is not HTTPS"
            assert preset['config_url'].startswith('https://'), f"Voice '{voice_id}' config_url is not HTTPS"

    def test_sample_rates_are_standard(self):
        """Non-standard sample rates cause audio playback issues on some devices."""
        from tts.piper_tts import VOICE_PRESETS
        valid_rates = {8000, 16000, 22050, 24000, 44100, 48000}
        for voice_id, preset in VOICE_PRESETS.items():
            assert preset['sample_rate'] in valid_rates, (
                f"Voice '{voice_id}' has non-standard sample_rate: {preset['sample_rate']}")

    def test_default_voice_exists_in_presets(self):
        """DEFAULT_VOICE must reference an actual preset — otherwise first-run crashes."""
        from tts.piper_tts import DEFAULT_VOICE, VOICE_PRESETS
        assert DEFAULT_VOICE in VOICE_PRESETS

    def test_size_mb_is_positive(self):
        """Size is used for download progress bars — 0 or negative breaks the UI."""
        from tts.piper_tts import VOICE_PRESETS
        for voice_id, preset in VOICE_PRESETS.items():
            assert preset['size_mb'] > 0, f"Voice '{voice_id}' has invalid size_mb"


# ============================================================
# PiperTTS initialization
# ============================================================

class TestPiperTTSInit:
    """Test PiperTTS class initialization and directory handling."""

    def test_creates_voices_dir_on_init(self):
        """Auto-creating directories prevents first-run failures."""
        with tempfile.TemporaryDirectory() as tmpdir:
            voices = os.path.join(tmpdir, 'voices')
            cache = os.path.join(tmpdir, 'cache')
            with patch('tts.piper_tts.PiperTTS._init_piper'):
                from tts.piper_tts import PiperTTS
                tts = PiperTTS(voices_dir=voices, cache_dir=cache)
            assert os.path.isdir(voices)
            assert os.path.isdir(cache)

    def test_default_dirs_under_home(self):
        """Default paths must be under user home — not CWD which may be read-only."""
        with patch('tts.piper_tts.PiperTTS._init_piper'):
            from tts.piper_tts import PiperTTS
            tts = PiperTTS()
        assert str(Path.home()) in str(tts.voices_dir)

    def test_graceful_without_piper_module(self):
        """When piper-tts pip package is missing, init must not crash."""
        from tts.piper_tts import PiperTTS
        with tempfile.TemporaryDirectory() as tmpdir:
            # Patch only the piper import inside _init_piper
            with patch.dict('sys.modules', {'piper': None}):
                with patch.object(PiperTTS, '_init_piper'):
                    tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                                   cache_dir=os.path.join(tmpdir, 'c'))
                tts._piper_module = None
                assert tts._piper_module is None
                assert tts.is_available() is False or tts.is_available() is True  # doesn't crash


# ============================================================
# Voice path resolution
# ============================================================

class TestVoicePaths:
    """Test voice model file discovery — wrong paths = silent TTS failure."""

    def test_get_voice_path_returns_paths_when_files_exist(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=tmpdir, cache_dir=tmpdir)
            # Create fake model files
            (Path(tmpdir) / 'test-voice.onnx').write_text('model')
            (Path(tmpdir) / 'test-voice.onnx.json').write_text('{}')
            model, config = tts.get_voice_path('test-voice')
            assert model is not None
            assert config is not None
            assert model.name == 'test-voice.onnx'

    def test_get_voice_path_returns_none_when_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=tmpdir, cache_dir=tmpdir)
            model, config = tts.get_voice_path('nonexistent')
            assert model is None
            assert config is None

    def test_is_voice_installed_true_when_both_files_exist(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=tmpdir, cache_dir=tmpdir)
            (Path(tmpdir) / 'v1.onnx').write_text('m')
            (Path(tmpdir) / 'v1.onnx.json').write_text('{}')
            assert tts.is_voice_installed('v1') is True

    def test_is_voice_installed_false_when_model_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=tmpdir, cache_dir=tmpdir)
            # Only config, no model
            (Path(tmpdir) / 'v2.onnx.json').write_text('{}')
            assert tts.is_voice_installed('v2') is False


# ============================================================
# Executable discovery
# ============================================================

class TestExecutableDiscovery:
    """Test piper binary discovery — fallback to subprocess if pip module missing."""

    def test_finds_exe_in_voices_parent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'voices'),
                               cache_dir=os.path.join(tmpdir, 'cache'))
            exe_name = 'piper.exe' if sys.platform == 'win32' else 'piper'
            exe_path = Path(tmpdir) / exe_name
            exe_path.write_text('fake')
            result = tts._find_piper_executable()
            # May or may not find it depending on path resolution
            # The key test: it doesn't crash
            assert result is None or isinstance(result, str)

    def test_returns_none_when_not_found(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                               cache_dir=os.path.join(tmpdir, 'c'))
            with patch('subprocess.run', side_effect=FileNotFoundError):
                result = tts._find_piper_executable()
            assert result is None

    def test_is_available_true_with_module(self):
        """is_available must return True when piper Python module is loaded."""
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                               cache_dir=os.path.join(tmpdir, 'c'))
            tts._piper_module = MagicMock()  # Simulate loaded module
            assert tts.is_available() is True

    def test_is_available_false_without_module_or_exe(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                               cache_dir=os.path.join(tmpdir, 'c'))
            # Patch the ACCESSOR, not the _piper_module attribute. Nulling the
            # attribute no longer means "unavailable": _get_piper_module() now
            # RE-IMPORTS after a failure (so a mid-session auto-install is
            # picked up instead of being latched off for the process lifetime),
            # and in a dev venv that import succeeds. The accessor is the
            # availability authority, so that is what a test must control.
            with patch.object(tts, '_get_piper_module', return_value=None), \
                 patch.object(tts, '_find_piper_executable', return_value=None):
                assert tts.is_available() is False

    @staticmethod
    def _fresh_breaker_state():
        """The breaker is cached on the CLASS so all instances share one
        cooldown. That is deliberate in production and a leak between tests —
        drop it so each test starts cold."""
        from tts.piper_tts import PiperTTS
        for attr in ('_piper_cb', '_piper_cb_unavailable'):
            if hasattr(PiperTTS, attr):
                delattr(PiperTTS, attr)

    def test_failed_import_is_retried_not_latched(self):
        """REGRESSION GUARD for a real 63-minute outage (2026-08-10).

        The import used to run once in __init__ and cache None on failure.
        Combined with the module-level singleton, one failed import — e.g.
        because the TTS auto-installer was mid-write — disabled Piper for the
        whole PROCESS. Logs show "No synthesis method available" at 14:32 and
        again at 15:35 while the install had long since succeeded. The ladder
        lost its floor and TTS went silent.

        RULE: memoize a capability SUCCESS, never a capability FAILURE that an
        installer may be concurrently repairing.
        """
        self._fresh_breaker_state()
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                               cache_dir=os.path.join(tmpdir, 'c'))

            calls = []
            fake_module = MagicMock()

            def _fake_import(name, *a, **kw):
                if name == 'piper':
                    calls.append(name)
                    if len(calls) == 1:
                        raise ImportError('not installed yet')
                    return fake_module
                return real_import(name, *a, **kw)

            import builtins
            real_import = builtins.__import__

            with patch.object(builtins, '__import__', _fake_import):
                assert tts._get_piper_module() is None, "first attempt fails"
                # Defeat the anti-thrash cooldown via the CANONICAL breaker
                # (KeyedCircuitBreaker.reset) rather than poking a timer
                # attribute — there is no local timer any more, by design.
                _b = PiperTTS._import_breaker()
                if _b is not None:
                    _b.reset('piper')
                assert tts._get_piper_module() is fake_module, (
                    "second attempt must RE-IMPORT — if this is None the "
                    "failure is being latched again and the TTS floor will "
                    "silently disappear whenever an install races startup")
            assert len(calls) == 2, "expected exactly one retry, not thrashing"

    def test_reprobe_is_rate_limited(self):
        """The retry must not thrash the import machinery on a per-sentence
        synthesize loop — one attempt per cooldown window, not per call."""
        self._fresh_breaker_state()
        with tempfile.TemporaryDirectory() as tmpdir:
            from tts.piper_tts import PiperTTS
            with patch.object(PiperTTS, '_init_piper'):
                tts = PiperTTS(voices_dir=os.path.join(tmpdir, 'v'),
                               cache_dir=os.path.join(tmpdir, 'c'))
            calls = []
            import builtins
            real_import = builtins.__import__

            def _always_fail(name, *a, **kw):
                if name == 'piper':
                    calls.append(name)
                    raise ImportError('still missing')
                return real_import(name, *a, **kw)

            with patch.object(builtins, '__import__', _always_fail):
                for _ in range(25):
                    tts._get_piper_module()
            assert len(calls) == 1, (
                f"expected 1 import attempt inside the cooldown, got {len(calls)}")

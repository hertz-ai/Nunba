"""
test_tts_engines.py - Tests for TTS engine selection, Piper TTS, and VibeVoice TTS.

Covers:
- TTSEngine backend selection logic (multi-engine routing)
- TTSEngine initialization with forced backends
- TTSEngine feature listing per engine capability
- TTSEngine synthesize guard (empty text, no backend)
- TTSEngine shutdown lifecycle
- PiperTTS voice presets and listing
- PiperTTS voice path resolution
- PiperTTS set_voice / is_voice_installed
- PiperTTS synthesize guards (empty text)
- PiperTTS cache clearing
- VibeVoice model recommendation based on VRAM
- VibeVoice speaker listing and filtering
- VibeVoice set_speaker validation
- VibeVoice detect_gpu returns proper structure
- get_tts_engine singleton behavior
"""
import os
import sys
import time
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# TTSEngine (tts_engine.py) tests
# ============================================================

class TestTTSEngineSelection:
    """Test TTS engine backend selection logic."""

    def test_no_backend_when_nothing_available(self):
        """When neither GPU nor Piper is available, backend is 'none'."""
        from tts.tts_engine import TTSEngine, BACKEND_NONE
        engine = TTSEngine(auto_init=False)
        # Mock hardware detection to report no GPU
        engine._hw_detected = True
        engine.has_gpu = False

        # Piper import fails
        with patch("tts.tts_engine.TTSEngine._select_backend") as mock_sel:
            mock_sel.return_value = BACKEND_NONE
            result = engine.initialize()
            assert result is False
            assert engine.backend == BACKEND_NONE

    def test_force_piper_backend(self):
        """Force Piper backend even if GPU is available."""
        from tts.tts_engine import TTSEngine, BACKEND_PIPER

        engine = TTSEngine(auto_init=False)

        with patch.dict("sys.modules", {"tts.piper_tts": MagicMock()}):
            mock_piper = MagicMock()
            with patch("tts.tts_engine.PiperTTS", mock_piper, create=True):
                result = engine.initialize(force_backend=BACKEND_PIPER)
                assert engine._active_backend == BACKEND_PIPER

    def test_backend_name_none(self):
        """When no backend, backend_name returns 'None'."""
        from tts.tts_engine import TTSEngine
        engine = TTSEngine(auto_init=False)
        assert engine.backend_name == "none"

    def test_backend_name_piper(self):
        """When Piper backend, backend_name contains 'Piper'."""
        from tts.tts_engine import TTSEngine, BACKEND_PIPER
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_PIPER
        assert "Piper" in engine.backend_name

    def test_backend_name_chatterbox(self):
        """When Chatterbox Turbo backend, backend_name contains 'Chatterbox'."""
        from tts.tts_engine import TTSEngine, BACKEND_CHATTERBOX_TURBO
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_CHATTERBOX_TURBO
        assert "Chatterbox" in engine.backend_name


class TestTTSEngineFeatures:
    """Test feature listing by backend."""

    def test_piper_features(self):
        """Piper has no cloning/streaming/paralinguistic/emotion/multilingual."""
        from tts.tts_engine import TTSEngine, BACKEND_PIPER
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_PIPER
        features = engine._get_features()
        assert features == []

    def test_chatterbox_turbo_features(self):
        """Chatterbox Turbo has voice-cloning and paralinguistic."""
        from tts.tts_engine import TTSEngine, BACKEND_CHATTERBOX_TURBO
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_CHATTERBOX_TURBO
        features = engine._get_features()
        assert "voice-cloning" in features
        assert "paralinguistic" in features

    def test_indic_parler_features(self):
        """Indic Parler has multilingual (21 languages)."""
        from tts.tts_engine import TTSEngine, BACKEND_INDIC_PARLER
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_INDIC_PARLER
        features = engine._get_features()
        assert "multilingual" in features

    def test_no_features_when_no_backend(self):
        from tts.tts_engine import TTSEngine, BACKEND_NONE
        engine = TTSEngine(auto_init=False)
        engine._active_backend = BACKEND_NONE
        features = engine._get_features()
        assert features == []


class TestTTSEngineSynthesizeGuards:
    """Test synthesize guards (empty text, uninitialized backend)."""

    def test_synthesize_empty_text(self):
        from tts.tts_engine import TTSEngine
        engine = TTSEngine(auto_init=False)
        engine._initialized = True
        result = engine.synthesize("")
        assert result is None

    def test_synthesize_whitespace_text(self):
        from tts.tts_engine import TTSEngine
        engine = TTSEngine(auto_init=False)
        engine._initialized = True
        result = engine.synthesize("   \n  ")
        assert result is None

    def test_synthesize_no_backend_loaded(self):
        """synthesize returns None when no backend is loaded in _backends."""
        from tts.tts_engine import TTSEngine, BACKEND_PIPER
        engine = TTSEngine(auto_init=False)
        engine._initialized = True
        engine._active_backend = BACKEND_PIPER
        engine._backends = {}  # no actual backend loaded
        result = engine.synthesize("Hello world")
        assert result is None

    def test_clone_voice_requires_vibevoice(self):
        """clone_voice should fail if backend is not vibevoice."""
        from tts.tts_engine import TTSEngine, BACKEND_PIPER
        engine = TTSEngine(auto_init=False)
        engine._initialized = True
        engine._active_backend = BACKEND_PIPER
        result = engine.clone_voice("/fake/audio.wav", "my_voice")
        assert result is False


class TestTTSEngineShutdown:
    """Test engine shutdown."""

    def test_shutdown_clears_state(self):
        from tts.tts_engine import TTSEngine, BACKEND_PIPER, BACKEND_NONE
        engine = TTSEngine(auto_init=False)
        engine._initialized = True
        engine._active_backend = BACKEND_PIPER
        mock_backend = MagicMock()
        engine._backends = {BACKEND_PIPER: mock_backend}
        engine.shutdown()
        assert engine._initialized is False
        assert engine._active_backend == BACKEND_NONE
        assert len(engine._backends) == 0


class TestGetTTSEngineSingleton:
    """Test the module-level get_tts_engine singleton."""

    def test_returns_same_instance(self):
        import tts.tts_engine as te
        # Reset global
        te._engine = None
        with patch.object(te.TTSEngine, "_detect_hardware"):
            e1 = te.get_tts_engine(auto_init=False)
            e2 = te.get_tts_engine()
            assert e1 is e2
        te._engine = None  # cleanup


# ============================================================
# PiperTTS (piper_tts.py) tests
# ============================================================

class TestPiperTTSVoicePresets:
    """Test voice preset data and listing."""

    def test_voice_presets_not_empty(self):
        from tts.piper_tts import VOICE_PRESETS
        assert len(VOICE_PRESETS) > 0

    def test_all_presets_have_required_keys(self):
        from tts.piper_tts import VOICE_PRESETS
        required = {"name", "language", "quality", "sample_rate", "url", "config_url", "size_mb"}
        for vid, preset in VOICE_PRESETS.items():
            missing = required - set(preset.keys())
            assert not missing, f"Voice {vid} missing keys: {missing}"

    def test_default_voice_in_presets(self):
        from tts.piper_tts import VOICE_PRESETS, DEFAULT_VOICE
        assert DEFAULT_VOICE in VOICE_PRESETS


class TestPiperTTSInstance:
    """Test PiperTTS instance methods (with mocked piper module)."""

    @pytest.fixture
    def piper(self, tmp_path):
        """Create a PiperTTS instance with mocked piper module."""
        with patch.dict("sys.modules", {"piper": None}):
            from tts.piper_tts import PiperTTS
            return PiperTTS(
                voices_dir=str(tmp_path / "voices"),
                cache_dir=str(tmp_path / "cache"),
            )

    def test_is_available_false_without_piper(self, piper):
        """Without piper module or executable, is_available returns False."""
        with patch.object(piper, "_find_piper_executable", return_value=None):
            assert piper.is_available() is False

    def test_list_available_voices(self, piper):
        from tts.piper_tts import VOICE_PRESETS
        voices = piper.list_available_voices()
        assert voices == VOICE_PRESETS

    def test_list_installed_voices_empty(self, piper):
        """No voices installed initially."""
        assert piper.list_installed_voices() == []

    def test_set_voice_valid(self, piper):
        assert piper.set_voice("en_US-amy-medium") is True
        assert piper.current_voice == "en_US-amy-medium"

    def test_set_voice_invalid(self, piper):
        assert piper.set_voice("nonexistent-voice") is False

    def test_get_voice_path_not_installed(self, piper):
        model, config = piper.get_voice_path("en_US-amy-medium")
        assert model is None
        assert config is None

    def test_get_voice_path_installed(self, piper, tmp_path):
        """If voice files exist, get_voice_path returns Path objects."""
        voices_dir = tmp_path / "voices"
        (voices_dir / "en_US-amy-medium.onnx").touch()
        (voices_dir / "en_US-amy-medium.onnx.json").touch()
        model, config = piper.get_voice_path("en_US-amy-medium")
        assert model is not None
        assert config is not None
        assert model.name == "en_US-amy-medium.onnx"

    def test_is_voice_installed(self, piper, tmp_path):
        voices_dir = tmp_path / "voices"
        assert piper.is_voice_installed("en_US-amy-medium") is False
        (voices_dir / "en_US-amy-medium.onnx").touch()
        (voices_dir / "en_US-amy-medium.onnx.json").touch()
        assert piper.is_voice_installed("en_US-amy-medium") is True

    def test_synthesize_empty_text(self, piper):
        assert piper.synthesize("") is None
        assert piper.synthesize("   ") is None

    def test_download_voice_unknown_id(self, piper):
        assert piper.download_voice("unknown_voice_xyz") is False

    def test_clear_cache(self, piper, tmp_path):
        """clear_cache removes files older than max_age_hours."""
        cache_dir = tmp_path / "cache"
        # Create a fake cached file with old mtime
        old_file = cache_dir / "tts_abc123.wav"
        old_file.write_bytes(b"\x00" * 100)
        # Set mtime to 48 hours ago
        old_mtime = time.time() - 48 * 3600
        os.utime(str(old_file), (old_mtime, old_mtime))

        # Create a recent file
        new_file = cache_dir / "tts_def456.wav"
        new_file.write_bytes(b"\x00" * 100)

        piper.clear_cache(max_age_hours=24)
        assert not old_file.exists()
        assert new_file.exists()


# ============================================================
# VibeVoice TTS (vibevoice_tts.py) tests
# ============================================================

class TestVibeVoiceModelRecommendation:
    """Test VRAM-based model recommendation."""

    def test_recommend_model_8gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(8.0) == "VibeVoice-1.5B"

    def test_recommend_model_12gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(12.0) == "VibeVoice-1.5B"

    def test_recommend_model_4gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(4.0) == "VibeVoice-Realtime-0.5B"

    def test_recommend_model_6gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(6.0) == "VibeVoice-Realtime-0.5B"

    def test_recommend_model_2gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(2.0) is None

    def test_recommend_model_0gb(self):
        from tts.vibevoice_tts import _recommend_model
        assert _recommend_model(0.0) is None


class TestVibeVoiceSpeakers:
    """Test speaker presets and filtering."""

    def test_speakers_not_empty(self):
        from tts.vibevoice_tts import VIBEVOICE_SPEAKERS
        assert len(VIBEVOICE_SPEAKERS) > 0

    def test_all_speakers_have_required_keys(self):
        from tts.vibevoice_tts import VIBEVOICE_SPEAKERS
        required = {"name", "language", "style", "gender"}
        for sid, speaker in VIBEVOICE_SPEAKERS.items():
            missing = required - set(speaker.keys())
            assert not missing, f"Speaker {sid} missing keys: {missing}"

    def test_default_speaker_exists(self):
        from tts.vibevoice_tts import VIBEVOICE_SPEAKERS, DEFAULT_SPEAKER
        assert DEFAULT_SPEAKER in VIBEVOICE_SPEAKERS


class TestVibeVoiceTTSInstance:
    """Test VibeVoiceTTS instance methods (no GPU needed)."""

    @pytest.fixture
    def vv(self, tmp_path):
        """Create VibeVoiceTTS with mocked GPU detection."""
        with patch("tts.vibevoice_tts.detect_gpu", return_value={
            "gpu_available": False, "gpu_name": None,
            "vram_gb": 0, "gpu_vendor": None,
            "cuda_version": None, "recommended_model": None,
        }):
            from tts.vibevoice_tts import VibeVoiceTTS
            return VibeVoiceTTS(
                model_name="VibeVoice-Realtime-0.5B",
                models_dir=str(tmp_path / "models"),
                cache_dir=str(tmp_path / "cache"),
            )

    def test_is_available_false_without_gpu(self, vv):
        assert vv.is_available() is False

    def test_is_model_downloaded_false(self, vv):
        assert vv.is_model_downloaded() is False

    def test_list_speakers_filters_by_language(self, vv):
        """Realtime-0.5B supports many languages, 1.5B only en+zh."""
        speakers = vv.list_speakers()
        # Realtime-0.5B has many languages, so more speakers
        assert len(speakers) > 0

    def test_set_speaker_valid(self, vv):
        speakers = vv.list_speakers()
        if speakers:
            first = list(speakers.keys())[0]
            assert vv.set_speaker(first) is True

    def test_set_speaker_invalid(self, vv):
        assert vv.set_speaker("nonexistent_speaker_xyz") is False

    def test_synthesize_empty_text(self, vv):
        assert vv.synthesize("") is None
        assert vv.synthesize("   ") is None


class TestVibeVoiceDetectGpu:
    """Test the detect_gpu function with mocked subprocess calls."""

    def test_detect_gpu_no_nvidia_no_amd(self):
        """When no GPU tools are found and WMI returns nothing, returns gpu_available=False."""
        from tts.vibevoice_tts import detect_gpu
        with patch("shutil.which", return_value=None), \
             patch("tts.vibevoice_tts._detect_gpu_wmic", return_value=None):
            result = detect_gpu()
            assert result["gpu_available"] is False
            assert result["gpu_name"] is None

    def test_detect_gpu_result_structure(self):
        """detect_gpu always returns the required keys."""
        from tts.vibevoice_tts import detect_gpu
        with patch("shutil.which", return_value=None), \
             patch("tts.vibevoice_tts._detect_gpu_wmic", return_value=None):
            result = detect_gpu()
            for key in ("gpu_available", "gpu_name", "vram_gb", "gpu_vendor",
                        "cuda_version", "recommended_model"):
                assert key in result


class TestVibeVoiceModels:
    """Test model variant definitions."""

    def test_models_have_required_keys(self):
        from tts.vibevoice_tts import VIBEVOICE_MODELS
        required = {"name", "hf_path", "size_gb", "vram_required_gb", "features", "languages"}
        for mid, model in VIBEVOICE_MODELS.items():
            missing = required - set(model.keys())
            assert not missing, f"Model {mid} missing keys: {missing}"

    def test_realtime_model_supports_many_languages(self):
        from tts.vibevoice_tts import VIBEVOICE_MODELS
        rt = VIBEVOICE_MODELS["VibeVoice-Realtime-0.5B"]
        assert len(rt["languages"]) > 5

    def test_full_model_supports_voice_cloning(self):
        from tts.vibevoice_tts import VIBEVOICE_MODELS
        full = VIBEVOICE_MODELS["VibeVoice-1.5B"]
        assert "voice-cloning" in full["features"]

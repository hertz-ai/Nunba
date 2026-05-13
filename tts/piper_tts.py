"""
piper_tts.py - Piper TTS integration for Nunba

Provides local, CPU-based text-to-speech using Piper TTS.
Converts text responses to audio without requiring GPU or internet.

Piper TTS: https://github.com/rhasspy/piper
"""
import hashlib
import logging
import os
import queue
import subprocess
import sys
import tempfile
import threading
import urllib.request
import wave
from collections.abc import Callable
from pathlib import Path

logger = logging.getLogger('NunbaPiperTTS')

# Voice presets - common Piper voices
VOICE_PRESETS = {
    "en_US-amy-medium": {
        "name": "Amy (US English)",
        "language": "en_US",
        "quality": "medium",
        "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json",
        "size_mb": 63
    },
    "en_US-lessac-medium": {
        "name": "Lessac (US English)",
        "language": "en_US",
        "quality": "medium",
        "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json",
        "size_mb": 63
    },
    "en_GB-alan-medium": {
        "name": "Alan (British English)",
        "language": "en_GB",
        "quality": "medium",
        "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx.json",
        "size_mb": 63
    },
    "en_US-libritts-high": {
        "name": "LibriTTS (US English, High Quality)",
        "language": "en_US",
        "quality": "high",
        "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx.json",
        "size_mb": 75
    },
    # ── Cross-platform voice coverage via rhasspy/piper-voices ──────────
    # Every entry below is a .onnx + .onnx.json pair that runs identically
    # on Windows / macOS / Linux with NO GPU, NO system-installed voice,
    # and NO VRAM contention with the main LLM.  This is the portable
    # answer to "TTS should work across every device regardless of OS".
    # Voices installed on demand (first use per language) to keep the
    # bundled installer small.  ~30–65 MB per language once cached.
    #
    # Pattern for the URLs:
    #   https://huggingface.co/rhasspy/piper-voices/resolve/main/{LANG}/{LANG_REGION}/{SPEAKER}/{QUALITY}/{LANG_REGION}-{SPEAKER}-{QUALITY}.onnx
    # plus the matching .onnx.json sibling.  Each voice below was picked
    # as the rhasspy-blessed default speaker for that language.
    # Tamil + Malayalam were previously listed here pointing at rhasspy/
    # piper-voices, but those paths 404 — neither language has an
    # upstream Piper voice.  They're covered instead by indic_parler in
    # tts_engine's _LANG_CAPABLE_BACKENDS fallback, since it's the only
    # backend Nunba has that actually speaks ta/ml.  A downloaded 15-byte
    # "Entry not found" stub was causing PiperVoice.load to crash with
    # `Expecting value: line 1 column 1`.  Keep these commented so the
    # next maintainer doesn't re-add them without verifying the URL:
    #   ta_IN-pavithra-medium -> 404 (never existed upstream)
    #   ml_IN-gayathri-medium -> 404 (never existed upstream)
    "ne_NP-google-medium": {
        "name": "Google (Nepali)",
        "language": "ne_NP", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ne/ne_NP/google/medium/ne_NP-google-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ne/ne_NP/google/medium/ne_NP-google-medium.onnx.json",
        "size_mb": 35,
    },
    "ar_JO-kareem-medium": {
        "name": "Kareem (Arabic)",
        "language": "ar_JO", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json",
        "size_mb": 35,
    },
    "zh_CN-huayan-medium": {
        "name": "Huayan (Mandarin Chinese)",
        "language": "zh_CN", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json",
        "size_mb": 35,
    },
    "vi_VN-vivos-x_low": {
        "name": "VIVOS (Vietnamese)",
        "language": "vi_VN", "quality": "x_low", "sample_rate": 16000,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vivos/x_low/vi_VN-vivos-x_low.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vivos/x_low/vi_VN-vivos-x_low.onnx.json",
        "size_mb": 10,
    },
    "es_ES-davefx-medium": {
        "name": "Davefx (Spanish)",
        "language": "es_ES", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json",
        "size_mb": 63,
    },
    "fr_FR-siwis-medium": {
        "name": "Siwis (French)",
        "language": "fr_FR", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json",
        "size_mb": 63,
    },
    "de_DE-thorsten-medium": {
        "name": "Thorsten (German)",
        "language": "de_DE", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json",
        "size_mb": 63,
    },
    "it_IT-riccardo-x_low": {
        "name": "Riccardo (Italian)",
        "language": "it_IT", "quality": "x_low", "sample_rate": 16000,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx.json",
        "size_mb": 10,
    },
    "pt_BR-faber-medium": {
        "name": "Faber (Brazilian Portuguese)",
        "language": "pt_BR", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json",
        "size_mb": 63,
    },
    "nl_NL-mls-medium": {
        "name": "MLS (Dutch)",
        "language": "nl_NL", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx.json",
        "size_mb": 63,
    },
    "pl_PL-mc_speech-medium": {
        "name": "MC Speech (Polish)",
        "language": "pl_PL", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/pl/pl_PL/mc_speech/medium/pl_PL-mc_speech-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/pl/pl_PL/mc_speech/medium/pl_PL-mc_speech-medium.onnx.json",
        "size_mb": 63,
    },
    "ru_RU-ruslan-medium": {
        "name": "Ruslan (Russian)",
        "language": "ru_RU", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium.onnx.json",
        "size_mb": 63,
    },
    "tr_TR-dfki-medium": {
        "name": "DFKI (Turkish)",
        "language": "tr_TR", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json",
        "size_mb": 63,
    },
    "sv_SE-nst-medium": {
        "name": "NST (Swedish)",
        "language": "sv_SE", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx.json",
        "size_mb": 63,
    },
    "hu_HU-anna-medium": {
        "name": "Anna (Hungarian)",
        "language": "hu_HU", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx.json",
        "size_mb": 63,
    },
    "uk_UA-ukrainian_tts-medium": {
        "name": "Ukrainian TTS (Ukrainian)",
        "language": "uk_UA", "quality": "medium", "sample_rate": 22050,
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx.json",
        "size_mb": 63,
    },
}

DEFAULT_VOICE = "en_US-amy-medium"


# Language-code → voice-id map.  Used by the tts_engine's Piper wrapper
# to pick the correct voice when a request arrives with only a `language`
# hint and no explicit `voice_id`.  Single source of truth — keep in sync
# with VOICE_PRESETS above.  Cross-platform: a Piper .onnx voice runs
# identically on Windows, macOS, Linux with zero system-voice dependency.
#
# Languages not in this map have no Piper voice upstream (notably Hindi,
# Telugu, Kannada, Bengali, Punjabi — Indian langs that rhasspy/piper-
# voices hasn't covered yet).  For those we keep the indic_parler path
# as the fallback in tts_engine._LANG_CAPABLE_BACKENDS.
LANG_TO_VOICE: dict[str, str] = {
    'en':    'en_US-amy-medium',
    'en_US': 'en_US-amy-medium',
    'en_GB': 'en_GB-alan-medium',
    # Tamil / Malayalam intentionally absent — no upstream Piper voice
    # (URLs 404).  These route through indic_parler instead; see the
    # comment block in VOICE_PRESETS above.
    'ne':    'ne_NP-google-medium',
    'ne_NP': 'ne_NP-google-medium',
    'ar':    'ar_JO-kareem-medium',
    'ar_JO': 'ar_JO-kareem-medium',
    'zh':    'zh_CN-huayan-medium',
    'zh_CN': 'zh_CN-huayan-medium',
    'vi':    'vi_VN-vivos-x_low',
    'vi_VN': 'vi_VN-vivos-x_low',
    'es':    'es_ES-davefx-medium',
    'es_ES': 'es_ES-davefx-medium',
    'fr':    'fr_FR-siwis-medium',
    'fr_FR': 'fr_FR-siwis-medium',
    'de':    'de_DE-thorsten-medium',
    'de_DE': 'de_DE-thorsten-medium',
    'it':    'it_IT-riccardo-x_low',
    'it_IT': 'it_IT-riccardo-x_low',
    'pt':    'pt_BR-faber-medium',
    'pt_BR': 'pt_BR-faber-medium',
    'nl':    'nl_NL-mls-medium',
    'nl_NL': 'nl_NL-mls-medium',
    'pl':    'pl_PL-mc_speech-medium',
    'pl_PL': 'pl_PL-mc_speech-medium',
    'ru':    'ru_RU-ruslan-medium',
    'ru_RU': 'ru_RU-ruslan-medium',
    'tr':    'tr_TR-dfki-medium',
    'tr_TR': 'tr_TR-dfki-medium',
    'sv':    'sv_SE-nst-medium',
    'sv_SE': 'sv_SE-nst-medium',
    'hu':    'hu_HU-anna-medium',
    'hu_HU': 'hu_HU-anna-medium',
    'uk':    'uk_UA-ukrainian_tts-medium',
    'uk_UA': 'uk_UA-ukrainian_tts-medium',
}


def voice_for_lang(lang: str | None) -> str:
    """Return the Piper voice_id for the given language code.

    Accepts BCP-47 ('ta-IN'), POSIX ('ta_IN') or bare ('ta') forms.
    Falls back to DEFAULT_VOICE when the language has no Piper voice
    registered — caller is responsible for capability-gating first so
    the DEFAULT_VOICE English fallback is never spoken aloud for a
    non-English language (see _LANG_CAPABLE_BACKENDS in tts_engine).
    """
    if not lang:
        return DEFAULT_VOICE
    normalized = lang.replace('-', '_')
    if normalized in LANG_TO_VOICE:
        return LANG_TO_VOICE[normalized]
    bare = normalized.split('_')[0]
    return LANG_TO_VOICE.get(bare, DEFAULT_VOICE)


class PiperTTS:
    """
    Piper TTS engine for local text-to-speech synthesis.

    Uses piper-tts Python library or piper executable for synthesis.
    Runs entirely on CPU, no GPU required.
    """

    def __init__(self,
                 voices_dir: str | None = None,
                 cache_dir: str | None = None,
                 default_voice: str = DEFAULT_VOICE):
        """
        Initialize Piper TTS.

        Args:
            voices_dir: Directory to store voice models
            cache_dir: Directory to cache generated audio
            default_voice: Default voice preset to use
        """
        home = Path.home()
        self.voices_dir = Path(voices_dir) if voices_dir else home / ".nunba" / "piper" / "voices"
        self.cache_dir = Path(cache_dir) if cache_dir else home / ".nunba" / "piper" / "cache"
        self.voices_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.default_voice = default_voice
        self.current_voice = default_voice
        self._piper_module = None
        self._synthesis_queue = queue.Queue()
        self._worker_thread = None
        self._running = False

        # Try to import piper-tts
        self._init_piper()

    def _init_piper(self):
        """Initialize piper-tts module"""
        try:
            import piper
            self._piper_module = piper
            logger.info("Piper TTS module loaded successfully")
        except ImportError:
            logger.warning("piper-tts not installed. Run: pip install piper-tts")
            self._piper_module = None

    def is_available(self) -> bool:
        """Check if Piper TTS is available"""
        return self._piper_module is not None or self._find_piper_executable() is not None

    def _find_piper_executable(self) -> str | None:
        """Find piper executable in system"""
        # Check common locations
        exe_name = "piper.exe" if sys.platform == "win32" else "piper"

        search_paths = [
            self.voices_dir.parent / exe_name,
            Path.home() / ".local" / "bin" / exe_name,
            Path("/usr/local/bin") / exe_name,
            Path("/usr/bin") / exe_name,
        ]

        for path in search_paths:
            if path.exists():
                return str(path)

        # Check PATH
        try:
            cmd = "where" if sys.platform == "win32" else "which"
            from tts._subprocess import hidden_startupinfo
            si, cf = hidden_startupinfo()
            result = subprocess.run(
                [cmd, "piper"],
                capture_output=True,
                text=True,
                startupinfo=si,
                creationflags=cf
            )
            if result.returncode == 0:
                return result.stdout.strip().split('\n')[0]
        except Exception:
            pass

        return None

    def get_voice_path(self, voice_id: str) -> tuple[Path | None, Path | None]:
        """
        Get paths to voice model and config files.

        Returns:
            Tuple of (model_path, config_path) or (None, None) if not found
        """
        model_path = self.voices_dir / f"{voice_id}.onnx"
        config_path = self.voices_dir / f"{voice_id}.onnx.json"

        if model_path.exists() and config_path.exists():
            return model_path, config_path
        return None, None

    def is_voice_installed(self, voice_id: str) -> bool:
        """Check if a voice is installed"""
        model_path, config_path = self.get_voice_path(voice_id)
        return model_path is not None and config_path is not None

    def download_voice(self,
                       voice_id: str,
                       progress_callback: Callable[[int, int], None] | None = None) -> bool:
        """
        Download a voice model.

        Args:
            voice_id: Voice preset ID from VOICE_PRESETS
            progress_callback: Optional callback(downloaded, total)

        Returns:
            True if successful
        """
        if voice_id not in VOICE_PRESETS:
            logger.error(f"Unknown voice: {voice_id}")
            return False

        if self.is_voice_installed(voice_id):
            logger.info(f"Voice {voice_id} already installed")
            return True

        preset = VOICE_PRESETS[voice_id]
        model_path = self.voices_dir / f"{voice_id}.onnx"
        config_path = self.voices_dir / f"{voice_id}.onnx.json"

        try:
            # Download model
            logger.info(f"Downloading voice model: {voice_id}")
            self._download_file(preset["url"], model_path, progress_callback)

            # Download config
            logger.info(f"Downloading voice config: {voice_id}")
            self._download_file(preset["config_url"], config_path)

            logger.info(f"Voice {voice_id} installed successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to download voice {voice_id}: {e}")
            # Clean up partial downloads
            model_path.unlink(missing_ok=True)
            config_path.unlink(missing_ok=True)
            return False

    def _download_file(self,
                       url: str,
                       dest_path: Path,
                       progress_callback: Callable[[int, int], None] | None = None):
        """Download a file with optional progress callback"""
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Nunba/1.0')

        with urllib.request.urlopen(req, timeout=60) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            downloaded = 0
            block_size = 1024 * 1024  # 1MB

            with open(dest_path, 'wb') as f:
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    f.write(buffer)
                    downloaded += len(buffer)
                    if progress_callback and total_size > 0:
                        progress_callback(downloaded, total_size)

    def list_installed_voices(self) -> list[str]:
        """List installed voice IDs"""
        voices = []
        for voice_id in VOICE_PRESETS:
            if self.is_voice_installed(voice_id):
                voices.append(voice_id)
        return voices

    def list_available_voices(self) -> dict[str, dict]:
        """List all available voice presets"""
        return VOICE_PRESETS.copy()

    def set_voice(self, voice_id: str) -> bool:
        """
        Set the current voice.

        Args:
            voice_id: Voice preset ID

        Returns:
            True if voice is available (installed or will be downloaded)
        """
        if voice_id not in VOICE_PRESETS:
            logger.error(f"Unknown voice: {voice_id}")
            return False

        self.current_voice = voice_id
        return True

    def synthesize(self,
                   text: str,
                   output_path: str | None = None,
                   voice_id: str | None = None,
                   speed: float = 1.0,
                   **_kwargs) -> str | None:
        """
        Synthesize text to speech.

        Args:
            text: Text to synthesize
            output_path: Output WAV file path (auto-generated if None)
            voice_id: Voice to use (uses current voice if None)
            speed: Speech speed multiplier (1.0 = normal)
            **_kwargs: Tolerated for polymorphic-signature parity with
                TTSEngine + the other backend adapters (all accept
                ``**kwargs``).  Callers like ``verified_synth`` pass
                ``language=lang`` so EVERY backend sees the same call;
                Piper is voice-scoped via ``voice_id`` so ``language``
                is informational here and deliberately ignored.  The
                handshake path (``tts/tts_handshake.py``) would
                otherwise TypeError against a raw PiperTTS instance —
                the J212 regression, 2026-04-18 live audit.

        Returns:
            Path to generated WAV file, or None on failure
        """
        if not text or not text.strip():
            logger.warning("Empty text provided")
            return None

        voice_id = voice_id or self.current_voice

        # Ensure voice is installed
        if not self.is_voice_installed(voice_id):
            logger.info(f"Voice {voice_id} not installed, downloading...")
            if not self.download_voice(voice_id):
                logger.error(f"Failed to install voice {voice_id}")
                return None

        # Generate output path if not provided
        if output_path is None:
            # Use text hash for caching
            text_hash = hashlib.md5(f"{text}:{voice_id}:{speed}".encode()).hexdigest()[:16]
            output_path = str(self.cache_dir / f"tts_{text_hash}.wav")

            # Return cached file if exists
            if os.path.exists(output_path):
                logger.debug(f"Using cached audio: {output_path}")
                return output_path

        model_path, config_path = self.get_voice_path(voice_id)

        # Try piper-tts module first
        if self._piper_module:
            try:
                return self._synthesize_with_module(text, output_path, model_path, speed)
            except Exception as e:
                logger.error(f"Module synthesis failed: {e}", exc_info=True)

        # Fallback to executable
        piper_exe = self._find_piper_executable()
        if piper_exe:
            try:
                return self._synthesize_with_executable(text, output_path, model_path, piper_exe, speed)
            except Exception as e:
                logger.error(f"Executable synthesis failed: {e}")

        logger.error("No synthesis method available")
        return None

    def _synthesize_with_module(self,
                                text: str,
                                output_path: str,
                                model_path: Path,
                                speed: float) -> str | None:
        """Synthesize using piper-tts module.

        Defensive WAV-format setup
        --------------------------
        ``piper.PiperVoice.synthesize_wav`` only sets the WAV header
        (``setnchannels`` / ``setsampwidth`` / ``setframerate``) on the
        FIRST audio chunk it produces.  When ``synthesize`` returns
        zero chunks — e.g. empty input after preprocessing, text that
        is purely unsupported characters, or an internal piper
        early-return — the format never gets set, and Python's
        ``wave.Wave_write.close()`` then raises the misleading
        ``# channels not specified`` error from the ``with`` block exit.

        The user-visible symptom (observed 2026-05-08 09:26:01) is
        ``Module synthesis failed: # channels not specified`` followed
        by ``No synthesis method available`` — the entire piper
        floor collapses, making TTS go silent.

        The fix is twofold and minimal:

        1. Pre-set the WAV header from ``voice.config.sample_rate``
           BEFORE calling piper.  Piper is canonically mono / 16-bit;
           sample rate is voice-specific and exposed on the loaded
           voice's config.  We pass ``set_wav_format=False`` so piper
           does NOT overwrite our headers when it does produce audio.
        2. After ``synthesize_wav`` returns, check that piper actually
           produced frames.  Zero frames now closes the file cleanly
           (valid empty WAV) and raises a clear, actionable error
           instead of the wave-module mask.

        This is a single canonical writer per the piper integration —
        callers above (``synthesize`` at line 322) keep the same
        contract: success ⇒ output_path, failure ⇒ exception that
        bubbles up to the executable-fallback path.
        """
        from piper import PiperVoice

        voice = PiperVoice.load(str(model_path))

        # Build synthesis config with speed control
        syn_config = None
        if speed != 1.0:
            try:
                from piper.config import SynthesisConfig
                syn_config = SynthesisConfig(length_scale=1.0 / speed)
            except (ImportError, TypeError):
                pass  # Speed control unavailable, use default

        # Resolve voice-specific sample rate; piper voices default to
        # 22050 Hz but each model can ship with its own (e.g. lessac is
        # 22050, libritts is 16000).  Read it from the loaded voice
        # config so we pre-set the right value.  Falls back to piper's
        # baseline 22050 if the attribute path drifts in a future
        # piper release — better a slightly off sample rate than a
        # crashed close().
        try:
            sample_rate = int(voice.config.sample_rate)
        except (AttributeError, TypeError, ValueError):
            sample_rate = 22050

        with wave.open(output_path, 'wb') as wav_file:
            # Defensive headers — see method docstring.  Set BEFORE
            # ``synthesize_wav`` so a zero-chunk synthesis still closes
            # the file cleanly with valid (but empty) WAV headers.
            wav_file.setnchannels(1)         # piper output is mono
            wav_file.setsampwidth(2)         # 16-bit signed PCM
            wav_file.setframerate(sample_rate)

            # ``set_wav_format=False`` tells piper to honour our
            # pre-set headers instead of re-setting them on the first
            # chunk.  This is the API contract added in piper-tts
            # 1.x; older releases ignore the kwarg gracefully (they
            # just re-set the same values we already set).
            voice.synthesize_wav(
                text, wav_file,
                syn_config=syn_config,
                set_wav_format=False,
            )

            n_frames = wav_file.getnframes()

        # Zero frames = piper returned no audio.  This is NOT the
        # caller's bug — text was probably empty after preprocessing or
        # contains only characters the voice can't produce.  Surface
        # a clear, recoverable error so the upstream fallback chain
        # can either retry with a different voice or fall through to
        # the executable path.  Without this check, the user sees
        # "TTS went silent" with no diagnostic.
        if n_frames == 0:
            try:
                os.unlink(output_path)
            except OSError:
                pass
            raise RuntimeError(
                f"Piper produced 0 audio frames for {len(text)}-char input "
                f"(voice={model_path.name}, sample_rate={sample_rate}). "
                f"Text may be empty after preprocessing or contain only "
                f"characters this voice cannot synthesize."
            )

        logger.info(
            f"Synthesized audio: {output_path} "
            f"({n_frames} frames @ {sample_rate} Hz)"
        )
        return output_path

    def _synthesize_with_executable(self,
                                    text: str,
                                    output_path: str,
                                    model_path: Path,
                                    piper_exe: str,
                                    speed: float) -> str | None:
        """Synthesize using piper executable"""
        # Create temp file for input text
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(text)
            text_file = f.name

        try:
            cmd = [
                piper_exe,
                '--model', str(model_path),
                '--output_file', output_path,
                '--length_scale', str(1.0 / speed)
            ]

            from tts._subprocess import hidden_startupinfo
            si, cf = hidden_startupinfo()

            # Pipe text to stdin
            with open(text_file) as f:
                result = subprocess.run(
                    cmd,
                    stdin=f,
                    capture_output=True,
                    text=True,
                    timeout=60,
                    startupinfo=si,
                    creationflags=cf
                )

            if result.returncode != 0:
                logger.error(f"Piper failed: {result.stderr}")
                return None

            logger.info(f"Synthesized audio: {output_path}")
            return output_path

        finally:
            os.unlink(text_file)

    def synthesize_async(self,
                         text: str,
                         callback: Callable[[str | None], None],
                         voice_id: str | None = None,
                         speed: float = 1.0):
        """
        Synthesize text asynchronously.

        Args:
            text: Text to synthesize
            callback: Callback function(audio_path) called when done
            voice_id: Voice to use
            speed: Speech speed
        """
        def worker():
            result = self.synthesize(text, voice_id=voice_id, speed=speed)
            callback(result)

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

    def clear_cache(self, max_age_hours: int = 24):
        """
        Clear old cached audio files.

        Args:
            max_age_hours: Remove files older than this many hours
        """
        import time

        now = time.time()
        max_age_seconds = max_age_hours * 3600

        for file in self.cache_dir.glob("tts_*.wav"):
            try:
                if now - file.stat().st_mtime > max_age_seconds:
                    file.unlink()
                    logger.debug(f"Removed cached file: {file}")
            except Exception as e:
                logger.warning(f"Failed to remove {file}: {e}")


# Global TTS instance
_tts_instance: PiperTTS | None = None


def get_tts() -> PiperTTS:
    """Get the global TTS instance"""
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = PiperTTS()
    return _tts_instance


def synthesize_text(text: str,
                    voice_id: str | None = None,
                    speed: float = 1.0) -> str | None:
    """
    Convenience function to synthesize text.

    Args:
        text: Text to synthesize
        voice_id: Voice preset ID (uses default if None)
        speed: Speech speed multiplier

    Returns:
        Path to WAV file or None on failure
    """
    return get_tts().synthesize(text, voice_id=voice_id, speed=speed)


def synthesize_text_async(text: str,
                          callback: Callable[[str | None], None],
                          voice_id: str | None = None,
                          speed: float = 1.0):
    """
    Convenience function for async synthesis.

    Args:
        text: Text to synthesize
        callback: Callback(audio_path) when done
        voice_id: Voice preset ID
        speed: Speech speed
    """
    get_tts().synthesize_async(text, callback, voice_id=voice_id, speed=speed)


def is_tts_available() -> bool:
    """Check if TTS is available"""
    return get_tts().is_available()


def install_default_voice(progress_callback: Callable[[int, int], None] | None = None) -> bool:
    """Install the default voice model"""
    return get_tts().download_voice(DEFAULT_VOICE, progress_callback)

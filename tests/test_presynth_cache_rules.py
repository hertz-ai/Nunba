"""
Deep functional tests for PreSynthCache — TTS audio caching.

Tests INTENDED BEHAVIOR:
- Cache key is MD5 of text+voice
- get() returns None for uncached, path for cached
- put() adds entry, evicts oldest on overflow
- Disk fallback: get() checks disk even if not in memory
- FILLERS list has common phrases
- presynth_background is non-blocking
- warm_fillers caches all fillers
- LRU eviction (oldest first)
- Thread safety (lock usage)
"""
import hashlib
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tts.tts_engine import PreSynthCache


# ==========================================================================
# 1. Initialization
# ==========================================================================
class TestCacheInit:
    def test_creates_cache_dir(self):
        with tempfile.TemporaryDirectory() as td:
            cache_dir = os.path.join(td, 'presynth')
            cache = PreSynthCache(cache_dir=cache_dir)
            assert os.path.isdir(cache_dir)

    def test_default_max_entries(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            assert cache._max == 50

    def test_custom_max_entries(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td, max_entries=100)
            assert cache._max == 100

    def test_empty_cache_on_init(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            assert len(cache._cache) == 0


# ==========================================================================
# 2. Hash Function
# ==========================================================================
class TestCacheHash:
    def test_hash_is_string(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h = cache._hash('hello', 'default')
            assert isinstance(h, str)

    def test_hash_length_16(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h = cache._hash('test text', 'voice1')
            assert len(h) == 16

    def test_same_input_same_hash(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h1 = cache._hash('hello world', 'en')
            h2 = cache._hash('hello world', 'en')
            assert h1 == h2

    def test_different_text_different_hash(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h1 = cache._hash('hello', 'default')
            h2 = cache._hash('world', 'default')
            assert h1 != h2

    def test_different_voice_different_hash(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h1 = cache._hash('hello', 'voice_a')
            h2 = cache._hash('hello', 'voice_b')
            assert h1 != h2

    def test_hash_is_md5_prefix(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h = cache._hash('test', 'default')
            expected = hashlib.md5(b'test|default').hexdigest()[:16]
            assert h == expected


# ==========================================================================
# 3. Get/Put
# ==========================================================================
class TestCacheGetPut:
    def test_get_uncached_returns_none(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            assert cache.get('not cached') is None

    def test_put_then_get_returns_path(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            fake_path = os.path.join(td, 'audio.wav')
            Path(fake_path).touch()
            cache.put('hello', fake_path)
            result = cache.get('hello')
            assert result == fake_path

    def test_get_checks_disk_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            h = cache._hash('disk test', 'default')
            disk_path = os.path.join(td, f'{h}.wav')
            Path(disk_path).touch()
            # Not in memory cache, but on disk
            result = cache.get('disk test')
            assert result == disk_path

    def test_get_returns_none_for_deleted_file(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            cache.put('gone', '/nonexistent/path.wav')
            result = cache.get('gone')
            assert result is None  # File doesn't exist


# ==========================================================================
# 4. Eviction
# ==========================================================================
class TestCacheEviction:
    def test_evicts_oldest_on_overflow(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td, max_entries=3)
            for i in range(4):
                path = os.path.join(td, f'audio_{i}.wav')
                Path(path).touch()
                cache.put(f'text_{i}', path)
            # First entry should be evicted
            assert cache.get('text_0') is None
            assert cache.get('text_3') is not None

    def test_max_entries_respected(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td, max_entries=5)
            for i in range(10):
                path = os.path.join(td, f'audio_{i}.wav')
                Path(path).touch()
                cache.put(f'text_{i}', path)
            assert len(cache._cache) <= 5

    def test_eviction_deletes_old_file(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td, max_entries=2)
            old_path = os.path.join(td, 'old.wav')
            Path(old_path).touch()
            cache.put('old', old_path)
            for i in range(3):
                p = os.path.join(td, f'new_{i}.wav')
                Path(p).touch()
                cache.put(f'new_{i}', p)
            # Old file should be deleted
            assert not os.path.exists(old_path)


# ==========================================================================
# 5. Fillers
# ==========================================================================
class TestFillers:
    def test_fillers_is_list(self):
        assert isinstance(PreSynthCache.FILLERS, list)

    def test_at_least_5_fillers(self):
        assert len(PreSynthCache.FILLERS) >= 5

    def test_fillers_are_english(self):
        for filler in PreSynthCache.FILLERS:
            assert isinstance(filler, str)
            assert len(filler) > 3

    def test_common_phrases_included(self):
        fillers_lower = [f.lower() for f in PreSynthCache.FILLERS]
        assert any('understand' in f for f in fillers_lower)
        assert any('think' in f for f in fillers_lower)

    def test_fillers_are_short(self):
        """Fillers should be brief (quick to synthesize)."""
        for filler in PreSynthCache.FILLERS:
            words = filler.split()
            assert len(words) <= 10, f"Filler too long: {filler}"


# ==========================================================================
# 6. Background Pre-synthesis
# ==========================================================================
class TestBackgroundPresynth:
    def test_presynth_is_nonblocking(self):
        """presynth_background should return immediately."""
        import time
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)

            def slow_synth(text, path, voice):
                time.sleep(10)  # Simulate slow TTS
                return path

            start = time.time()
            cache.presynth_background('test', 'default', slow_synth)
            elapsed = time.time() - start
            assert elapsed < 1.0, f"presynth_background blocked for {elapsed:.1f}s"

    def test_presynth_skips_cached(self):
        with tempfile.TemporaryDirectory() as td:
            cache = PreSynthCache(cache_dir=td)
            fake_path = os.path.join(td, 'existing.wav')
            Path(fake_path).touch()
            cache.put('already cached', fake_path)
            synth_fn = MagicMock()
            cache.presynth_background('already cached', 'default', synth_fn)
            # Should not call synth_fn since already cached
            import time
            time.sleep(0.1)
            synth_fn.assert_not_called()

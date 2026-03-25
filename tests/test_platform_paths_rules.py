"""
Deep functional tests for core/platform_paths.py.

Tests INTENDED BEHAVIOR of cross-platform directory resolution:
- Windows: ~/Documents/Nunba
- macOS: ~/Library/Application Support/Nunba
- Linux: ~/.config/nunba (or XDG_DATA_HOME)
- HARTOS OS: /var/lib/hartos
- Env overrides: NUNBA_DATA_DIR, HARTOS_DATA_DIR
- Subdirectory structure: data/, logs/, agent_data/, prompts/, memory_graph/
- Caching and reset
- ensure_data_dirs creates all needed dirs
"""
import os
import sys
import tempfile
from unittest.mock import patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core.platform_paths import (
    ensure_data_dirs,
    get_agent_data_dir,
    get_data_dir,
    get_db_dir,
    get_db_path,
    get_log_dir,
    get_memory_graph_dir,
    get_prompts_dir,
    reset_cache,
)


@pytest.fixture(autouse=True)
def clean_cache():
    """Reset cache before each test."""
    reset_cache()
    yield
    reset_cache()


# ==========================================================================
# 1. NUNBA_DATA_DIR Override (highest priority)
# ==========================================================================
class TestNunbaDataDirOverride:
    def test_override_takes_priority(self):
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '/custom/path'}):
            assert get_data_dir() == '/custom/path'

    def test_override_ignores_platform(self):
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '/my/data'}):
            with patch('core.platform_paths._IS_WINDOWS', True):
                reset_cache()
                assert get_data_dir() == '/my/data'

    def test_override_beats_hartos_dir(self):
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '/nunba', 'HARTOS_DATA_DIR': '/hartos'}):
            assert get_data_dir() == '/nunba'

    def test_empty_override_ignored(self):
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': ''}):
            result = get_data_dir()
            assert result != ''

    def test_whitespace_override_ignored(self):
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '   '}):
            result = get_data_dir()
            assert result.strip() != ''


# ==========================================================================
# 2. HARTOS_DATA_DIR Override (second priority)
# ==========================================================================
class TestHartosDataDirOverride:
    def test_hartos_dir_used_when_no_nunba_override(self):
        env = {'HARTOS_DATA_DIR': '/hartos/data'}
        # Remove NUNBA_DATA_DIR if set
        env_clean = {k: v for k, v in os.environ.items() if k != 'NUNBA_DATA_DIR'}
        env_clean.update(env)
        with patch.dict(os.environ, env_clean, clear=True):
            reset_cache()
            assert get_data_dir() == '/hartos/data'

    def test_empty_hartos_dir_ignored(self):
        with patch.dict(os.environ, {'HARTOS_DATA_DIR': ''}, clear=False):
            # Remove NUNBA_DATA_DIR
            os.environ.pop('NUNBA_DATA_DIR', None)
            reset_cache()
            result = get_data_dir()
            assert result != ''


# ==========================================================================
# 3. Windows Defaults
# ==========================================================================
class TestWindowsDefaults:
    def test_windows_uses_documents(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            with patch('core.platform_paths._IS_WINDOWS', True):
                with patch('core.platform_paths._IS_MACOS', False):
                    with patch('core.platform_paths._IS_LINUX', False):
                        reset_cache()
                        result = get_data_dir()
                        assert 'Documents' in result
                        assert 'Nunba' in result

    def test_windows_log_dir_under_data(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            with patch('core.platform_paths._IS_WINDOWS', True):
                with patch('core.platform_paths._IS_MACOS', False):
                    reset_cache()
                    log = get_log_dir()
                    assert 'logs' in log


# ==========================================================================
# 4. macOS Defaults
# ==========================================================================
class TestMacOSDefaults:
    def test_macos_uses_library(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            with patch('core.platform_paths._IS_WINDOWS', False):
                with patch('core.platform_paths._IS_MACOS', True):
                    with patch('core.platform_paths._IS_LINUX', False):
                        reset_cache()
                        result = get_data_dir()
                        assert 'Library' in result
                        assert 'Application Support' in result
                        assert 'Nunba' in result

    def test_macos_log_dir_in_library_logs(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            with patch('core.platform_paths._IS_WINDOWS', False):
                with patch('core.platform_paths._IS_MACOS', True):
                    reset_cache()
                    log = get_log_dir()
                    assert 'Library' in log
                    assert 'Logs' in log


# ==========================================================================
# 5. Linux Defaults
# ==========================================================================
class TestLinuxDefaults:
    def test_linux_uses_config(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            os.environ.pop('XDG_DATA_HOME', None)
            with patch('core.platform_paths._IS_WINDOWS', False):
                with patch('core.platform_paths._IS_MACOS', False):
                    with patch('core.platform_paths._IS_LINUX', True):
                        with patch('os.path.isfile', return_value=False):  # no /etc/hartos-release
                            reset_cache()
                            result = get_data_dir()
                            assert '.config' in result
                            assert 'nunba' in result

    def test_linux_respects_xdg(self):
        with patch.dict(os.environ, {'XDG_DATA_HOME': '/xdg/data'}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            os.environ.pop('HARTOS_DATA_DIR', None)
            with patch('core.platform_paths._IS_WINDOWS', False):
                with patch('core.platform_paths._IS_MACOS', False):
                    with patch('core.platform_paths._IS_LINUX', True):
                        with patch('os.path.isfile', return_value=False):
                            reset_cache()
                            result = get_data_dir()
                            assert result == os.path.join('/xdg/data', 'nunba')


# ==========================================================================
# 6. Subdirectory Structure
# ==========================================================================
class TestSubdirectoryStructure:
    def test_db_dir_is_under_data_dir(self):
        data = get_data_dir()
        db = get_db_dir()
        assert db.startswith(data), f"db_dir {db} must be under data_dir {data}"
        assert db == os.path.join(data, 'data')

    def test_db_path_default_filename(self):
        path = get_db_path()
        assert path.endswith('hevolve_database.db')
        assert get_db_dir() in path

    def test_db_path_custom_filename(self):
        path = get_db_path('my_db.sqlite')
        assert path.endswith('my_db.sqlite')

    def test_agent_data_under_db_dir(self):
        agent = get_agent_data_dir()
        assert agent == os.path.join(get_db_dir(), 'agent_data')

    def test_prompts_under_db_dir(self):
        prompts = get_prompts_dir()
        assert prompts == os.path.join(get_db_dir(), 'prompts')

    def test_memory_graph_under_db_dir(self):
        mg = get_memory_graph_dir()
        assert mg == os.path.join(get_db_dir(), 'memory_graph')

    def test_memory_graph_with_session_key(self):
        mg = get_memory_graph_dir('session_abc')
        assert mg.endswith(os.path.join('memory_graph', 'session_abc'))

    def test_memory_graph_empty_key_no_trailing_sep(self):
        mg = get_memory_graph_dir('')
        assert mg.endswith('memory_graph')


# ==========================================================================
# 7. Caching
# ==========================================================================
class TestCaching:
    def test_consecutive_calls_return_same(self):
        a = get_data_dir()
        b = get_data_dir()
        assert a == b

    def test_reset_cache_allows_new_value(self):
        a = get_data_dir()
        reset_cache()
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '/changed'}):
            b = get_data_dir()
        assert b == '/changed'
        assert a != b


# ==========================================================================
# 8. ensure_data_dirs
# ==========================================================================
class TestEnsureDataDirs:
    def test_creates_all_directories(self):
        with tempfile.TemporaryDirectory() as td:
            with patch.dict(os.environ, {'NUNBA_DATA_DIR': td}):
                reset_cache()
                ensure_data_dirs()
                assert os.path.isdir(get_db_dir())
                assert os.path.isdir(get_agent_data_dir())
                assert os.path.isdir(get_prompts_dir())
                assert os.path.isdir(get_log_dir())
                assert os.path.isdir(get_memory_graph_dir())

    def test_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            with patch.dict(os.environ, {'NUNBA_DATA_DIR': td}):
                reset_cache()
                ensure_data_dirs()
                ensure_data_dirs()  # second call should not fail
                assert os.path.isdir(get_db_dir())


# ==========================================================================
# 9. Return Types
# ==========================================================================
class TestReturnTypes:
    def test_all_return_strings(self):
        assert isinstance(get_data_dir(), str)
        assert isinstance(get_db_dir(), str)
        assert isinstance(get_db_path(), str)
        assert isinstance(get_agent_data_dir(), str)
        assert isinstance(get_prompts_dir(), str)
        assert isinstance(get_log_dir(), str)
        assert isinstance(get_memory_graph_dir(), str)

    def test_no_trailing_separator(self):
        """Paths should not end with os.sep (except root)."""
        for fn in [get_data_dir, get_db_dir, get_agent_data_dir, get_prompts_dir, get_log_dir]:
            path = fn()
            if len(path) > 3:  # skip "C:\" etc.
                assert not path.endswith(os.sep), f"{fn.__name__} ends with separator: {path}"

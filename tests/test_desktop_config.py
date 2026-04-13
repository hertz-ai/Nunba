"""
Functional tests for desktop/config.py

Tests cover:
- Environment detection (NUNBA_ENV, FLASK_ENV, frozen, dev fallback)
- Sentry DSN configuration (env override, default)
- Feature flags (crash reporting, performance monitoring, analytics)
- API endpoint configuration (base URL, local port)
- Path resolution (app_dir, data_dir, log_dir) across platforms
- Directory creation behavior
- App identity constants
"""
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# Fixture: import config with a clean environment
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _reload_config(**env_overrides):
    """Re-import desktop.config with custom environment variables."""
    import importlib
    with patch.dict(os.environ, env_overrides, clear=False):
        # Remove cached module so it re-evaluates module-level code
        if 'desktop.config' in sys.modules:
            del sys.modules['desktop.config']
        import desktop.config as cfg
        importlib.reload(cfg)
        return cfg


# ==========================================================================
# 1. Environment Detection
# ==========================================================================
class TestGetEnvironment:
    """get_environment() should respect NUNBA_ENV > FLASK_ENV > frozen > dev."""

    def test_nunba_env_takes_priority(self):
        cfg = _reload_config(NUNBA_ENV='staging')
        from desktop.config import get_environment
        with patch.dict(os.environ, {'NUNBA_ENV': 'staging'}):
            assert get_environment() == 'staging'

    def test_nunba_env_custom_value(self):
        from desktop.config import get_environment
        with patch.dict(os.environ, {'NUNBA_ENV': 'test'}):
            assert get_environment() == 'test'

    def test_flask_env_development(self):
        from desktop.config import get_environment
        with patch.dict(os.environ, {'FLASK_ENV': 'development'}, clear=False):
            env_backup = os.environ.pop('NUNBA_ENV', None)
            try:
                assert get_environment() == 'development'
            finally:
                if env_backup:
                    os.environ['NUNBA_ENV'] = env_backup

    def test_frozen_returns_production(self):
        from desktop.config import get_environment
        with patch.dict(os.environ, {}, clear=False):
            env_backup = os.environ.pop('NUNBA_ENV', None)
            flask_backup = os.environ.pop('FLASK_ENV', None)
            try:
                with patch.object(sys, 'frozen', True, create=True):
                    assert get_environment() == 'production'
            finally:
                if env_backup:
                    os.environ['NUNBA_ENV'] = env_backup
                if flask_backup:
                    os.environ['FLASK_ENV'] = flask_backup

    def test_default_is_development(self):
        from desktop.config import get_environment
        with patch.dict(os.environ, {}, clear=False):
            env_backup = os.environ.pop('NUNBA_ENV', None)
            flask_backup = os.environ.pop('FLASK_ENV', None)
            try:
                # Ensure not frozen
                if hasattr(sys, 'frozen'):
                    delattr(sys, 'frozen')
                assert get_environment() == 'development'
            finally:
                if env_backup:
                    os.environ['NUNBA_ENV'] = env_backup
                if flask_backup:
                    os.environ['FLASK_ENV'] = flask_backup

    def test_nunba_env_overrides_flask_env(self):
        from desktop.config import get_environment
        with patch.dict(os.environ, {'NUNBA_ENV': 'ci', 'FLASK_ENV': 'development'}):
            assert get_environment() == 'ci'


# ==========================================================================
# 2. Sentry DSN Configuration
# ==========================================================================
class TestSentryDSN:
    """SENTRY_DSN should be overridable via env and have a default."""

    def test_default_dsn_is_set(self):
        from desktop.config import SENTRY_DSN
        assert SENTRY_DSN is not None
        assert 'sentry.io' in SENTRY_DSN

    def test_env_override(self):
        with patch.dict(os.environ, {'SENTRY_DSN': 'https://custom@sentry.io/123'}):
            cfg = _reload_config(SENTRY_DSN='https://custom@sentry.io/123')
            assert cfg.SENTRY_DSN == 'https://custom@sentry.io/123'

    def test_dsn_is_string(self):
        from desktop.config import SENTRY_DSN
        assert isinstance(SENTRY_DSN, str)

    def test_dsn_starts_with_https(self):
        from desktop.config import SENTRY_DSN
        assert SENTRY_DSN.startswith('https://')


# ==========================================================================
# 3. Feature Flags
# ==========================================================================
class TestFeatureFlags:
    """Feature flags should parse env var booleans correctly."""

    def test_crash_reporting_default_false(self):
        cfg = _reload_config()
        # Default is 'false'
        assert cfg.CRASH_REPORTING_ENABLED is False

    def test_crash_reporting_enabled_true(self):
        cfg = _reload_config(NUNBA_CRASH_REPORTING='true')
        assert cfg.CRASH_REPORTING_ENABLED is True

    def test_crash_reporting_enabled_TRUE(self):
        cfg = _reload_config(NUNBA_CRASH_REPORTING='TRUE')
        assert cfg.CRASH_REPORTING_ENABLED is True

    def test_crash_reporting_enabled_True(self):
        cfg = _reload_config(NUNBA_CRASH_REPORTING='True')
        assert cfg.CRASH_REPORTING_ENABLED is True

    def test_crash_reporting_disabled_explicitly(self):
        cfg = _reload_config(NUNBA_CRASH_REPORTING='false')
        assert cfg.CRASH_REPORTING_ENABLED is False

    def test_crash_reporting_invalid_string_is_false(self):
        cfg = _reload_config(NUNBA_CRASH_REPORTING='yes')
        assert cfg.CRASH_REPORTING_ENABLED is False

    def test_performance_monitoring_default_true(self):
        cfg = _reload_config()
        assert cfg.PERFORMANCE_MONITORING_ENABLED is True

    def test_performance_monitoring_disabled(self):
        cfg = _reload_config(NUNBA_PERFORMANCE='false')
        assert cfg.PERFORMANCE_MONITORING_ENABLED is False

    def test_analytics_default_true(self):
        cfg = _reload_config()
        assert cfg.ANALYTICS_ENABLED is True

    def test_analytics_disabled(self):
        cfg = _reload_config(NUNBA_ANALYTICS='false')
        assert cfg.ANALYTICS_ENABLED is False


# ==========================================================================
# 4. API Endpoints
# ==========================================================================
class TestAPIEndpoints:
    """API URLs and ports should have sane defaults and be overridable."""

    def test_default_api_base_url(self):
        cfg = _reload_config()
        assert cfg.API_BASE_URL == 'https://hevolve.ai/api'

    def test_api_base_url_override(self):
        cfg = _reload_config(NUNBA_API_URL='http://localhost:9000/api')
        assert cfg.API_BASE_URL == 'http://localhost:9000/api'

    def test_default_local_port(self):
        cfg = _reload_config()
        assert cfg.LOCAL_BACKEND_PORT == 5000

    def test_local_port_override(self):
        cfg = _reload_config(NUNBA_LOCAL_PORT='8080')
        assert cfg.LOCAL_BACKEND_PORT == 8080

    def test_local_port_is_int(self):
        cfg = _reload_config()
        assert isinstance(cfg.LOCAL_BACKEND_PORT, int)


# ==========================================================================
# 5. App Identity Constants
# ==========================================================================
class TestAppIdentity:
    """App name, version, identifier should be set."""

    def test_app_name(self):
        from desktop.config import APP_NAME
        assert APP_NAME == "Nunba"

    def test_app_version_format(self):
        from desktop.config import APP_VERSION
        parts = APP_VERSION.split('.')
        assert len(parts) >= 2
        assert all(p.isdigit() for p in parts)

    def test_app_identifier_reverse_dns(self):
        from desktop.config import APP_IDENTIFIER
        assert APP_IDENTIFIER.startswith('com.')
        assert 'nunba' in APP_IDENTIFIER.lower()


# ==========================================================================
# 6. Path Resolution — get_app_dir()
# ==========================================================================
class TestGetAppDir:
    """get_app_dir() returns exe parent when frozen, __file__ parent otherwise."""

    def test_dev_mode_returns_desktop_dir(self):
        from desktop.config import get_app_dir
        # Not frozen → should return the directory containing config.py
        if hasattr(sys, 'frozen'):
            delattr(sys, 'frozen')
        result = get_app_dir()
        assert isinstance(result, Path)
        assert result.exists()

    def test_frozen_mode_returns_executable_parent(self):
        from desktop.config import get_app_dir
        with patch.object(sys, 'frozen', True, create=True):
            with patch.object(sys, 'executable', '/opt/nunba/Nunba'):
                result = get_app_dir()
                assert result == Path('/opt/nunba')


# ==========================================================================
# 7. Path Resolution — get_data_dir()
# ==========================================================================
class TestGetDataDir:
    """get_data_dir() should return platform-appropriate paths."""

    def test_windows_uses_appdata(self):
        from desktop.config import get_data_dir
        with patch('sys.platform', 'win32'):
            with patch.dict(os.environ, {'APPDATA': 'C:\\Users\\test\\AppData\\Roaming'}):
                result = get_data_dir()
                assert 'Nunba' in str(result)
                assert 'AppData' in str(result)

    def test_macos_uses_library(self):
        from desktop.config import get_data_dir
        with patch('sys.platform', 'darwin'):
            result = get_data_dir()
            assert 'Library' in str(result) or 'Application Support' in str(result)
            assert 'Nunba' in str(result)

    def test_linux_uses_dot_nunba(self):
        from desktop.config import get_data_dir
        with patch('sys.platform', 'linux'):
            result = get_data_dir()
            assert '.nunba' in str(result)

    def test_returns_path_object(self):
        from desktop.config import get_data_dir
        assert isinstance(get_data_dir(), Path)


# ==========================================================================
# 8. Path Resolution — get_log_dir()
# ==========================================================================
class TestGetLogDir:
    """get_log_dir() should return platform-appropriate log paths."""

    def test_windows_uses_documents(self):
        from desktop.config import get_log_dir
        with patch('sys.platform', 'win32'):
            result = get_log_dir()
            assert 'logs' in str(result).lower()

    def test_macos_uses_library_logs(self):
        from desktop.config import get_log_dir
        with patch('sys.platform', 'darwin'):
            result = get_log_dir()
            assert 'Logs' in str(result) or 'logs' in str(result)

    def test_linux_uses_dot_nunba_logs(self):
        from desktop.config import get_log_dir
        with patch('sys.platform', 'linux'):
            result = get_log_dir()
            assert '.nunba' in str(result)
            assert 'logs' in str(result)

    def test_returns_path_object(self):
        from desktop.config import get_log_dir
        assert isinstance(get_log_dir(), Path)


# ==========================================================================
# 9. Module-Level Directory Creation
# ==========================================================================
class TestDirectoryCreation:
    """DATA_DIR and LOG_DIR should be created on import."""

    def test_data_dir_exists(self):
        from desktop.config import DATA_DIR
        assert DATA_DIR.exists()

    def test_log_dir_exists(self):
        from desktop.config import LOG_DIR
        assert LOG_DIR.exists()

    def test_data_dir_is_directory(self):
        from desktop.config import DATA_DIR
        assert DATA_DIR.is_dir()

    def test_log_dir_is_directory(self):
        from desktop.config import LOG_DIR
        assert LOG_DIR.is_dir()

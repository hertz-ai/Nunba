"""
test_llama_config.py - Tests for llama_config.py (LLM configuration and server lifecycle).

Covers:
- LlamaConfig initialization and config read/write
- Config migration (context_size bump)
- Default config creation
- is_first_run / mark_first_run_complete
- get_llm_mode / is_cloud_configured
- get_selected_model_preset (valid/invalid indices)
- is_port_available / find_available_port
- check_server_type (mocked HTTP responses)
- chat_completion (mocked requests)
- scan_existing_llm_endpoints / scan_openai_compatible_ports
- ServerType enum values
"""
import json
import os
import sys
import socket
from unittest.mock import patch, MagicMock, PropertyMock

import pytest

# Ensure project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# Patch LlamaInstaller to avoid GPU detection / binary scanning
# ============================================================

@pytest.fixture(autouse=True)
def mock_installer():
    """
    Patch LlamaInstaller globally so LlamaConfig can be imported without
    triggering GPU detection, binary scanning, or file system probes.
    """
    mock = MagicMock()
    mock.gpu_available = "none"
    mock.binary_supports_gpu = False
    mock.find_llama_server.return_value = None
    mock.is_system_installation.return_value = False
    mock.get_version.return_value = None

    with patch("llama.llama_config.LlamaInstaller", return_value=mock):
        # Clear cached config singleton between tests
        import llama.llama_config as lc
        lc._cached_config = None
        yield mock


# ============================================================
# LlamaConfig class tests
# ============================================================

class TestLlamaConfigInit:
    """Test LlamaConfig initialization and config file handling."""

    def test_default_config_creation(self, tmp_config_dir):
        """When no config file exists, default config is created."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.config["first_run"] is True
        assert cfg.config["server_port"] == 8080
        assert cfg.config["use_gpu"] is False
        assert cfg.config["context_size"] == 8192

    def test_loads_existing_config(self, sample_llama_config):
        """When config file exists, it is loaded correctly."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=sample_llama_config)
        assert cfg.config["first_run"] is False
        assert cfg.config["server_port"] == 8080

    def test_context_size_migration(self, tmp_config_dir):
        """Configs with context_size < 8192 should be migrated to 8192."""
        from llama.llama_config import LlamaConfig
        config_file = os.path.join(tmp_config_dir, "llama_config.json")
        old_config = {
            "first_run": False,
            "context_size": 4096,
            "server_port": 8080,
        }
        with open(config_file, "w") as f:
            json.dump(old_config, f)

        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.config["context_size"] == 8192

        # Verify it was persisted
        with open(config_file) as f:
            saved = json.load(f)
        assert saved["context_size"] == 8192

    def test_save_config(self, tmp_config_dir):
        """_save_config writes changes to disk."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["server_port"] = 9999
        cfg._save_config()

        with open(cfg.config_file) as f:
            saved = json.load(f)
        assert saved["server_port"] == 9999

    def test_corrupted_config_falls_back_to_default(self, tmp_config_dir):
        """If config file is corrupted JSON, fall back to default."""
        from llama.llama_config import LlamaConfig
        config_file = os.path.join(tmp_config_dir, "llama_config.json")
        with open(config_file, "w") as f:
            f.write("NOT VALID JSON!!!")

        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.config["first_run"] is True  # default


class TestLlamaConfigFirstRun:
    """Test first_run flag management."""

    def test_is_first_run_true_by_default(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.is_first_run() is True

    def test_mark_first_run_complete(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.mark_first_run_complete()
        assert cfg.is_first_run() is False

        # Verify persisted
        with open(cfg.config_file) as f:
            saved = json.load(f)
        assert saved["first_run"] is False


class TestLlamaConfigModes:
    """Test LLM mode and cloud config checks."""

    def test_get_llm_mode_default(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.get_llm_mode() == "local"

    def test_get_llm_mode_cloud(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["llm_mode"] = "cloud"
        assert cfg.get_llm_mode() == "cloud"

    def test_is_cloud_configured_false(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        assert cfg.is_cloud_configured() is False

    def test_is_cloud_configured_true(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["cloud_provider"] = "openai"
        assert cfg.is_cloud_configured() is True


class TestModelPresetSelection:
    """Test model preset selection logic."""

    def test_valid_index_returns_preset(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        preset = cfg.get_selected_model_preset()
        # Index 0 should return the first preset (Qwen3-VL-2B)
        assert preset is not None
        assert hasattr(preset, "display_name")

    def test_invalid_index_returns_none(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["selected_model_index"] = 999
        assert cfg.get_selected_model_preset() is None

    def test_negative_index_returns_none(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["selected_model_index"] = -1
        assert cfg.get_selected_model_preset() is None


class TestPortDetection:
    """Test port availability and server detection."""

    def test_is_port_available_on_free_port(self, tmp_config_dir):
        """A randomly chosen free port should be available."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        # Bind and release to find a free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            free_port = s.getsockname()[1]
        assert cfg.is_port_available(free_port) is True

    def test_is_port_available_on_occupied_port(self, tmp_config_dir):
        """A port in use should not be available."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            occupied_port = s.getsockname()[1]
            # Port is held by `s`
            assert cfg.is_port_available(occupied_port) is False

    def test_find_available_port_success(self, tmp_config_dir):
        """find_available_port should return a port in the requested range."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        port = cfg.find_available_port(start_port=49152, max_attempts=20)
        assert port is not None
        assert 49152 <= port < 49172

    def test_find_available_port_returns_none_when_all_occupied(self, tmp_config_dir):
        """If all ports are occupied, should return None."""
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        with patch.object(cfg, "is_port_available", return_value=False):
            result = cfg.find_available_port(start_port=8080, max_attempts=3)
            assert result is None


class TestCheckServerType:
    """Test server type detection via mocked HTTP responses."""

    def test_nunba_managed_server(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig, ServerType
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"managed_by": "Nunba", "status": "ok"}

        with patch("llama.llama_config.requests.get", return_value=mock_resp):
            server_type, info = cfg.check_server_type(8080)
            assert server_type == ServerType.NUNBA_MANAGED
            assert info["managed_by"] == "Nunba"

    def test_external_llama_server(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig, ServerType
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "ok"}

        with patch("llama.llama_config.requests.get", return_value=mock_resp):
            server_type, info = cfg.check_server_type(8080)
            assert server_type == ServerType.EXTERNAL_LLAMA

    def test_not_running(self, tmp_config_dir):
        import requests as req
        from llama.llama_config import LlamaConfig, ServerType
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        with patch("llama.llama_config.requests.get", side_effect=req.exceptions.ConnectionError):
            server_type, info = cfg.check_server_type(8080)
            assert server_type == ServerType.NOT_RUNNING
            assert info is None

    def test_check_server_running_uses_config_port(self, tmp_config_dir):
        """check_server_running uses the configured port when none provided."""
        from llama.llama_config import LlamaConfig, ServerType
        cfg = LlamaConfig(config_dir=tmp_config_dir)
        cfg.config["server_port"] = 9999

        with patch.object(cfg, "check_server_type", return_value=(ServerType.NOT_RUNNING, None)) as mock:
            result = cfg.check_server_running()
            mock.assert_called_with(9999)
            assert result is False


class TestChatCompletion:
    """Test the chat_completion wrapper."""

    def test_chat_completion_returns_text(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        with patch.object(cfg, "check_server_running", return_value=True):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": "Hi there!"}}]
            }
            with patch("llama.llama_config.requests.post", return_value=mock_resp):
                result = cfg.chat_completion([{"role": "user", "content": "Hello"}])
                assert result == "Hi there!"

    def test_chat_completion_server_not_running(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        with patch.object(cfg, "check_server_running", return_value=False):
            result = cfg.chat_completion([{"role": "user", "content": "Hello"}])
            assert result is None

    def test_chat_completion_api_error(self, tmp_config_dir):
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig(config_dir=tmp_config_dir)

        with patch.object(cfg, "check_server_running", return_value=True):
            mock_resp = MagicMock()
            mock_resp.status_code = 500
            mock_resp.text = "Internal Server Error"
            with patch("llama.llama_config.requests.post", return_value=mock_resp):
                result = cfg.chat_completion([{"role": "user", "content": "Hello"}])
                assert result is None


class TestScanEndpoints:
    """Test endpoint scanning functions."""

    def test_scan_existing_finds_endpoint(self):
        from llama.llama_config import scan_existing_llm_endpoints

        mock_resp = MagicMock()
        mock_resp.status_code = 200

        with patch("llama.llama_config.requests.get", return_value=mock_resp):
            result = scan_existing_llm_endpoints()
            assert result is not None
            assert "name" in result
            assert "base_url" in result
            assert "type" in result

    def test_scan_existing_none_found(self):
        import requests as req
        from llama.llama_config import scan_existing_llm_endpoints

        with patch("llama.llama_config.requests.get", side_effect=req.exceptions.ConnectionError):
            result = scan_existing_llm_endpoints()
            assert result is None

    def test_scan_openai_ports_finds_endpoint(self):
        from llama.llama_config import scan_openai_compatible_ports

        mock_resp = MagicMock()
        mock_resp.status_code = 200

        with patch("llama.llama_config.requests.get", return_value=mock_resp):
            result = scan_openai_compatible_ports(ports=[12345])
            assert result is not None
            assert "12345" in result["base_url"]
            assert result["type"] == "openai"

    def test_scan_openai_ports_none_found(self):
        import requests as req
        from llama.llama_config import scan_openai_compatible_ports

        with patch("llama.llama_config.requests.get", side_effect=req.exceptions.ConnectionError):
            result = scan_openai_compatible_ports(ports=[12345])
            assert result is None


class TestServerType:
    """Test ServerType enum values."""

    def test_server_type_values(self):
        from llama.llama_config import ServerType
        assert ServerType.NOT_RUNNING == "not_running"
        assert ServerType.NUNBA_MANAGED == "nunba_managed"
        assert ServerType.EXTERNAL_LLAMA == "external_llama"
        assert ServerType.OTHER_SERVICE == "other_service"


class TestModuleLevelHelpers:
    """Test the module-level convenience functions."""

    def test_get_llama_endpoint(self, tmp_config_dir):
        from llama.llama_config import get_llama_endpoint, _get_cached_config
        import llama.llama_config as lc
        lc._cached_config = None  # reset singleton

        with patch("llama.llama_config.LlamaConfig") as MockCfg:
            instance = MagicMock()
            instance.config = {"server_port": 7777}
            MockCfg.return_value = instance
            lc._cached_config = None

            endpoint = get_llama_endpoint()
            assert "7777" in endpoint

    def test_check_llama_health_false_when_connection_error(self):
        import requests as req
        from llama import llama_config as lc
        lc._cached_config = None

        with patch("llama.llama_config.requests.get", side_effect=req.exceptions.ConnectionError):
            result = lc.check_llama_health()
            assert result is False

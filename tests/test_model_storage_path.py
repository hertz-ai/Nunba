"""
Tests for custom model storage path resolution, configuration, download routing,
and cross-platform foreground window detection.
"""
import os
import sys
import json
import shutil
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from models.catalog import ModelType, ModelEntry


def test_llama_installer_models_dir_priority(tmp_path):
    """Test priority order: explicit > env > config > default."""
    from llama.llama_installer import LlamaInstaller

    default_dir = os.path.expanduser("~/.nunba/models")
    fake_home = tmp_path / "fake_home"
    nunba_dir = fake_home / ".nunba"
    nunba_dir.mkdir(parents=True)
    config_file = nunba_dir / "llama_config.json"
    from_config_dir = tmp_path / "from_config"
    config_file.write_text(json.dumps({"models_dir": str(from_config_dir)}), encoding="utf-8")

    # 1. Default when no env and no config
    empty_home = tmp_path / "empty_home"
    (empty_home / ".nunba").mkdir(parents=True)
    with patch("pathlib.Path.home", return_value=empty_home):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("NUNBA_MODELS_DIR", None)
            inst = LlamaInstaller()
            assert os.path.abspath(inst.models_dir) == os.path.abspath(str(empty_home / ".nunba" / "models"))

    # 2. Config file models_dir
    with patch("pathlib.Path.home", return_value=fake_home):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("NUNBA_MODELS_DIR", None)
            inst = LlamaInstaller()
            assert os.path.abspath(inst.models_dir) == os.path.abspath(str(from_config_dir))

    # 3. Environment variable NUNBA_MODELS_DIR overrides config file
    from_env_dir = tmp_path / "from_env"
    with patch("pathlib.Path.home", return_value=fake_home):
        with patch.dict(os.environ, {"NUNBA_MODELS_DIR": str(from_env_dir)}):
            inst = LlamaInstaller()
            assert os.path.abspath(inst.models_dir) == os.path.abspath(str(from_env_dir))

    # 4. Explicit argument overrides everything
    explicit_dir = tmp_path / "explicit"
    with patch("pathlib.Path.home", return_value=fake_home):
        with patch.dict(os.environ, {"NUNBA_MODELS_DIR": str(from_env_dir)}):
            inst = LlamaInstaller(models_dir=str(explicit_dir))
            assert os.path.abspath(inst.models_dir) == os.path.abspath(str(explicit_dir))


def test_llama_installer_find_file_in_custom_and_default(tmp_path):
    """Verify _find_file_in_dirs searches custom models_dir and standard default."""
    from llama.llama_installer import LlamaInstaller

    custom_dir = tmp_path / "custom_models"
    custom_dir.mkdir()
    test_file = custom_dir / "qwen.gguf"
    test_file.write_text("x" * 1024)

    inst = LlamaInstaller(models_dir=str(custom_dir))
    found = inst._find_file_in_dirs("qwen.gguf", min_size=10)
    assert found is not None
    assert os.path.abspath(found) == os.path.abspath(str(test_file))


def test_llama_config_get_set_models_dir(tmp_path):
    """Test get_models_dir and set_models_dir with validation and persistence."""
    from llama.llama_config import LlamaConfig

    cfg = LlamaConfig(config_dir=str(tmp_path))

    # Initial default
    models_dir = cfg.get_models_dir()
    assert isinstance(models_dir, str)

    # Change models_dir to a valid custom directory
    target_dir = tmp_path / "external_drive" / "models"
    res = cfg.set_models_dir(str(target_dir))
    assert res["models_dir"] == str(target_dir.resolve())
    assert res["free_gb"] > 0
    assert res["total_gb"] > 0
    assert target_dir.exists()

    # Re-read config from disk to confirm persistence
    with open(tmp_path / "llama_config.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    assert os.path.abspath(data["models_dir"]) == os.path.abspath(str(target_dir))


def test_llama_loader_download_uses_custom_local_dir(tmp_path):
    """Test that LlamaLoader.download passes custom local_dir to installer and registers local_path."""
    from models.orchestrator import LlamaLoader

    custom_dest = str(tmp_path / "my_custom_drive")
    os.makedirs(custom_dest, exist_ok=True)

    entry = ModelEntry(
        id="test-custom-llm",
        name="Test LLM",
        model_type=ModelType.LLM,
        source="huggingface",
        repo_id="test/repo",
        files={"model": "model.gguf", "local_dir": custom_dest},
        backend="llama.cpp",
        vram_gb=2.0,
        ram_gb=4.0,
        disk_gb=1.0,
    )

    loader = LlamaLoader()

    with patch("llama.llama_installer.LlamaInstaller.download_model", return_value=True):
        with patch("models.catalog.ModelCatalog.register") as mock_reg:
            res = loader.download(entry)
            assert res is True
            expected_path = os.path.join(custom_dest, "model.gguf")
            assert os.path.abspath(entry.local_path) == os.path.abspath(expected_path)


def test_api_storage_path_get_and_post(tmp_path):
    """Test Flask /api/admin/models/storage-path GET and POST endpoints."""
    from main import app

    client = app.test_client()

    # GET
    resp = client.get("/api/admin/models/storage-path")
    assert resp.status_code == 200
    info = resp.get_json()
    assert "models_dir" in info
    assert "free_gb" in info
    assert "total_gb" in info

    # POST
    new_dir = str(tmp_path / "new_models_store")
    resp_post = client.post(
        "/api/admin/models/storage-path",
        json={"models_dir": new_dir},
        environ_base={"REMOTE_ADDR": "127.0.0.1"}
    )
    assert resp_post.status_code == 200
    post_info = resp_post.get_json()
    assert post_info["success"] is True
    assert os.path.abspath(post_info["models_dir"]) == os.path.abspath(new_dir)


def test_is_main_window_foreground_cross_platform():
    """Verify is_main_window_foreground handles Windows, macOS, and Linux cleanly."""
    import desktop.platform_utils as pu

    # 1. Win32 path
    with patch.object(pu, "IS_WINDOWS", True), \
         patch.object(pu, "IS_MACOS", False), \
         patch.object(pu, "IS_LINUX", False):
        mock_u32 = MagicMock()
        mock_u32.IsIconic.return_value = 0
        mock_u32.IsWindowVisible.return_value = 1
        mock_u32.GetForegroundWindow.return_value = 12345
        with patch("ctypes.windll.user32", mock_u32):
            assert pu.is_main_window_foreground(12345) is True
            assert pu.is_main_window_foreground(99999) is False

    # 2. Darwin path
    with patch.object(pu, "IS_WINDOWS", False), \
         patch.object(pu, "IS_MACOS", True), \
         patch.object(pu, "IS_LINUX", False):
        mock_appkit = MagicMock()
        mock_ws = MagicMock()
        mock_front = MagicMock()
        mock_front.processIdentifier.return_value = os.getpid()
        mock_ws.frontmostApplication.return_value = mock_front
        mock_appkit.NSWorkspace.sharedWorkspace.return_value = mock_ws

        mock_app = MagicMock()
        mock_key = MagicMock()
        mock_app.keyWindow.return_value = mock_key
        mock_appkit.NSApplication.sharedApplication.return_value = mock_app

        mock_win = MagicMock()
        mock_win.native = mock_key

        with patch.dict("sys.modules", {"AppKit": mock_appkit}):
            assert pu.is_main_window_foreground(mock_win) is True

            mock_win_other = MagicMock()
            mock_win_other.native = MagicMock()  # Not equal to mock_key
            mock_app.mainWindow.return_value = None
            assert pu.is_main_window_foreground(mock_win_other) is False

    # 3. Linux path
    with patch.object(pu, "IS_WINDOWS", False), \
         patch.object(pu, "IS_MACOS", False), \
         patch.object(pu, "IS_LINUX", True):
        mock_native = MagicMock()
        mock_native.is_active.return_value = True
        mock_win = MagicMock()
        mock_win.native = mock_native

        assert pu.is_main_window_foreground(mock_win) is True
        mock_native.is_active.return_value = False
        assert pu.is_main_window_foreground(mock_win) is False

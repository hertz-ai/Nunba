"""
test_ai_installer_llama_imports.py - desktop/ai_installer.py reaches llama/ the
way the bundle can.

Live failure (installed build, 2026-10-28): ``Nunba.exe --install-ai`` ended
``llama: FAILED`` in about a second.  ai_installer imported ``llama_config`` /
``llama_installer`` as TOP-LEVEL modules, but the bundle only has
``lib/llama/llama_config.pyc`` and puts the app dir, ``lib`` and ``lib_src`` on
sys.path (app.py), never ``lib/llama``.  ``find_spec('llama_config')`` on those
paths is None, so install_llama hit ImportError before its first progress line,
and the endpoint scan and detect_gpu's backend probe failed the same silent way.

Once the scan can run, it must not adopt Nunba's OWN llama-server as an
"external LLM" (use_external_llm=True pointing at :8080 suppresses the local
install, the regression llama_config.scan_openai_compatible_ports documents).
initialize_llama_on_first_run already checks for a local binary before it
scans; install_all follows the same order.
"""

import ast
import os
import sys
import tempfile
import types
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

AI_INSTALLER = os.path.join(PROJECT_ROOT, "desktop", "ai_installer.py")
_BARE_LLAMA_MODULES = {"llama_config", "llama_installer"}
_NO_GPU = {"available": False, "type": "none", "name": None, "vram_gb": 0}


def _imported_modules(path):
    with open(path, encoding="utf-8") as f:
        tree = ast.parse(f.read())
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            yield node.lineno, node.module
        elif isinstance(node, ast.Import):
            for alias in node.names:
                yield node.lineno, alias.name


def test_no_top_level_llama_imports():
    """Every llama import goes through the ``llama`` package, as app.py and
    main.py do — a bare name does not exist in the frozen bundle."""
    bare = [(line, mod) for line, mod in _imported_modules(AI_INSTALLER) if mod in _BARE_LLAMA_MODULES]
    assert not bare, f"bare llama imports in ai_installer.py: {bare}"


def _installer(tmpdir):
    from desktop.ai_installer import AIInstaller

    with patch("desktop.ai_installer.detect_gpu", return_value=dict(_NO_GPU)):
        return AIInstaller(base_dir=tmpdir, progress_callback=lambda m, p: None)


def test_install_llama_reaches_the_installer():
    """The live symptom: install_llama returned 'module not available'."""
    with tempfile.TemporaryDirectory() as tmpdir:
        installer = _installer(tmpdir)
        with patch(
            "llama.llama_installer.LlamaInstaller.find_llama_server",
            return_value=os.path.join(tmpdir, "llama-server.exe"),
        ):
            ok, msg = installer.install_llama(skip_model=True)
    assert ok, msg
    assert "not available" not in msg


def _fake_llama_config():
    """Stand-in for llama.llama_config: the real one imports HARTOS core and,
    through it, transformers — minutes on a loaded box, and not what is under
    test here."""
    mod = types.ModuleType("llama.llama_config")
    mod.scan_existing_llm_endpoints = MagicMock(
        return_value={
            "name": "LocalAI",
            "base_url": "http://localhost:8080",
            "completions": "http://localhost:8080/v1/completions",
            "type": "openai",
        }
    )
    mod.scan_openai_compatible_ports = MagicMock(return_value=None)
    mod.LlamaConfig = MagicMock()
    return mod


def _run_install_all(tmpdir, local_binary):
    installer = _installer(tmpdir)
    cfg = _fake_llama_config()
    with (
        patch("llama.llama_installer.LlamaInstaller.find_llama_server", return_value=local_binary),
        patch.object(installer, "install_llama", return_value=(True, "installed")) as install_llama,
        patch.dict("sys.modules", {"llama.llama_config": cfg, "integrations.service_tools.whisper_tool": None}),
    ):
        ok, results = installer.install_all(skip_tts=True)
    return ok, results, cfg.scan_existing_llm_endpoints, cfg.LlamaConfig, install_llama


def test_local_binary_skips_the_endpoint_scan():
    """With a local llama-server binary the scan would only find Nunba's own
    server; it must not run, and the local install must proceed."""
    with tempfile.TemporaryDirectory() as tmpdir:
        ok, results, scan, cfg_cls, install_llama = _run_install_all(
            tmpdir, local_binary=os.path.join(tmpdir, "llama-server.exe")
        )
    assert ok
    scan.assert_not_called()
    cfg_cls.assert_not_called()
    install_llama.assert_called_once()
    assert results["external_llm"] is None
    assert results["components"]["llama"] == {"success": True, "message": "installed"}


def test_no_local_binary_still_adopts_an_external_llm():
    """No local install: a running Ollama/LM Studio is still found and used."""
    with tempfile.TemporaryDirectory() as tmpdir:
        ok, results, scan, cfg_cls, install_llama = _run_install_all(tmpdir, local_binary=None)
    assert ok
    scan.assert_called_once()
    install_llama.assert_not_called()
    assert results["external_llm"]["name"] == "LocalAI"
    assert results["components"]["llama"]["skipped"] is True
    saved = cfg_cls.return_value.config
    assert saved.__setitem__.call_args_list[-1].args == ("use_external_llm", True)

"""
conftest.py - Shared pytest fixtures for Nunba backend tests.

Provides:
- Flask test client (isolated from main.py side-effects)
- Temp directory fixtures for config files
- Mock LLM server fixture
- Auth token fixture (register + login to get JWT)
"""
import atexit
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

import pytest

# Ensure project root is on sys.path so imports work
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# A test run starts no model server and keeps out of the person's ~/.nunba.
# ---------------------------------------------------------------------------
# Both halves are set here, when this file is imported, and stay for the whole
# process.  They cannot be fixtures: POST /chat with no model up answers at
# once and hands the start to a background thread
# (routes/chatbot_routes.py -> ModelOrchestrator.ensure_loaded_async ->
# models/orchestrator.py LlamaLoader.load), and that thread reaches the config
# write and the spawn seconds after the test that caused it has ended and its
# fixtures are undone.  On 21 Nov 2026 two runs of
# tests/test_chatbot_routes.py each left a real llama-server holding 4 GB of
# video memory and rewrote the owner's ~/.nunba/llama_config.json.
# tests/test_a_test_run_starts_no_model_server.py pins both halves.

class ModelServerStartRefused(OSError):
    """A test tried to start a real model server.  An OSError, as a start
    that fails is anywhere else, so code that copes with a binary that will
    not run copes with this the same way."""


def _starts_a_model_server(args) -> bool:
    """Is this command line a llama-server start?  Only the program being
    run counts: `taskkill /IM llama-server.exe` names one and starts none."""
    if isinstance(args, (bytes, bytearray)):
        args = bytes(args).decode(errors='replace')
    if isinstance(args, os.PathLike):
        args = os.fspath(args)
    if isinstance(args, str):
        first = re.match(r'\s*(?:"([^"]*)"|(\S+))', args)
        program = (first.group(1) or first.group(2)) if first else ''
    else:
        try:
            program = next(iter(args), '')
        except TypeError:
            return False
    if isinstance(program, (bytes, bytearray)):
        program = bytes(program).decode(errors='replace')
    name = re.split(r'[\\/]', str(program))[-1].lower()
    return name == 'llama-server' or name.startswith('llama-server.')


if not getattr(subprocess.Popen, 'refuses_model_servers', False):
    class _NoModelServerPopen(subprocess.Popen):
        """subprocess.Popen for a test process: every program starts as it
        always did, except llama-server.  A test that checks a start swaps
        subprocess.Popen for its own double, as before, and never gets here."""

        refuses_model_servers = True

        def __init__(self, args, *rest, **kwargs):
            if _starts_a_model_server(args):
                raise ModelServerStartRefused(
                    f'a test run does not start a real model server ({args!r}). '
                    'To check a start, replace subprocess.Popen in the test '
                    'with a double (unittest.mock.patch) and read its calls.')
            super().__init__(args, *rest, **kwargs)

    subprocess.Popen = _NoModelServerPopen

if not os.environ.get('NUNBA_TEST_HOME'):
    # Read by llama.llama_installer._home_dir: the person's home, then the
    # folder that stands in for it.
    _private_home = tempfile.mkdtemp(prefix='nunba_test_home_')
    atexit.register(shutil.rmtree, _private_home, ignore_errors=True)
    os.environ['NUNBA_TEST_HOME'] = os.pathsep.join(
        [os.path.expanduser('~'), _private_home])


# ── Layer 1: synthetic CUDA fixtures for GPU-path coverage on CPU runners ──
# Re-export synthetic_cuda / synthetic_cuda_* fixtures from conftest_cuda_mock
# so any test can request them without extra imports.
from tests.conftest_cuda_mock import (  # noqa: E402,F401  (pytest fixture re-export)
    synthetic_cuda,
    synthetic_cuda_high,
    synthetic_cuda_low,
    synthetic_cuda_mid,
    synthetic_cuda_oom,
)

# ---------------------------------------------------------------------------
# The owner's real tts_state.json is never a test's to write.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _private_tts_state_file(tmp_path, monkeypatch):
    """Point the TTS engine's persisted-demotion file at this test's tmp dir.

    A test that makes a backend fail drives the engine's real save path.
    Without this, that save wrote ~/Documents/Nunba/data/tts_state.json
    (2026-09-27 17:42:31: seven engines demoted for 7 days on the owner's
    machine by a test run).  tests/test_tts_state_isolation.py pins it.
    """
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))


# ---------------------------------------------------------------------------
# Temp directory for config files (llama_config, etc.)
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_config_dir(tmp_path):
    """Provide an isolated temp directory for config files."""
    config_dir = tmp_path / ".nunba"
    config_dir.mkdir()
    return str(config_dir)


@pytest.fixture
def sample_llama_config(tmp_config_dir):
    """Write a sample llama_config.json and return the dir path."""
    config_file = os.path.join(tmp_config_dir, "llama_config.json")
    config = {
        "first_run": False,
        "auto_start_server": True,
        "selected_model_index": 0,
        "server_port": 8080,
        "use_gpu": False,
        "context_size": 8192,
        "cloud_provider": None,
        "cloud_model": None,
        "llm_mode": "local",
        "llama_cpp_build": None,
    }
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)
    return tmp_config_dir


# ---------------------------------------------------------------------------
# Mock LLM HTTP server (simulates llama.cpp /v1/* and /health)
# ---------------------------------------------------------------------------

class MockLLMHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler that mimics llama.cpp server endpoints."""

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "ok"})
        elif self.path == "/v1/models":
            self._respond(200, {
                "object": "list",
                "data": [{"id": "mock-model", "object": "model"}]
            })
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b""
        if self.path == "/v1/chat/completions":
            self._respond(200, {
                "choices": [
                    {"message": {"role": "assistant", "content": "Hello from mock LLM!"}}
                ]
            })
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body_dict):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body_dict).encode())

    def log_message(self, *args):
        """Suppress log output during tests."""
        pass


@pytest.fixture
def mock_llm_server():
    """
    Start a mock LLM HTTP server on a random available port.

    Yields (host, port) tuple.  Server is shut down after the test.
    """
    server = HTTPServer(("127.0.0.1", 0), MockLLMHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield "127.0.0.1", port
    server.shutdown()


# ---------------------------------------------------------------------------
# Flask test client (lightweight -- avoids heavy main.py side-effects)
# ---------------------------------------------------------------------------

@pytest.fixture
def flask_app(tmp_path):
    """
    Create a minimal Flask app with chatbot_routes registered.

    This avoids importing main.py directly (which triggers argparse, logging,
    social init, etc.). Instead we create a bare Flask app and register only
    the chatbot routes.
    """
    from flask import Flask

    # Set required env vars before importing chatbot_routes
    os.environ.setdefault("HEVOLVE_DB_PATH", str(tmp_path / "test.db"))
    os.environ.setdefault("SOCIAL_RATE_LIMIT_DISABLED", "1")

    # Write minimal config.json and template.json that chatbot_routes expects
    config_json = tmp_path / "config.json"
    template_json = tmp_path / "template.json"
    config_json.write_text(json.dumps({"IP_ADDRESS": {}}))
    template_json.write_text(json.dumps({
        "abusive": ["Please be respectful."],
        "greet": ["Hello!"],
        "learn": ["What do you want to learn?"],
        "revise": ["What do you want to revise?"],
    }))

    app = Flask(__name__, static_folder=None)
    app.config["TESTING"] = True

    # Patch the config/template loading paths used by chatbot_routes
    # chatbot_routes uses script_dir to locate config.json/template.json.
    # We patch module-level variables after import.
    with patch.dict(os.environ, {
        "HEVOLVE_DB_PATH": str(tmp_path / "test.db"),
        "SOCIAL_RATE_LIMIT_DISABLED": "1",
    }):
        from routes import chatbot_routes as cr
        cr.register_routes(app)

    return app


@pytest.fixture
def client(flask_app):
    """Flask test client for making HTTP requests."""
    return flask_app.test_client()


# ---------------------------------------------------------------------------
# Auth token fixture (for endpoints that check auth)
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers():
    """Return Authorization headers with a test API token."""
    token = "test-api-token-12345"
    # Set the env var so require_local_or_token accepts it
    os.environ["NUNBA_API_TOKEN"] = token
    yield {"Authorization": f"Bearer {token}"}
    os.environ.pop("NUNBA_API_TOKEN", None)

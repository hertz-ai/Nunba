"""
conftest.py - Shared pytest fixtures for Nunba backend tests.

Provides:
- Flask test client (isolated from main.py side-effects)
- Temp directory fixtures for config files
- Mock LLM server fixture
- Auth token fixture (register + login to get JWT)
"""
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

import pytest

# Ensure project root is on sys.path so imports work
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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
# main.app is used once HARTOS has finished booting it, as a person would.
# ---------------------------------------------------------------------------

#: How long one session waits for HARTOS's social tables, once.
_HARTOS_SOCIAL_DB_WAIT_S = 180
_hartos_social_db_waited = False


def _hartos_social_api_ready() -> bool:
    """The social login route is on main.app AND its users table exists.

    Both, because either alone can be true early: the route is registered
    before the tables are made, and a box that ran before already has the
    tables in its data dir before the route is registered."""
    main_mod = sys.modules.get('main')
    app = getattr(main_mod, 'app', None)
    if app is None or '/api/social/auth/login' not in {
            r.rule for r in app.url_map.iter_rules()}:
        return False
    from integrations.social.models import get_engine
    from sqlalchemy import inspect
    try:
        return inspect(get_engine()).has_table('users')
    except Exception:  # noqa: BLE001 - mid-boot: not ready yet, ask again
        return False


@pytest.fixture(autouse=True)
def _hartos_social_db_ready():
    """Wait (once per session) until the HARTOS boot that ``import main``
    starts has created the social tables.

    The bootstrap thread registers the social routes at steps 2-3 and creates
    their tables at step 6 (hartos_bootstrap._run_bootstrap: init_db +
    run_migrations).  A test that posted to /api/social/auth/register before
    then got a 404 (no route yet) or "sqlite3.OperationalError: no such
    table: users" (route, no table): 175 tests on macOS in #72, where the
    thread ran slower than on ubuntu and windows.  The users table exists
    only after both, so it is the condition waited on; the steps after it
    (agent engine, supervisors) are not waited for.

    Acts only once something has started that thread (a fixture imported
    main), and stops waiting when the thread ends, whatever it managed.
    """
    global _hartos_social_db_waited
    if _hartos_social_db_waited:
        return
    boot = sys.modules.get('hartos.hartos_bootstrap')
    thread = boot.get_bootstrap_thread() if boot else None
    if thread is None:
        return
    _hartos_social_db_waited = True
    deadline = time.monotonic() + _HARTOS_SOCIAL_DB_WAIT_S
    while thread.is_alive() and time.monotonic() < deadline:
        if _hartos_social_api_ready():
            return
        time.sleep(0.5)


@pytest.fixture
def windll_exists_off_windows(monkeypatch):
    """`patch('ctypes.windll.user32')` needs `ctypes.windll` to exist, and
    it only exists on Windows.  CI runs these files on ubuntu and macOS too,
    where every such patch raised AttributeError before the test body ran.
    On Windows the real one is left alone.

    One definition for every file that patches a Win32 library by that
    dotted name (it lived in tests/test_glass.py alone, and test_companion_ux
    and test_model_storage_path hit the same failure): ask for it with
    ``pytestmark = pytest.mark.usefixtures('windll_exists_off_windows')``.
    """
    import ctypes
    from unittest.mock import MagicMock
    if not hasattr(ctypes, 'windll'):
        monkeypatch.setattr(ctypes, 'windll', MagicMock(), raising=False)


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

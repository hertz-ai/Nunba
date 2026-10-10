"""/upload/native: a local caller's file has no size cap; a remote caller
holding the API token keeps the 100 MB copy cap.

Owner, 2026-10-10: "local need not have a cap".  /upload/native copied at
most 100 MB for every caller, so a large book picked in the desktop's native
file dialog was refused with a 413.  HARTOS e7bf3d407 lifts the request-body
caps for a local caller the same way; "local" is HARTOS's one rule, through
routes.auth._is_local_request.
"""
import os
from pathlib import Path

import pytest
from flask import Flask

MB = 1024 * 1024


@pytest.fixture
def home(tmp_path, monkeypatch):
    """A user profile whose Documents folder the path guard accepts."""
    profile = tmp_path / 'profile'
    (profile / 'Documents').mkdir(parents=True)
    monkeypatch.setattr(Path, 'home', classmethod(lambda cls: profile))
    return profile


@pytest.fixture
def big_file(home):
    """101 MB, one more than the remote cap."""
    path = home / 'Documents' / 'big_notes.txt'
    with open(path, 'wb') as f:
        f.seek(101 * MB - 1)
        f.write(b'\0')
    return path


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.delenv('TRUSTED_PROXY', raising=False)
    monkeypatch.delenv('NUNBA_CI', raising=False)
    from routes import auth, upload_routes
    monkeypatch.setattr(upload_routes, 'FILE_DIR', tmp_path / 'files')
    (tmp_path / 'files').mkdir()
    monkeypatch.setattr(auth, 'API_TOKEN', 'test-token')
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.register_blueprint(upload_routes.upload_bp)
    c = app.test_client()
    c.files_dir = tmp_path / 'files'
    return c


def _post(client, path, remote_addr, token=None):
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    return client.post('/upload/native', json={'path': str(path), 'user_id': '42'},
                       environ_base={'REMOTE_ADDR': remote_addr}, headers=headers)


def test_a_local_file_over_the_remote_cap_is_copied(client, big_file):
    r = _post(client, big_file, '127.0.0.1')
    assert r.status_code == 200, r.get_json()
    copied = client.files_dir / r.get_json()['file_name']
    assert copied.stat().st_size == os.path.getsize(big_file)


def test_a_remote_token_holder_keeps_the_cap(client, big_file):
    r = _post(client, big_file, '10.9.8.7', token='test-token')
    assert r.status_code == 413
    assert r.get_json()['max_bytes'] == 100 * MB
    assert list(client.files_dir.iterdir()) == []


def test_a_remote_caller_without_the_token_is_refused(client, big_file):
    assert _post(client, big_file, '10.9.8.7').status_code == 401

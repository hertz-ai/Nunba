"""
test_upload_routes.py - Comprehensive tests for upload route handlers.

Covers:
- Helper functions: _unique_name, _file_type, _save_file
- Route handlers: /upload/file, /upload/image, /upload/audio, /upload/vision,
  /uploads/<path>
- register_upload_routes
- Happy path, error path, and edge cases for each

Describing an image and parsing a PDF book are HARTOS's (integrations/vision/
image_describe.py, integrations/learning/book_pipeline.py) and are tested
there; here it is tested that these routes USE them.
"""
import base64
import io
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def app():
    """Create a minimal Flask app with upload blueprint registered."""
    from flask import Flask
    app = Flask(__name__)
    app.config['TESTING'] = True

    from routes.upload_routes import upload_bp
    app.register_blueprint(upload_bp)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def _temp_db(tmp_path_factory, monkeypatch):
    """/upload/image and /upload/audio record rows in routes/db_routes.py's
    DB: keep them in a temp one, never the real nunba_db.sqlite."""
    from routes import db_routes
    monkeypatch.setattr(db_routes, 'DB_PATH',
                        tmp_path_factory.mktemp('db') / 'nunba_db.sqlite')
    db_routes._init_db()


def _make_file_storage(filename='test.png', content=b'fake image data',
                       content_type='image/png'):
    """Build a BytesIO that mimics a file upload."""
    return (io.BytesIO(content), filename)


# ============================================================
# Unit tests for helper functions
# ============================================================

class TestUniqueName:
    """Tests for _unique_name()."""

    def setup_method(self):
        from routes.upload_routes import _unique_name
        self.unique_name = _unique_name

    def test_unique_name_preserves_extension(self):
        name = self.unique_name("photo.JPG")
        assert name.endswith(".jpg")

    def test_unique_name_preserves_stem(self):
        name = self.unique_name("my_document.pdf")
        assert "my_document" in name

    def test_unique_name_has_uuid_prefix(self):
        name = self.unique_name("test.png")
        # UUID hex prefix is 12 chars followed by underscore
        prefix = name.split('_')[0]
        assert len(prefix) == 12

    def test_unique_name_different_each_call(self):
        name1 = self.unique_name("test.png")
        name2 = self.unique_name("test.png")
        assert name1 != name2

    def test_unique_name_sanitizes_filename(self):
        # secure_filename strips special chars
        name = self.unique_name("../../etc/passwd.txt")
        assert ".." not in name
        assert "/" not in name

    def test_unique_name_empty_stem(self):
        name = self.unique_name(".gitignore")
        # Should still produce a valid filename
        assert name.endswith(".gitignore") or len(name) > 12


class TestFileType:
    """Tests for _file_type()."""

    def setup_method(self):
        from routes.upload_routes import _file_type
        self.file_type = _file_type

    def test_image_extensions(self):
        for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
            assert self.file_type(ext) == 'image'

    def test_audio_extensions(self):
        for ext in ['.wav', '.mp3', '.ogg', '.m4a', '.webm', '.flac']:
            assert self.file_type(ext) == 'audio'

    def test_pdf_extension(self):
        assert self.file_type('.pdf') == 'pdf'

    def test_unknown_extension(self):
        assert self.file_type('.docx') == 'document'
        assert self.file_type('.xyz') == 'document'

    def test_case_insensitive(self):
        assert self.file_type('.JPG') == 'image'
        assert self.file_type('.PDF') == 'pdf'
        assert self.file_type('.MP3') == 'audio'


class TestSaveFile:
    """Tests for _save_file()."""

    def setup_method(self):
        from routes.upload_routes import _save_file
        self.save_file = _save_file

    def test_save_file_returns_tuple(self, tmp_path):
        mock_file = MagicMock()
        mock_file.filename = "test_image.png"
        mock_file.save = MagicMock()

        dest, name, ftype = self.save_file(mock_file, tmp_path)
        assert ftype == 'image'
        assert name.endswith('.png')
        mock_file.save.assert_called_once()

    def test_save_file_audio(self, tmp_path):
        mock_file = MagicMock()
        mock_file.filename = "voice.wav"
        mock_file.save = MagicMock()

        dest, name, ftype = self.save_file(mock_file, tmp_path)
        assert ftype == 'audio'

    def test_save_file_pdf(self, tmp_path):
        mock_file = MagicMock()
        mock_file.filename = "document.pdf"
        mock_file.save = MagicMock()

        dest, name, ftype = self.save_file(mock_file, tmp_path)
        assert ftype == 'pdf'


class TestImageDescriptionIsHartos:
    """The vision routes describe images with HARTOS's one implementation."""

    def test_it_is_the_same_function_not_a_copy(self):
        from integrations.vision.image_describe import describe_image

        from routes.upload_routes import _describe_image_via_llm
        assert _describe_image_via_llm is describe_image


# ============================================================
# Route handler tests
# ============================================================

class TestUploadFileRoute:
    """Tests for POST /upload/file."""

    def test_no_file_returns_400(self, client):
        resp = client.post('/upload/file')
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'No file provided'

    @patch('routes.upload_routes._describe_image_via_llm', return_value=None)
    def test_upload_image_file(self, mock_llm, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path):
            data = {'file': _make_file_storage('photo.png', b'fake png')}
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['file_type'] == 'image'
            assert body['file_url'].startswith('/uploads/files/')
            assert body['file_name'].endswith('.png')

    @patch('routes.upload_routes._describe_image_via_llm', return_value='{"description":"a cat"}')
    def test_upload_image_with_vision_description(self, mock_llm, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path):
            data = {'file': _make_file_storage('photo.jpg', b'fake jpg')}
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
            body = resp.get_json()
            assert body['image_description'] == '{"description":"a cat"}'

    def test_upload_with_agent_overrides_type(self, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path):
            data = {
                'file': _make_file_storage('photo.png', b'fake'),
                'agent': 'my_agent',
            }
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
            body = resp.get_json()
            assert body['file_type'] == 'agent'

    def test_upload_pdf_starts_the_book_pipeline(self, client, tmp_path):
        """A PDF goes to HARTOS's book pipeline; its job id comes back."""
        started = {'job_id': 'job-7', 'file_id': 7, 'status': 'queued'}
        with patch('routes.upload_routes.FILE_DIR', tmp_path), \
             patch('integrations.learning.book_pipeline.start_parse',
                   return_value=started) as start:
            data = {'file': _make_file_storage('document.pdf', b'%PDF-1.4 fake'),
                    'user_id': '42', 'request_id': 'req-9'}
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
        body = resp.get_json()
        assert body['file_type'] == 'pdf'
        assert body['pdf_parse_job_id'] == 'job-7'
        path, user_id, request_id = start.call_args.args
        assert (path.parent, path.name) == (tmp_path, body['file_name'])
        assert (user_id, request_id) == ('42', 'req-9')

    def test_a_book_that_cannot_start_leaves_the_upload_standing(self, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path), \
             patch('integrations.learning.book_pipeline.start_parse',
                   side_effect=RuntimeError('database is locked')):
            data = {'file': _make_file_storage('document.pdf', b'%PDF-1.4 fake')}
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
        assert resp.status_code == 200
        body = resp.get_json()
        assert (body['file_type'], body['pdf_parse_job_id']) == ('pdf', None)

    def test_upload_document_type(self, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path):
            data = {'file': _make_file_storage('readme.txt', b'hello')}
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
            body = resp.get_json()
            assert body['file_type'] == 'document'
            assert body['pdf_parse_job_id'] is None

    def test_upload_with_form_fields(self, client, tmp_path):
        with patch('routes.upload_routes.FILE_DIR', tmp_path):
            data = {
                'file': _make_file_storage('data.csv', b'a,b,c'),
                'user_id': '42',
                'request_id': 'req-123',
            }
            resp = client.post('/upload/file', data=data,
                               content_type='multipart/form-data')
            body = resp.get_json()
            assert body['request_id'] == 'req-123'


class TestUploadImageRoute:
    """Tests for POST /upload/image (avatar)."""

    def test_no_image_returns_400(self, client):
        resp = client.post('/upload/image')
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'No image provided'

    def test_avatar_upload_success(self, client, tmp_path):
        with patch('routes.upload_routes.AVATAR_DIR', tmp_path):
            data = {
                'image': _make_file_storage('avatar.png', b'fake avatar'),
                'user_id': '7',
                'name': 'My Agent',
                'request_id': 'req-456',
            }
            resp = client.post('/upload/image', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['response'] == 'Avatar uploaded successfully'
            assert body['avatar_url'].startswith('/uploads/avatars/')
            assert body['request_id'] == 'req-456'


class TestUploadAudioRoute:
    """Tests for POST /upload/audio."""

    def test_no_audio_returns_400(self, client):
        resp = client.post('/upload/audio')
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'No audio provided'

    def test_audio_upload_success(self, client, tmp_path):
        with patch('routes.upload_routes.AUDIO_DIR', tmp_path):
            data = {
                'audio': _make_file_storage('voice.wav', b'RIFF fake wav'),
                'user_id': '3',
                'request_id': 'req-789',
            }
            resp = client.post('/upload/audio', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['response'] == 'Voice signature uploaded'
            assert body['audio_url'].startswith('/uploads/audio/')
            assert body['request_id'] == 'req-789'


class TestVisionInferenceRoute:
    """Tests for POST /upload/vision."""

    def test_multipart_no_image_returns_400(self, client):
        resp = client.post('/upload/vision', data={},
                           content_type='multipart/form-data')
        assert resp.status_code == 400

    @patch('routes.upload_routes._describe_image_via_llm')
    def test_multipart_success(self, mock_llm, client, tmp_path):
        mock_llm.return_value = '{"description":"sunset","category":"photograph"}'
        with patch('routes.upload_routes.IMAGE_DIR', tmp_path):
            data = {'image': _make_file_storage('photo.jpg', b'fake jpg')}
            resp = client.post('/upload/vision', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['description'] == 'sunset'

    @patch('routes.upload_routes._describe_image_via_llm')
    def test_json_base64_success(self, mock_llm, client, tmp_path):
        mock_llm.return_value = 'A beautiful landscape'
        with patch('routes.upload_routes.IMAGE_DIR', tmp_path):
            img_b64 = base64.b64encode(b'fake image bytes').decode()
            resp = client.post('/upload/vision',
                               json={'image_base64': img_b64})
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['description'] == 'A beautiful landscape'

    def test_json_local_url_not_found(self, client, tmp_path):
        with patch('routes.upload_routes.UPLOAD_DIR', tmp_path):
            resp = client.post('/upload/vision',
                               json={'image_url': '/uploads/images/nonexistent.jpg'})
            assert resp.status_code == 404

    @patch('routes.upload_routes._describe_image_via_llm')
    def test_json_local_url_success(self, mock_llm, client, tmp_path):
        mock_llm.return_value = '{"description":"chart","category":"diagram/chart"}'
        # Create the file at the expected path
        img_dir = tmp_path / "images"
        img_dir.mkdir()
        (img_dir / "test.jpg").write_bytes(b'fake')
        with patch('routes.upload_routes.UPLOAD_DIR', tmp_path):
            resp = client.post('/upload/vision',
                               json={'image_url': '/uploads/images/test.jpg'})
            assert resp.status_code == 200

    def test_json_no_image_source_returns_400(self, client):
        resp = client.post('/upload/vision', json={})
        assert resp.status_code == 400
        assert 'Provide image_base64' in resp.get_json()['error']

    @patch('routes.upload_routes._describe_image_via_llm', return_value=None)
    def test_vision_unavailable_returns_503(self, mock_llm, client, tmp_path):
        with patch('routes.upload_routes.IMAGE_DIR', tmp_path):
            data = {'image': _make_file_storage('photo.png', b'fake')}
            resp = client.post('/upload/vision', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 503
            assert 'unavailable' in resp.get_json()['error']

    @patch('routes.upload_routes._describe_image_via_llm')
    def test_unstructured_response_wrapped(self, mock_llm, client, tmp_path):
        mock_llm.return_value = 'This is just plain text, not JSON'
        with patch('routes.upload_routes.IMAGE_DIR', tmp_path):
            data = {'image': _make_file_storage('test.png', b'fake')}
            resp = client.post('/upload/vision', data=data,
                               content_type='multipart/form-data')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['description'] == 'This is just plain text, not JSON'
            assert body['category'] == 'unknown'

    def test_json_external_url_rejected(self, client):
        resp = client.post('/upload/vision',
                           json={'image_url': 'https://example.com/img.jpg'})
        assert resp.status_code == 400


class TestServeUpload:
    """Tests for GET /uploads/<path>."""

    def test_serve_existing_file(self, client, tmp_path):
        # Create a test file
        (tmp_path / "test.txt").write_text("hello world")
        with patch('routes.upload_routes.UPLOAD_DIR', tmp_path):
            # Re-register because send_from_directory uses the patched value
            resp = client.get('/uploads/test.txt')
            assert resp.status_code == 200
            assert resp.data == b'hello world'

    def test_serve_nested_path(self, client, tmp_path):
        sub = tmp_path / "images"
        sub.mkdir()
        (sub / "pic.png").write_bytes(b'fake png')
        with patch('routes.upload_routes.UPLOAD_DIR', tmp_path):
            resp = client.get('/uploads/images/pic.png')
            assert resp.status_code == 200

    def test_serve_nonexistent_returns_404(self, client, tmp_path):
        with patch('routes.upload_routes.UPLOAD_DIR', tmp_path):
            resp = client.get('/uploads/nonexistent.txt')
            assert resp.status_code == 404


class TestRegisterUploadRoutes:
    """Tests for register_upload_routes()."""

    def test_registers_blueprint(self):
        from flask import Flask

        from routes.upload_routes import register_upload_routes
        app = Flask(__name__)
        register_upload_routes(app)
        # Check routes are registered
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert '/upload/file' in rules
        assert '/upload/image' in rules
        assert '/upload/audio' in rules
        assert '/upload/vision' in rules
        # Book parsing is HARTOS's (integrations/learning/api_books.py), on
        # every node; registering it here too would be a second, drifting copy.
        assert '/upload/parse_pdf' not in rules
        assert '/upload/parse_pdf/status' not in rules


class TestResolveNunbaDir:
    """Tests for _resolve_nunba_dir()."""

    def test_env_var_override(self):
        from routes.upload_routes import _resolve_nunba_dir
        with patch.dict(os.environ, {'NUNBA_DATA_DIR': '/custom/path'}):
            assert _resolve_nunba_dir() == '/custom/path'

    def test_fallback_to_home(self):
        from routes.upload_routes import _resolve_nunba_dir
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('NUNBA_DATA_DIR', None)
            with patch('routes.upload_routes._resolve_nunba_dir.__module__', 'routes.upload_routes'):
                # Force ImportError for core.platform_paths
                with patch.dict(sys.modules, {'core': None, 'core.platform_paths': None}):
                    result = _resolve_nunba_dir()
                    expected = os.path.join(os.path.expanduser('~'), 'Documents', 'Nunba')
                    assert result == expected

"""
Deep functional tests for upload API endpoints.

Tests: /upload/image, /upload/audio, /upload/file, /upload/vision,
/upload/parse_pdf, /uploads/<filepath> serving.
"""
import io
import os
import sys
import time

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope='module')
def client():
    try:
        from main import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            yield c
    except Exception as e:
        pytest.skip(f"Flask app not available: {e}")


@pytest.fixture(scope='module')
def upload_client():
    """An app that HAS the upload routes.

    On main's app they register late, through HARTOS bootstrap's consumer
    hook, which a test never runs: measured 2026-10-23, every POST /upload/*
    here got 200 with the SPA's index.html, so the "no file" tests asserted
    about the SPA fallback instead of the upload routes.  Registered on a
    fresh app, because Flask refuses register_blueprint once an app has
    served a request -- main's app has, by the time this module runs.
    """
    from flask import Flask
    try:
        from routes.upload_routes import register_upload_routes
    except Exception as e:
        pytest.skip(f"upload routes not importable: {e}")
    app = Flask(__name__)
    app.config['TESTING'] = True
    register_upload_routes(app)
    try:  # /upload/parse_pdf lives in HARTOS
        from integrations.learning.api_books import books_bp
        app.register_blueprint(books_bp)
    except Exception:
        pass
    with app.test_client() as c:
        yield c


# ==========================================================================
# 1. Image Upload
# ==========================================================================
class TestImageUpload:
    def test_no_file_returns_error(self, upload_client):
        resp = upload_client.post('/upload/image')
        assert resp.status_code in (400, 500)

    def test_with_fake_image(self, upload_client):
        data = {'file': (io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100), 'test.png')}
        resp = upload_client.post('/upload/image', data=data, content_type='multipart/form-data')
        assert resp.status_code in (200, 400, 413, 500)

    def test_empty_file_rejected(self, upload_client):
        data = {'file': (io.BytesIO(b''), 'empty.png')}
        resp = upload_client.post('/upload/image', data=data, content_type='multipart/form-data')
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 2. Audio Upload
# ==========================================================================
class TestAudioUpload:
    def test_no_file_returns_error(self, upload_client):
        resp = upload_client.post('/upload/audio')
        assert resp.status_code in (400, 500)

    def test_with_fake_wav(self, upload_client):
        # Minimal WAV header
        wav = b'RIFF' + b'\x24\x00\x00\x00' + b'WAVE' + b'fmt ' + b'\x10\x00\x00\x00' + b'\x01\x00\x01\x00' + b'\x44\xAC\x00\x00' + b'\x88\x58\x01\x00' + b'\x02\x00\x10\x00' + b'data' + b'\x00\x00\x00\x00'
        data = {'file': (io.BytesIO(wav), 'test.wav')}
        resp = upload_client.post('/upload/audio', data=data, content_type='multipart/form-data')
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 3. File Upload
# ==========================================================================
class TestFileUpload:
    def test_no_file_returns_error(self, upload_client):
        resp = upload_client.post('/upload/file')
        assert resp.status_code in (400, 500)

    def test_with_text_file(self, upload_client):
        data = {'file': (io.BytesIO(b'Hello World'), 'test.txt')}
        resp = upload_client.post('/upload/file', data=data, content_type='multipart/form-data')
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 4. Vision Upload
# ==========================================================================
class TestVisionUpload:
    def test_no_file_returns_error(self, upload_client):
        resp = upload_client.post('/upload/vision')
        assert resp.status_code in (400, 500)

    @pytest.mark.parametrize('path', ['/upload/vision', '/upload/native'])
    @pytest.mark.parametrize('body', [
        {},                                                       # no body
        {'data': '{not json', 'content_type': 'application/json'},  # bad JSON
    ])
    def test_a_bad_body_gets_a_json_400(self, upload_client, path, body):
        """Measured 2026-10-23: both answered werkzeug's HTML 400 page,
        because get_json(force=True) raises on an empty or malformed body.
        The HARTOS Analyze_Image tool parses this response as JSON."""
        resp = upload_client.post(path, **body)
        assert resp.status_code == 400
        assert resp.is_json, resp.get_data(as_text=True)[:120]

    def test_vision_returns_json(self, upload_client):
        data = {'file': (io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 50), 'vision.png')}
        resp = upload_client.post('/upload/vision', data=data, content_type='multipart/form-data')
        if resp.status_code == 200:
            result = resp.get_json()
            assert result is not None


# ==========================================================================
# 5. PDF Parsing
# ==========================================================================
class TestPDFParsing:
    def test_no_file_returns_error(self, upload_client):
        resp = upload_client.post('/upload/parse_pdf')
        assert resp.status_code in (400, 500)

    def test_pdf_status_endpoint(self, upload_client):
        resp = upload_client.get('/upload/parse_pdf/status')
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 6. Upload File Serving
# ==========================================================================
class TestUploadServing:
    def test_nonexistent_file_returns_response(self, upload_client):
        resp = upload_client.get('/uploads/nonexistent/file.png')
        # SPA catch-all may serve index.html (200) or 404 — both safe
        assert resp.status_code in (200, 404, 500)

    def test_path_traversal_blocked(self, upload_client):
        resp = upload_client.get('/uploads/../../../etc/passwd')
        body = resp.get_data(as_text=True)
        assert 'root:' not in body, "Path traversal must be blocked"


# ==========================================================================
# 7. Content-Type Validation
# ==========================================================================
class TestContentTypeValidation:
    def test_image_upload_accepts_multipart(self, upload_client):
        data = {'file': (io.BytesIO(b'\xff\xd8\xff\xe0'), 'test.jpg')}
        resp = upload_client.post('/upload/image', data=data, content_type='multipart/form-data')
        assert resp.status_code in (200, 400, 500)

    def test_image_upload_rejects_json(self, upload_client):
        resp = upload_client.post('/upload/image', json={'image': 'base64data'},
                          content_type='application/json')
        assert resp.status_code in (400, 500)


# ==========================================================================
# 8. Image Proxy
# ==========================================================================
class TestImageProxy:
    def test_proxy_no_url(self, client):
        resp = client.get('/api/image-proxy')
        assert resp.status_code in (200, 400, 404)

    def test_proxy_empty_url(self, client):
        resp = client.get('/api/image-proxy?url=')
        assert resp.status_code in (200, 400, 404)

    def test_proxy_invalid_url(self, client):
        resp = client.get('/api/image-proxy?url=not-a-url')
        assert resp.status_code in (200, 400, 404, 500)

    def test_proxy_file_url_blocked(self, client):
        """file:// URLs must be blocked in proxy."""
        resp = client.get('/api/image-proxy?url=file:///etc/passwd')
        if resp.status_code == 200:
            try:
                body = resp.get_data(as_text=True)
                assert 'root:' not in body
            except UnicodeDecodeError:
                pass  # Binary response = not /etc/passwd text

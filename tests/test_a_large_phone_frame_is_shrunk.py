"""A phone's camera frame larger than the frame store keeps is shrunk to
caption size, not refused.

Live 13 Nov 2026 14:42 IST, Nunba build 75 on the owner's desktop: the
owner's phone (Android DesktopCameraFrames, one frame in 2 s over the device
link) sent its camera's own JPEG frames; every one was answered 413
frame_too_large (the store keeps at most 512,000 bytes) and the phone stopped
offering frames for 30 s after each.  No phone frame reached the caption
model.  A frame the store cannot keep as sent is decoded and re-encoded at
most 640 px on its long side (the size the page's own camera sends and the
caption model reads); only a body that is no image, or one past the upload
ceiling, is refused.

Real route, real OpenCV, real JPEGs; the vision service is a stand-in store.

    python -m pytest tests/test_a_large_phone_frame_is_shrunk.py -q
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import pytest  # noqa: E402
from flask import Flask, g  # noqa: E402

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(60)

_PHONE_KEY = '3f9a1c0277deb4e1' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' + 'e7f8091a2b3c4d5e'
_OWNER = '10202'
_STORE_CAP = 512_000


def _camera_jpeg(width, height, quality=95):
    """A JPEG the size a phone camera sends: noise does not compress, so a
    1920x1080 frame at quality 95 is well over the store's cap."""
    rng = np.random.default_rng(7)
    img = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    assert ok
    return buf.tobytes()


class _Store:
    def __init__(self):
        self.frames = []

    def put_frame(self, user_id, frame, source=None):
        self.frames.append((user_id, frame, source))

    def put_screen_frame(self, user_id, frame, source=None):
        self.frames.append((user_id, frame, source))


class _Service:
    def __init__(self):
        self.store = _Store()


@pytest.fixture
def phone(monkeypatch):
    monkeypatch.delenv('NUNBA_CI', raising=False)
    svc = _Service()
    monkeypatch.setattr(cr, '_get_vision_service', lambda: svc)
    app = Flask(__name__)
    app.config['TESTING'] = True

    @app.before_request
    def _admitted_phone():
        # What security.middleware._admit_owner_allowed_device sets on a
        # phone the owner allowed.
        g.auth_source = 'device'
        g.device_public_key = _PHONE_KEY
        g.jwt_payload = {'user_id': _OWNER}

    cr.register_routes(app)
    client = app.test_client()

    def post(body):
        return client.post('/api/vision/frame?channel=camera', data=body,
                           content_type='image/jpeg',
                           environ_base={'REMOTE_ADDR': '192.168.0.43'})
    return post, svc.store


def test_a_camera_size_frame_is_kept_at_caption_size(phone):
    post, store = phone
    big = _camera_jpeg(1920, 1080)
    assert len(big) > _STORE_CAP
    resp = post(big)
    assert resp.status_code == 204, resp.get_data(as_text=True)
    assert len(store.frames) == 1
    user, kept, source = store.frames[0]
    assert user == _OWNER and source.startswith('device:')
    assert len(kept) <= _STORE_CAP
    img = cv2.imdecode(np.frombuffer(kept, np.uint8), cv2.IMREAD_COLOR)
    assert img is not None
    assert max(img.shape[:2]) <= 640
    # the picture keeps its shape: 16:9 stays 16:9
    assert abs(img.shape[1] / img.shape[0] - 1920 / 1080) < 0.02


def test_a_frame_that_already_fits_is_kept_as_sent(phone):
    post, store = phone
    small = _camera_jpeg(640, 480, quality=60)
    assert len(small) <= _STORE_CAP
    assert post(small).status_code == 204
    assert store.frames[0][1] == small


def test_a_big_body_that_is_no_image_is_still_refused(phone):
    post, store = phone
    resp = post(b'\xff\xd8' + b'x' * (_STORE_CAP + 10))
    assert resp.status_code == 413
    assert store.frames == []


def test_a_body_past_the_upload_ceiling_is_refused_unread(phone):
    post, store = phone
    resp = post(b'\xff\xd8' + b'x' * 9_000_000)
    assert resp.status_code == 413
    assert store.frames == []

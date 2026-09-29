"""Upload -> chat -> saved-image follow-up, using the real shared helpers."""
import ast
import io
from pathlib import Path
from unittest.mock import patch

import pytest
from flask import Flask
from integrations.vision import image_describe as vis
from routes import upload_routes as uploads


@pytest.fixture
def store(tmp_path, monkeypatch):
    from core import platform_paths
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path))
    monkeypatch.setattr(platform_paths, '_cached_data_dir', None)
    root = tmp_path / 'uploads'
    files = root / 'files'
    files.mkdir(parents=True)
    monkeypatch.setattr(uploads, 'UPLOAD_DIR', root)
    monkeypatch.setattr(uploads, 'FILE_DIR', files)
    monkeypatch.setattr(uploads, '_describe_image_via_llm', vis.describe_image)
    app = Flask(__name__)
    app.register_blueprint(uploads.upload_bp)
    return app.test_client(), root


def test_upload_chat_and_followup_share_analysis_and_saved_file(store):
    client, root = store
    with patch.object(vis, '_infer_image', side_effect=['a diagram', 'bottom label says TWO']) as infer:
        reply = client.post('/upload/file', data={'file': (io.BytesIO(b'image'), 'diagram.png')})
        assert reply.status_code == 200
        ref = reply.json['file_url']
        context = uploads.image_chat_context('What is this?', ref)
        assert 'a diagram' in context and ref in context
        assert infer.call_count == 1  # no second inference on chat
        # Exercise the existing tool's real local dispatch body, without
        # importing the server's heavy model/bootstrap dependencies.
        source = (Path(vis.__file__).parents[2] / 'hart_intelligence_entry.py').read_text(encoding='utf-8')
        function = next(n for n in ast.parse(source).body
                        if isinstance(n, ast.FunctionDef) and n.name == 'parse_image_to_text')
        namespace = {}
        exec(compile(ast.Module(body=[function], type_ignores=[]), '<image tool>', 'exec'), namespace)
        tool = namespace['parse_image_to_text']
        assert tool(ref + ', Read the bottom label, exactly') == 'bottom label says TWO'
        assert tool(ref + ', Read the bottom label, exactly') == 'bottom label says TWO'
        assert infer.call_count == 2
        assert infer.call_args.args[1] == 'Read the bottom label, exactly'


def test_text_only_context_does_not_use_vision():
    with patch.object(uploads, '_describe_image_via_llm', side_effect=AssertionError('vision called')):
        assert uploads.image_chat_context('hello', None) == 'hello'


def test_unavailable_vision_is_explicit_and_never_substitutes_a_screen(store):
    _, root = store
    (root / 'files' / 'a.png').write_bytes(b'image')
    with patch.object(vis, '_infer_image', return_value=None):
        context = uploads.image_chat_context('What is this?', '/uploads/files/a.png')
    assert 'currently unavailable' in context
    assert 'rather than substituting the screen' in context


def test_external_reference_keeps_existing_image_tool_route():
    with patch.object(uploads, '_describe_image_via_llm', side_effect=AssertionError('local inference')):
        context = uploads.image_chat_context('What is this?', 'https://example.com/image.png')
    assert 'https://example.com/image.png' in context
    assert 'Image_Inference_Tool' in context


def test_image_inspection_endpoint_rejects_path_escape(store):
    client, _ = store
    response = client.post('/upload/vision', json={'image_url': '/uploads/../outside.png'})
    assert response.status_code == 400


def test_current_chat_passes_cached_attachment_and_keeps_video_audio(store, monkeypatch):
    client, root = store
    from routes import chatbot_routes as cr
    from models import orchestrator
    from unittest.mock import MagicMock
    app = client.application
    app.add_url_rule('/chat', view_func=cr.chat_route, methods=['POST'])
    image = root / 'files' / 'chat.png'
    image.write_bytes(b'image')
    backend = MagicMock(return_value={'text': 'It is a diagram.', '_tier': 'direct'})
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', True)
    monkeypatch.setattr(cr, 'hevolve_chat', backend)
    monkeypatch.setattr(orchestrator, 'get_orchestrator', MagicMock(side_effect=RuntimeError('isolated catalog')))
    camera = MagicMock(side_effect=AssertionError('camera must not override attachment'))
    monkeypatch.setattr(cr, '_get_vision_service', camera)
    with patch.object(vis, '_infer_image', return_value='a diagram') as infer:
        vis.describe_image(str(image), cache=True)
        response = client.post('/chat', json={
            'text': 'What is this?', 'image_url': '/uploads/files/chat.png',
            'user_id': 'attachment_test', 'request_id': 'attachment_test_request',
            'media_mode': 'video',
        })
    assert response.status_code == 200, response.json
    assert response.json['text'] == 'It is a diagram.'
    assert 'a diagram' in backend.call_args.kwargs['text']
    assert '/uploads/files/chat.png' in backend.call_args.kwargs['text']
    assert backend.call_args.kwargs['media_mode'] == 'video'
    assert infer.call_count == 1
    camera.assert_not_called()


@pytest.mark.parametrize('image_url', ['/uploads/../outside.png', 123, True, {'url': 'image'}, ['image']])
def test_current_chat_rejects_invalid_attachment_before_backend(store, monkeypatch, image_url):
    client, _ = store
    from routes import chatbot_routes as cr
    from unittest.mock import MagicMock
    client.application.add_url_rule('/chat', view_func=cr.chat_route, methods=['POST'])
    backend = MagicMock(side_effect=AssertionError('escaped path reached backend'))
    monkeypatch.setattr(cr, 'hevolve_chat', backend)
    response = client.post('/chat', json={'text': 'What is this?', 'image_url': image_url})
    assert response.status_code == 400
    backend.assert_not_called()

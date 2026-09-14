"""Local file upload routes — replaces cloud MakeItTalk /upload_file, /upload_image, /upload_audio.

Handles:
  POST /upload/file       — generic file upload (image/pdf/audio) + Qwen Vision inference for images
  POST /upload/image      — agent avatar upload (save + optional toonify placeholder)
  POST /upload/audio      — agent voice signature upload
  POST /upload/vision     — standalone image→Qwen Vision inference (base64 or URL)
  POST /upload/native     — upload from a path picked in the native file dialog

A PDF uploaded here goes to HARTOS's book pipeline
(integrations/learning/book_pipeline.py), which also serves POST
/upload/parse_pdf and the book library on every HARTOS node, desktop or not.

All files stored under ~/Documents/Nunba/uploads/<type>/<uuid_name>
Served statically via /uploads/<path>
"""
import base64
import json
import logging
import os
import uuid
from pathlib import Path

from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

# Canonical auth gate for endpoints that accept LOCAL FILESYSTEM PATHS
# (vs multipart uploads).  Stacked above @upload_bp.route on
# /upload/native so the wrapped function is registered with Flask.
from routes.auth import require_local_or_token

logger = logging.getLogger(__name__)

upload_bp = Blueprint('upload', __name__)

# ── Storage paths (cross-platform) ──
def _resolve_nunba_dir():
    env = os.environ.get('NUNBA_DATA_DIR', '')
    if env:
        return env
    try:
        from core.platform_paths import get_data_dir
        return get_data_dir()
    except ImportError:
        return os.path.join(os.path.expanduser('~'), 'Documents', 'Nunba')

NUNBA_DIR = Path(_resolve_nunba_dir())
UPLOAD_DIR = NUNBA_DIR / 'uploads'
IMAGE_DIR = UPLOAD_DIR / 'images'
AUDIO_DIR = UPLOAD_DIR / 'audio'
FILE_DIR = UPLOAD_DIR / 'files'
AVATAR_DIR = UPLOAD_DIR / 'avatars'

for d in (IMAGE_DIR, AUDIO_DIR, FILE_DIR, AVATAR_DIR):
    d.mkdir(parents=True, exist_ok=True)

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
AUDIO_EXTS = {'.wav', '.mp3', '.ogg', '.m4a', '.webm', '.flac'}
PDF_EXTS = {'.pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


# ── Helpers ──

def _unique_name(original_filename):
    """Generate a collision-free filename preserving extension."""
    ext = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex[:12]}_{secure_filename(Path(original_filename).stem)}{ext}"


def _file_type(ext):
    ext = ext.lower()
    if ext in IMAGE_EXTS:
        return 'image'
    if ext in AUDIO_EXTS:
        return 'audio'
    if ext in PDF_EXTS:
        return 'pdf'
    return 'document'


def _save_file(file_obj, dest_dir):
    """Save uploaded file, return (saved_path, unique_name, file_type)."""
    name = _unique_name(file_obj.filename)
    ftype = _file_type(Path(file_obj.filename).suffix)
    dest = dest_dir / name
    file_obj.save(str(dest))
    return dest, name, ftype


# Describing an image is HARTOS's one implementation
# (integrations/vision/image_describe.py): the request body, the switch that
# keeps a reasoning model from spending its budget thinking, the empty-answer
# warning.  It moved there from this file so a node without Nunba can read
# images too.  The name stays because routes/chatbot_routes.py imports it from
# here.
try:
    from integrations.vision.image_describe import describe_image as _describe_image_via_llm
except ImportError as _e:
    # A HARTOS older than this Nunba.  Uploads still save and /upload/vision
    # answers 503 "unavailable", instead of this whole blueprint -- avatar,
    # audio and file uploads with it -- failing to import.
    logger.warning(f"Image description unavailable: {_e}")

    def _describe_image_via_llm(image_path, prompt=None):
        return None


def _start_book_parse(pdf_path, user_id, request_id):
    """Hand an uploaded PDF to HARTOS's book pipeline and return its job id.

    The pipeline (integrations/learning/book_pipeline.py) is the one
    implementation, run by every HARTOS node: it renders and reads the pages,
    stores the book, and publishes progress on com.hertzai.bookparsing.<user>;
    /upload/parse_pdf/status reports on the job.  It used to run here, where a
    node without Nunba could not reach it.  None when the parse could not be
    started -- the upload itself still stands.
    """
    try:
        from integrations.learning import book_pipeline
        return book_pipeline.start_parse(pdf_path, user_id, request_id).get('job_id')
    except Exception as e:
        logger.warning(f"Book parse not started for {pdf_path}: {e}")
        return None


# ── Routes ──

@upload_bp.route('/upload/file', methods=['POST'])
def upload_file():
    """Generic file upload (replaces MakeItTalk /upload_file).

    Accepts multipart form: file, user_id, request_id, prompt_id, agent.
    For images: runs Qwen Vision inference and returns description.
    """
    file_obj = request.files.get('file')
    if not file_obj:
        return jsonify({"error": "No file provided"}), 400

    user_id = request.form.get('user_id', '0')
    request_id = request.form.get('request_id', '')
    prompt_id = request.form.get('prompt_id')
    agent = request.form.get('agent')

    saved_path, name, ftype = _save_file(file_obj, FILE_DIR)
    logger.info(f"upload_file: {name} ({ftype}) for user {user_id}")

    # Override type for agent context
    if agent:
        ftype = 'agent'

    # Vision inference for images
    image_description = ""
    if ftype == 'image':
        desc = _describe_image_via_llm(str(saved_path))
        if desc:
            image_description = desc

    file_url = f"/uploads/files/{name}"

    # Auto-trigger PDF parsing when a PDF is uploaded
    pdf_job_id = _start_book_parse(saved_path, user_id, request_id) if ftype == 'pdf' else None

    return jsonify({
        'file_url': file_url,
        'file_name': name,
        'file_type': ftype,
        'request_id': request_id,
        'file_id': None,
        'text': image_description or None,
        'image_description': image_description,
        'pdf_parse_job_id': pdf_job_id,
    })


@upload_bp.route('/upload/image', methods=['POST'])
def upload_image():
    """Agent avatar upload (replaces MakeItTalk /upload_image/).

    Accepts multipart form: image, user_id, name, request_id, prompt_id.
    Saves avatar image. Toonify is a no-op locally (would need a separate model).
    """
    image_file = request.files.get('image')
    if not image_file:
        return jsonify({"error": "No image provided"}), 400

    user_id = request.form.get('user_id', '0')
    name_param = request.form.get('name', '')
    request_id = request.form.get('request_id', '')

    saved_path, name, _ = _save_file(image_file, AVATAR_DIR)
    logger.info(f"upload_image (avatar): {name} for user {user_id}")

    avatar_url = f"/uploads/avatars/{name}"

    return jsonify({
        "response": "Avatar uploaded successfully",
        "avatar_url": avatar_url,
        "file_name": name,
        "request_id": request_id,
    })


@upload_bp.route('/upload/audio', methods=['POST'])
def upload_audio():
    """Agent voice signature upload (replaces MakeItTalk /upload_audio).

    Accepts multipart form: audio, user_id, request_id.
    Saves audio file for voice cloning / signature.
    """
    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({"error": "No audio provided"}), 400

    user_id = request.form.get('user_id', '0')
    request_id = request.form.get('request_id', '')

    saved_path, name, _ = _save_file(audio_file, AUDIO_DIR)
    logger.info(f"upload_audio (voice sig): {name} for user {user_id}")

    audio_url = f"/uploads/audio/{name}"

    return jsonify({
        "response": "Voice signature uploaded",
        "audio_url": audio_url,
        "file_name": name,
        "request_id": request_id,
    })


@upload_bp.route('/upload/vision', methods=['POST'])
def vision_inference():
    """Standalone image → Qwen Vision inference.

    Accepts JSON: { image_base64, image_url, prompt }
    Or multipart form: image file + prompt.
    Used by HARTOS agents via Analyze_Image tool.
    """
    # Support both JSON and form upload
    if request.content_type and 'multipart' in request.content_type:
        image_file = request.files.get('image')
        prompt = request.form.get('prompt')
        if not image_file:
            return jsonify({"error": "No image provided"}), 400
        saved_path, name, _ = _save_file(image_file, IMAGE_DIR)
        desc = _describe_image_via_llm(str(saved_path), prompt)
    else:
        data = request.get_json(force=True)
        image_b64 = data.get('image_base64')
        image_url = data.get('image_url')
        prompt = data.get('prompt')

        if image_b64:
            # Decode and save temporarily
            img_bytes = base64.b64decode(image_b64)
            name = f"{uuid.uuid4().hex[:12]}.jpg"
            saved_path = IMAGE_DIR / name
            with open(saved_path, 'wb') as f:
                f.write(img_bytes)
            desc = _describe_image_via_llm(str(saved_path), prompt)
        elif image_url and image_url.startswith('/uploads/'):
            # Local file reference
            rel = image_url.replace('/uploads/', '')
            local_path = UPLOAD_DIR / rel
            if local_path.is_file():
                desc = _describe_image_via_llm(str(local_path), prompt)
            else:
                return jsonify({"error": f"File not found: {image_url}"}), 404
        else:
            return jsonify({"error": "Provide image_base64, image_url, or multipart image"}), 400

    if desc is None:
        return jsonify({
            "description": "",
            "error": "Vision inference unavailable (llama.cpp not running or model has no vision)",
        }), 503

    # Try to parse as JSON if the model returned structured output
    try:
        parsed = json.loads(desc)
        return jsonify(parsed)
    except (json.JSONDecodeError, TypeError):
        return jsonify({"description": desc, "category": "unknown"})


# ── Upload from native file-picker path (pywebview NSOpenPanel) ──

def _is_safe_user_path(file_path):
    """Reject path-traversal + arbitrary-filesystem reads.

    The pywebview native file dialog returns a path the user explicitly
    selected, but the request body is opaque — a malicious local process
    could POST `{path: "/etc/passwd"}` directly and we'd happily copy
    it into /uploads/files/passwd (web-accessible at /uploads/files/).
    Restrict to user-writable directories that a real file-picker
    selection would naturally land in.

    Returns (ok: bool, reason: str).
    """
    if not file_path:
        return False, 'empty path'
    try:
        resolved = Path(file_path).resolve(strict=True)
    except (OSError, RuntimeError) as e:
        return False, f'resolve failed: {e}'
    if not resolved.is_file():
        return False, 'not a file'
    # Reject symlinks — Path.resolve(strict=True) follows them, but a
    # symlink pointing into a user dir could be created by malware then
    # POSTed; refuse the link itself if it differs from its resolved.
    try:
        if Path(file_path).is_symlink():
            return False, 'symlinks rejected'
    except OSError:
        pass
    # Allowlist: common file-picker source directories on each OS.
    home = Path.home().resolve()
    allowed_roots = [
        home / 'Documents',
        home / 'Desktop',
        home / 'Downloads',
        home / 'Pictures',
        home / 'Movies',
        home / 'Music',
        # macOS-specific
        home / 'Public',
        # Windows-specific (Path.home is profile dir; these are siblings)
        home / 'OneDrive',
    ]
    resolved_str = str(resolved)
    for root in allowed_roots:
        try:
            root_resolved = root.resolve()
        except (OSError, RuntimeError):
            continue
        try:
            if resolved_str.startswith(str(root_resolved) + os.sep) or \
               resolved == root_resolved:
                return True, 'ok'
        except (OSError, ValueError):
            continue
    return False, f'path outside user dirs (resolved={resolved})'


@upload_bp.route('/upload/native', methods=['POST'])
@require_local_or_token
def upload_native():
    """Upload a file from a local path selected via pywebview file dialog.

    Accepts JSON: {path, user_id, request_id, upload_type}
    upload_type: 'image' or 'pdf' (default: auto-detect by extension)

    SECURITY:
    - @require_local_or_token: rejects non-loopback callers without
      a valid bearer token (decorator returns 401 JSON before view runs).
      Required because the request body is OPAQUE — without auth, any
      local process could POST `{path: "/etc/passwd"}` and a passing
      browser fetch could then GET /uploads/files/passwd.
    - _is_safe_user_path: rejects path-traversal + filesystem-allowlist
      bypass.  Confines accepted paths to user file-picker dirs
      (Documents, Desktop, Downloads, Pictures, Movies, Music, Public,
      OneDrive).  Symlinks rejected (anti-evasion).
    - 100MB copy cap: refuses disk-fill DoS via huge source files.

    Cross-OS: pywebview create_file_dialog returns a string path on
    every OS; this view consumes it uniformly.
    """
    data = request.get_json(force=True) or {}
    file_path = data.get('path', '')
    user_id = data.get('user_id', '0')
    request_id = data.get('request_id', '')

    # Path-traversal + filesystem-allowlist guard.
    _ok, _reason = _is_safe_user_path(file_path)
    if not _ok:
        return jsonify({'error': 'invalid path', 'reason': _reason}), 400

    src = Path(file_path).resolve(strict=True)
    ext = src.suffix.lower()
    ftype = _file_type(ext)
    name = _unique_name(src.name)

    import shutil
    if ftype == 'image':
        dest = IMAGE_DIR / name
    elif ftype == 'pdf':
        dest = FILE_DIR / name
    else:
        dest = FILE_DIR / name
    # Cap copy size — refuse to ingest files >100MB to prevent disk-fill
    # DoS via a malicious local process pointing at a giant local file.
    _MAX_COPY_BYTES = 100 * 1024 * 1024
    try:
        if src.stat().st_size > _MAX_COPY_BYTES:
            return jsonify({
                'error': 'file too large',
                'size_bytes': src.stat().st_size,
                'max_bytes': _MAX_COPY_BYTES,
            }), 413
    except OSError as e:
        return jsonify({'error': f'stat failed: {e}'}), 500
    shutil.copy2(str(src), str(dest))
    logger.info(f"upload_native: {name} ({ftype}) from {src}")

    image_description = ''
    if ftype == 'image':
        desc = _describe_image_via_llm(str(dest))
        if desc:
            image_description = desc

    subdir = 'images' if ftype == 'image' else 'files'
    file_url = f'/uploads/{subdir}/{name}'

    pdf_job_id = _start_book_parse(dest, user_id, request_id) if ftype == 'pdf' else None

    return jsonify({
        'file_url': file_url,
        'file_name': name,
        'file_type': ftype,
        'request_id': request_id,
        'file_id': None,
        'text': image_description or None,
        'image_description': image_description,
        'pdf_parse_job_id': pdf_job_id,
    })


# ── Static file serving ──

@upload_bp.route('/uploads/<path:filepath>')
def serve_upload(filepath):
    """Serve uploaded files from the local uploads directory."""
    return send_from_directory(str(UPLOAD_DIR), filepath)


# ── Registration helper ──

def register_upload_routes(app):
    """Register the upload blueprint with the Flask app."""
    app.register_blueprint(upload_bp)
    logger.info(
        "Upload routes registered: /upload/file, /upload/image, /upload/audio, "
        "/upload/vision"
    )
    logger.info(f"Upload storage: {UPLOAD_DIR}")

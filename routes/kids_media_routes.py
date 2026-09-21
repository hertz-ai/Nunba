"""
kids_media_routes.py — Agent-mediated media generation for Kids Learning Zone.

All generation goes through the Hive agent pipeline (hartos_backend_adapter)
with the existing 3-tier fallback:
  Tier-1: Direct in-process (pip install -e)
  Tier-2: HTTP proxy to HARTOS_BACKEND_URL (Docker, HARTOS, standalone)
  Tier-3: llama.cpp (no media tools → 503 fallback)

Routes:
  GET  /api/media/asset              — Serve or generate a media asset
  GET  /api/media/asset/status/<id>  — Poll async generation jobs
"""

import json
import logging
import os
import re
import threading
import time
import uuid

from flask import jsonify, request, send_file

logger = logging.getLogger(__name__)

# Module-level handles for the two things tests want to substitute via
# `patch.object(routes.kids_media_routes, 'adapter'|'req', <mock>)`
# OR `patch('routes.kids_media_routes.req.get', <mock>)`.
#
# `req` is eagerly bound to the requests module so the dotted-attribute
# patch form works (you can't `patch.attr` on a None placeholder).
# requests is a leaf dep with no circular risk at this module's import.
#
# `adapter` stays None by default — routes.hartos_backend_adapter pulls
# in HARTOS integrations and can cause circular-import timing issues if
# imported here; the function body lazy-imports on first real call.
import requests as req  # noqa: E402

adapter = None  # type: ignore[assignment]

# Lazy imports to avoid circular deps at module level
_tts_synthesize = None
_tts_available = False

# In-memory job tracker for async media generation (music/video)
_async_jobs = {}  # {job_id: {status, result_path, error, created}}
_jobs_lock = threading.Lock()

# Job TTL — clean up completed/failed jobs after 10 minutes
_JOB_TTL = 600
_MAX_JOBS = 500  # Cap in-memory jobs

# Input validation constants
_MAX_PROMPT_LEN = 500
_VALID_MEDIA_TYPES = ('image', 'tts', 'music', 'video')

# A game's background music: long enough to loop without being obvious.
_MUSIC_SECONDS = 60
# The capability's own engines take minutes on a busy GPU; past this the
# job is reported failed rather than held open (the caller polls).
_GENERATION_TIMEOUT_SECONDS = 300
_VALID_STYLES = ('cartoon', 'realistic', 'watercolor')
_VALID_CLASSIFICATIONS = (
    'public_educational', 'public_community', 'user_private',
    'agent_private', 'confidential',
)
_SPEED_MIN, _SPEED_MAX = 0.25, 4.0


def _cleanup_jobs():
    """Remove completed/failed jobs older than TTL.

    Uses a bounded lock acquire (5s) rather than `with _jobs_lock:` so a
    misbehaving background-job thread can never wedge a Flask request
    thread indefinitely.  If the lock is contended we simply skip this
    pass — cleanup is best-effort; the NEXT request will retry and jobs
    just stay in memory a bit longer.  Prevents pytest-timeout hangs
    when a test leaves a job thread alive across the fixture boundary.
    """
    now = time.time()
    acquired = _jobs_lock.acquire(timeout=5.0)
    if not acquired:
        logger.debug("_cleanup_jobs: _jobs_lock contended, skipping pass")
        return
    try:
        expired = [k for k, v in _async_jobs.items()
                   if now - v.get('created', 0) > _JOB_TTL]
        for k in expired:
            del _async_jobs[k]
    finally:
        _jobs_lock.release()


def _get_user_id_from_request():
    """
    Extract authenticated user_id from JWT Bearer token.
    Returns user_id string or None.
    For public_educational assets, None is acceptable (anonymous access).
    For private assets, caller must verify user_id is not None.
    """
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        try:
            import jwt as pyjwt
            token = auth.split(' ', 1)[1]
            # Load secret key (same as chatbot_routes)
            env_key = os.environ.get('SOCIAL_SECRET_KEY', '')
            if env_key and len(env_key) >= 32:
                secret_key = env_key
            else:
                db_path = os.environ.get('HEVOLVE_DB_PATH', '')
                if db_path and db_path != ':memory:' and os.path.isabs(db_path):
                    key_file = os.path.join(os.path.dirname(db_path), '.social_secret_key')
                else:
                    try:
                        from core.platform_paths import get_db_dir
                        key_file = os.path.join(get_db_dir(), '.social_secret_key')
                    except ImportError:
                        key_file = os.path.join(
                            os.path.expanduser('~'), 'Documents', 'Nunba', 'data', '.social_secret_key'
                        )
                secret_key = None
                if os.path.exists(key_file):
                    with open(key_file) as f:
                        k = f.read().strip()
                    if len(k) >= 32:
                        secret_key = k
            if secret_key:
                payload = pyjwt.decode(token, secret_key, algorithms=['HS256'])
                return payload.get('user_id') or payload.get('sub')
        except Exception as e:
            logger.debug(f"JWT decode in media routes: {e}")
    # Fallback: allow local requests without auth (dev mode)
    if request.remote_addr in ('127.0.0.1', '::1', 'localhost'):
        return request.args.get('user_id')
    return None


def _safe_send_file(cache_path, mimetype, media_cache_root):
    """send_file with realpath validation — prevent path traversal."""
    resolved = os.path.realpath(cache_path)
    cache_root_resolved = os.path.realpath(media_cache_root)
    if not resolved.startswith(cache_root_resolved):
        logger.warning("Path traversal blocked in send_file: %s", cache_path)
        return jsonify({'error': 'access_denied'}), 403
    return send_file(resolved, mimetype=mimetype, as_attachment=False, max_age=2592000)


def _get_tts():
    """Lazy-load TTS functions."""
    global _tts_synthesize, _tts_available
    if _tts_synthesize is None:
        try:
            from tts.tts_engine import get_tts_status, synthesize_text
            _tts_synthesize = synthesize_text
            status = get_tts_status()
            _tts_available = status.get('available', False)
        except ImportError:
            _tts_synthesize = lambda *a, **kw: None
            _tts_available = False
    return _tts_synthesize, _tts_available


def _get_classifier():
    """Lazy-load media classifier."""
    from desktop.media_classification import (
        MEDIA_CACHE_ROOT,
        cache_key,
        classifier,
        get_asset_meta,
        register_asset,
    )
    return classifier, cache_key, register_asset, get_asset_meta, MEDIA_CACHE_ROOT


def _generate_image_via_agent(prompt, user_id, style='cartoon'):
    """
    Generate an image through the Hive agent pipeline.
    Uses hartos_backend_adapter.chat() with media_request flag.
    This ensures guardrails, logging, and cultural wisdom apply.
    """
    try:
        # Honour module-level `adapter` override (tests do
        # `patch.object(routes.kids_media_routes, 'adapter', <mock>)`);
        # fall back to the real lazy import in production.
        _adapter = adapter
        if _adapter is None:
            import routes.hartos_backend_adapter as _adapter
        result = _adapter.chat(
            text=f"Generate a children's educational illustration: {prompt}. Style: {style}. Return only the image URL.",
            user_id=user_id or 'system',
            media_request=True,
        )
        # The agent's txt2img tool returns img_url in the response text
        response_text = result.get('text', '') or result.get('response', '')
        # Extract URL from response (agent typically returns the URL directly)
        import re
        urls = re.findall(r'https?://[^\s<>"\']+\.(?:png|jpg|jpeg|webp|gif)', response_text)
        if urls:
            return urls[0]
        # If response contains img_url JSON
        if 'img_url' in response_text:
            try:
                import json
                data = json.loads(response_text)
                return data.get('img_url')
            except (json.JSONDecodeError, TypeError):
                pass
        return None
    except Exception as e:
        logger.warning(f"Agent image generation failed: {e}")
        return None


def _download_and_cache(url, cache_path, timeout=30):
    """Download a URL and save to disk cache."""
    # `req` is the module-level requests binding — tests patch it (or
    # its .get) to substitute a mock client.
    try:
        resp = req.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, 'wb') as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
        return os.path.getsize(cache_path)
    except Exception as e:
        logger.warning(f"Failed to download {url}: {e}")
        if os.path.exists(cache_path):
            os.remove(cache_path)
        return 0


def media_asset():
    """
    GET /api/media/asset
    Serve a cached media asset or generate one through the agent pipeline.

    Auth: Optional for public assets, required for private assets.
    JWT Bearer token used to identify requesting user.

    Query params:
        prompt          - required, natural language description (max 500 chars)
        type            - image|tts|music|video (default: image)
        style           - cartoon|realistic|watercolor (default: cartoon)
        classification  - public_educational|user_private|... (default: public_educational)
        voice           - optional, TTS voice name
        speed           - optional, TTS speed (0.25-4.0)
    """
    # Periodic job cleanup
    _cleanup_jobs()

    prompt = request.args.get('prompt', '').strip()
    media_type = request.args.get('type', 'image').strip().lower()
    style = request.args.get('style', 'cartoon').strip()
    classification = request.args.get('classification', 'public_educational').strip()

    # --- Input validation ---
    if not prompt:
        return jsonify({'error': 'prompt parameter required'}), 400
    if len(prompt) > _MAX_PROMPT_LEN:
        return jsonify({'error': f'prompt too long (max {_MAX_PROMPT_LEN} chars)'}), 400

    if media_type not in _VALID_MEDIA_TYPES:
        return jsonify({'error': 'type must be image|tts|music|video'}), 400

    if style not in _VALID_STYLES:
        style = 'cartoon'  # default fallback

    if classification not in _VALID_CLASSIFICATIONS:
        classification = 'public_educational'  # don't let client escalate

    # --- A game's bound sound comes before composing anything ---
    #
    # An agent binds a game's music once, in CREATE (core/agent_tools.py
    # bind_game_sound), and REUSE must play that same music -- the one the
    # reviewer approved -- not a fresh composition that merely sounds
    # similar.  When the app asks on an agent's behalf it names the agent
    # and the game, and the binding answers.
    bound, matched = _bound_game_media(
        request.args.get('prompt_id'),
        request.args.get('game_id'),
        media_type,
        state=(request.args.get('state') or 'bgm').strip(),
        level=(request.args.get('level') or '').strip() or None,
        user_id=_get_user_id_from_request(),
    )
    if bound:
        return jsonify({'url': bound, 'bound': True, 'matched': matched}), 200
    if matched == 'composing':
        # the memo already holds a composition for this exact key, so the
        # caller waits for that one rather than starting a second
        return jsonify({'status': 'composing', 'matched': matched}), 202

    # --- Auth: extract user_id from JWT (not from query param) ---
    user_id = _get_user_id_from_request()

    # Private assets REQUIRE authentication
    if not classification.startswith('public') and not user_id:
        return jsonify({'error': 'Authentication required for private assets'}), 401

    classifier, ck, register, get_meta, cache_root = _get_classifier()

    # Build cache key
    sha = ck(prompt, media_type, style)
    ext_map = {'image': 'png', 'tts': 'wav', 'music': 'mp3', 'video': 'mp4'}
    ext = ext_map.get(media_type, 'bin')

    # Check access control on existing asset
    meta = get_meta(sha)
    if meta:
        if not classifier.can_access(meta, user_id):
            return jsonify({'error': 'access_denied', 'label': meta.get('label')}), 403

    # Determine cache path
    cache_path = classifier.get_cache_path(sha, media_type, classification,
                                           owner_id=user_id, ext=ext)

    # --- CACHE HIT ---
    if os.path.isfile(cache_path):
        mime_map = {'image': 'image/png', 'tts': 'audio/wav', 'music': 'audio/mpeg', 'video': 'video/mp4'}
        return _safe_send_file(cache_path,
                               mime_map.get(media_type, 'application/octet-stream'),
                               cache_root)

    # --- CACHE MISS: Generate ---

    if media_type == 'image':
        img_url = _generate_image_via_agent(prompt, user_id, style)
        if img_url:
            size = _download_and_cache(img_url, cache_path)
            if size > 0:
                register(sha, media_type, classification, prompt, size, user_id, ext)
                return _safe_send_file(cache_path, 'image/png', cache_root)
        return jsonify({'error': 'generation_failed', 'fallback': 'emoji'}), 503

    elif media_type == 'tts':
        synth, available = _get_tts()
        if not available:
            return jsonify({'error': 'tts_not_available'}), 503
        voice = request.args.get('voice')
        try:
            speed = max(_SPEED_MIN, min(_SPEED_MAX, float(request.args.get('speed', 1.0))))
        except (ValueError, TypeError):
            speed = 1.0
        audio_path = synth(prompt, voice=voice, speed=speed)
        if audio_path and os.path.isfile(audio_path):
            # Copy to cache location
            import shutil
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            shutil.copy2(audio_path, cache_path)
            size = os.path.getsize(cache_path)
            register(sha, media_type, classification, prompt, size, user_id, ext)
            return _safe_send_file(cache_path, 'audio/wav', cache_root)
        return jsonify({'error': 'tts_synthesis_failed'}), 503

    elif media_type in ('music', 'video'):
        # Async generation — return job_id for polling
        job_id = f"{media_type}_{uuid.uuid4().hex[:12]}"
        with _jobs_lock:
            # Cap total jobs to prevent memory exhaustion
            if len(_async_jobs) >= _MAX_JOBS:
                _cleanup_jobs()
                if len(_async_jobs) >= _MAX_JOBS:
                    return jsonify({'error': 'Too many pending jobs, try again later'}), 429
            _async_jobs[job_id] = {
                'status': 'pending',
                'media_type': media_type,
                'prompt': prompt[:_MAX_PROMPT_LEN],
                'cache_path': cache_path,
                'sha': sha,
                'classification': classification,
                'user_id': user_id,
                'ext': ext,
                'created': time.time(),
            }
        # Launch background generation
        t = threading.Thread(
            target=_async_generate,
            args=(job_id, media_type, prompt, style, cache_path, sha, classification, user_id, ext),
            daemon=True
        )
        t.start()
        return jsonify({
            'status': 'pending',
            'job_id': job_id,
            'poll_url': f'/api/media/asset/status/{job_id}',
        }), 202

    return jsonify({'error': 'unsupported_type'}), 400


def _bound_game_media(prompt_id, game_id, media_type, state='bgm',
                     level=None, user_id=None):
    """The sound memoized for a game's state, and what matched.

    The memo lives in the agent's own saved data and the matching ladder
    is HARTOS's one matcher (core/game_sound_memo.py), imported rather
    than copied: this route must agree with the agent's own tools about
    what a hit is, to the key (spec §4).

    Returns (url, matched) where matched is 'mine', 'level', 'game',
    'composing' or 'miss'.  Only music is memoized today; anything else
    falls through to composition.
    """
    if media_type != 'music' or not prompt_id or not game_id:
        return None, 'miss'
    try:
        from core.cache_loaders import load_agent_data
        from core.game_sound_memo import game_state_sound
        data = load_agent_data(prompt_id) or {}
        record, matched = game_state_sound(
            data.get('games', {}), game_id, state, level, user_id)
        url = record.get('url')
        if url:
            logger.info(
                f"game {game_id} state {state} plays what agent {prompt_id} "
                f"memoized (matched {matched})")
        return url or None, matched
    except Exception as e:
        logger.warning(f"could not read the memo for game {game_id}: {e}")
        return None, 'miss'


def _async_generate(job_id, media_type, prompt, style, cache_path, sha, classification, user_id, ext):
    """Background thread for async media generation (music/video).

    Generation goes through the ONE media capability the agents already
    hold: integrations.service_tools.media_agent.generate_media, the tool
    registered for CREATE (hartos/create_recipe.py) and REUSE
    (hartos/reuse_recipe.py) agents.  This route used to call AceStep,
    wan2gp and LTX-2 over HTTP itself, which was a second copy of that
    selection, its endpoints and its polling: a game composed here and a
    game composed by its agent could not come out the same, and the tool
    ladder had to be maintained twice.  This function now only caches and
    registers what the capability returns.
    """
    _, _, register, _, _ = _get_classifier()
    try:
        try:
            from integrations.service_tools.media_agent import (
                check_media_status,
                generate_media,
            )
        except ImportError as e:
            logger.error(f"media capability unavailable for {job_id}: {e}")
            with _jobs_lock:
                _async_jobs[job_id]['status'] = 'failed'
                _async_jobs[job_id]['error'] = 'media_capability_unavailable'
            return

        modality = 'audio_music' if media_type == 'music' else 'video'
        started = json.loads(generate_media(
            context=prompt,
            output_modality=modality,
            input_text=prompt,
            duration=_MUSIC_SECONDS if media_type == 'music' else None,
            style=style or None,
        ))

        result_url = None
        status = started.get('status')
        if status == 'completed':
            results = started.get('results') or []
            result_url = results[0].get('url') if results else None
        elif status == 'pending':
            task_id = started.get('task_id', '')
            deadline = time.time() + _GENERATION_TIMEOUT_SECONDS
            while time.time() < deadline:
                time.sleep(2)
                progress = json.loads(check_media_status(task_id))
                if progress.get('status') in ('complete', 'completed', 'done'):
                    results = progress.get('results') or []
                    result_url = (progress.get('url')
                                  or (results[0].get('url') if results else None))
                    break
                if progress.get('status') in ('failed', 'error'):
                    logger.warning(
                        f"{modality} generation failed for {job_id}: "
                        f"{progress.get('error')}")
                    break
        else:
            logger.warning(f"{modality} generation refused for {job_id}: "
                           f"{started.get('error')}")

        if result_url:
            size = _download_and_cache(result_url, cache_path)
            if size > 0:
                register(sha, media_type, classification, prompt, size, user_id, ext)
                with _jobs_lock:
                    _async_jobs[job_id]['status'] = 'complete'
                    _async_jobs[job_id]['result_path'] = cache_path
                return

        with _jobs_lock:
            _async_jobs[job_id]['status'] = 'failed'
            _async_jobs[job_id]['error'] = 'generation_failed'

    except Exception as e:
        logger.error(f"Async media generation failed for {job_id}: {e}")
        with _jobs_lock:
            _async_jobs[job_id]['status'] = 'failed'
            _async_jobs[job_id]['error'] = str(e)


def media_asset_status(job_id):
    """
    GET /api/media/asset/status/<job_id>
    Poll async media generation job status.
    """
    # Validate job_id format (prevent injection)
    if not re.match(r'^(music|video)_[a-f0-9]{12}$', str(job_id)):
        return jsonify({'error': 'invalid job_id format'}), 400

    with _jobs_lock:
        job = _async_jobs.get(job_id)

    if not job:
        return jsonify({'error': 'job_not_found'}), 404

    # Verify the requesting user owns this job (for private assets)
    if not job.get('classification', '').startswith('public'):
        req_user = _get_user_id_from_request()
        if req_user != job.get('user_id'):
            return jsonify({'error': 'access_denied'}), 403

    if job['status'] == 'complete':
        cache_path = job.get('result_path')
        if cache_path and os.path.isfile(cache_path):
            _, _, _, _, cache_root = _get_classifier()
            mime_map = {'music': 'audio/mpeg', 'video': 'video/mp4'}
            mt = job.get('media_type', 'video')
            return _safe_send_file(cache_path,
                                   mime_map.get(mt, 'application/octet-stream'),
                                   cache_root)

    return jsonify({
        'status': job['status'],
        'job_id': job_id,
        'error': job.get('error'),
    })


def register_routes(app):
    """Register media asset routes on the Flask app."""
    app.route("/api/media/asset", methods=["GET"])(media_asset)
    app.route("/api/media/asset/status/<job_id>", methods=["GET"])(media_asset_status)
    logger.info("Kids media routes registered: /api/media/asset, /api/media/asset/status/<job_id>")

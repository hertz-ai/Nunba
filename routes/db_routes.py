"""Local DB routes — replaces cloud database endpoints for fully offline operation.

Replaces these cloud endpoints (previously at azurekong.hertzai.com):
  POST /create_action        — Store user actions/interactions (vision context, audit trail)
  GET  /create_action        — Query actions by user_id (returns all, filtered client-side)
  POST /conversation         — Store conversation records (user ↔ agent)
  GET  /conversation         — Query conversations by user_id/topic
  POST /db/getstudent_by_user_id — Get user profile (language, grade)
  POST /createpromptlist      — Sync agent configs (mirrors cloud createpromptlist)
  GET  /getprompt             — Fetch agent config by prompt_id
  GET  /getprompt_onlyuserid  — List user's agents
  GET  /getprompt_all         — List all public agents
  GET  /get_image_by_id/<id>     — A teacher avatar: its image and its voice id
  GET  /get_voice_sample_id/<id> — A voice sample: its recording's URL

The parsed-book library (pdf_files / page_layouts, GET /db/pdf_files and
GET /db/layouts) is HARTOS's: integrations/learning/api_books.py serves it on
every node, from the tables in integrations/social/models.py.

SQLite storage at ~/Documents/Nunba/data/nunba_db.sqlite
"""
import json
import logging
import os
import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

db_bp = Blueprint('db', __name__)

# ── Database path (cross-platform) ──
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
DATA_DIR = NUNBA_DIR / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / 'nunba_db.sqlite'

#: The first teacher avatar id this node hands out.  Clients send CENTRAL
#: avatar ids here too (the landing page and Android hardcode 1802, 2759,
#: 2933, ...), and an avatar id names one avatar wherever it is read, so a
#: local id must be one central can never issue.  Central's ids are in the
#: thousands, and Android carries the id as a Java Integer, so local ids
#: start at a billion and stay below 2**31.
LOCAL_AVATAR_ID_BASE = 1_000_000_000


def _get_db():
    """Get a thread-local SQLite connection."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    # busy_timeout (milliseconds): block on a competing writer for
    # up to 3s instead of immediately raising "database is locked".
    # Matches CLAUDE.md topology spec for flat deployments under WAL.
    conn.execute("PRAGMA busy_timeout=3000")
    return conn


def _init_db():
    """Create all tables if they don't exist."""
    conn = _get_db()
    try:
        conn.executescript("""
            -- Actions table (replaces cloud /create_action)
            -- Used by: VisionService._post_description_to_db(), Image_Inference_Tool,
            -- action audit trail, Last_5_Minutes_Visual_Context queries
            CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conv_id TEXT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                zeroshot_label TEXT DEFAULT '',
                gpt3_label TEXT DEFAULT '',
                created_date TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_actions_user ON actions(user_id);
            CREATE INDEX IF NOT EXISTS idx_actions_label ON actions(gpt3_label);
            CREATE INDEX IF NOT EXISTS idx_actions_created ON actions(created_date);

            -- Conversations table (replaces cloud /conversation)
            -- Used by: save_conversation_db() in create_recipe.py, reuse_recipe.py
            CREATE TABLE IF NOT EXISTS conversations (
                conv_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                request TEXT,
                response TEXT,
                conv_bot_name TEXT DEFAULT 'Local LLM',
                topic TEXT,
                revision INTEGER DEFAULT 0,
                dialogue_id TEXT,
                card_type TEXT DEFAULT 'Custom GPT',
                qid TEXT,
                layout_id TEXT,
                layout_list TEXT DEFAULT '[]',
                request_token INTEGER DEFAULT 0,
                response_token INTEGER DEFAULT 0,
                request_id TEXT,
                historical_request_id TEXT DEFAULT '[]',
                created_date TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
            CREATE INDEX IF NOT EXISTS idx_conv_topic ON conversations(topic);
            CREATE INDEX IF NOT EXISTS idx_conv_request_id ON conversations(request_id);
        """)
        conn.commit()
        # Teacher avatars and their voice samples (replace cloud
        # /upload_teacher_avatar, /upload_voice_sample, /get_image_by_id and
        # /get_voice_sample_id): central's columns (Hevolve_Database
        # sql/models.py), so a row reads the same from either.  Written by
        # routes/upload_routes.py; read by HARTOS core/teacher_avatar.lookup_avatar.
        # ONE transaction creates the tables and seeds the avatar id sequence
        # (AUTOINCREMENT gives max(seq, largest id) + 1, so the first local
        # avatar is LOCAL_AVATAR_ID_BASE), so no init leaves the table unseeded.
        conn.execute('BEGIN')
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS voice_sample (
                    voice_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    voice_sample_name TEXT,
                    voice_sample_url TEXT NOT NULL,
                    user_id TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    in_use INTEGER NOT NULL DEFAULT 1,
                    upload_date TEXT NOT NULL DEFAULT (datetime('now')),
                    request_id TEXT
                )""")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_voice_upload "
                         "ON voice_sample(user_id, request_id)")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS teacher_avatar (
                    teacher_avatar_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_name TEXT,
                    image_url TEXT,
                    user_id TEXT,
                    in_use INTEGER NOT NULL DEFAULT 1,
                    is_cartoon INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    upload_date TEXT NOT NULL DEFAULT (datetime('now')),
                    voice_id INTEGER REFERENCES voice_sample(voice_id),
                    request_id TEXT,
                    name TEXT
                )""")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_avatar_upload "
                         "ON teacher_avatar(user_id, request_id)")
            conn.execute(
                "INSERT INTO sqlite_sequence (name, seq) SELECT 'teacher_avatar', ? "
                "WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'teacher_avatar')",
                (LOCAL_AVATAR_ID_BASE - 1,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    finally:
        conn.close()


# Initialize tables on import
_init_db()


# ══════════════════════════════════════════════════════════════════════════════
# ACTION ROUTES — replaces cloud /create_action
# Consumers: VisionService, Image_Inference_Tool, hart_intelligence action audit
# ══════════════════════════════════════════════════════════════════════════════

@db_bp.route('/create_action', methods=['POST', 'GET'])
def create_or_get_actions():
    """Create action (POST) or get actions by user_id (GET).

    POST payload: { conv_id, user_id, action, zeroshot_label, gpt3_label }
    GET params: ?user_id=X

    GET returns list of action dicts matching the cloud /create_action?user_id=X response.
    This is consumed by hart_intelligence for Last_5_Minutes_Visual_Context.
    """
    if request.method == 'GET':
        user_id = request.args.get('user_id', '')
        if not user_id:
            return jsonify([])

        conn = _get_db()
        try:
            rows = conn.execute(
                "SELECT * FROM actions WHERE user_id = ? ORDER BY created_date DESC LIMIT 500",
                (user_id,)
            ).fetchall()
            return jsonify([dict(r) for r in rows])
        finally:
            conn.close()

    # POST — create action
    data = request.get_json(force=True) if request.is_json else request.form.to_dict()

    user_id = data.get('user_id', 0)
    action_text = data.get('action', '')[:100]  # Cap at 100 chars like cloud
    conv_id = data.get('conv_id')
    zeroshot_label = data.get('zeroshot_label', '')
    gpt3_label = data.get('gpt3_label', '')

    conn = _get_db()
    try:
        now = datetime.now(UTC).isoformat()
        cursor = conn.execute(
            """INSERT INTO actions (conv_id, user_id, action, zeroshot_label, gpt3_label, created_date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (conv_id, user_id, action_text, zeroshot_label, gpt3_label, now)
        )
        conn.commit()
        action_id = cursor.lastrowid
        return jsonify({"action_id": action_id, "status": "created"})
    finally:
        conn.close()


@db_bp.route('/get_visual_bymins', methods=['GET'])
@db_bp.route('/action_by_user_id', methods=['GET'])
def get_visual_by_mins():
    """Get recent visual/screen actions by user within a time window.

    Replaces cloud mailer.hertzai.com/get_visual_bymins?user_id=X&mins=Y
    Also serves as /action_by_user_id?user_id=X (ACTION_API endpoint).
    Consumers: helper.py get_visual_context(), get_screen_context(), search_visual_history()
    """
    user_id = request.args.get('user_id', '')
    mins = int(request.args.get('mins', 60))

    if not user_id:
        return jsonify([])

    conn = _get_db()
    try:
        # Filter actions within the last N minutes
        rows = conn.execute(
            """SELECT * FROM actions
               WHERE user_id = ?
                 AND created_date >= datetime('now', ? || ' minutes')
               ORDER BY created_date DESC
               LIMIT 500""",
            (user_id, f'-{mins}')
        ).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# CONVERSATION ROUTES — replaces cloud /conversation
# Consumers: save_conversation_db() in create_recipe.py, reuse_recipe.py
# ══════════════════════════════════════════════════════════════════════════════

@db_bp.route('/conversation', methods=['POST', 'GET'])
def conversation():
    """Create conversation record (POST) or query (GET).

    POST payload matches cloud contract:
    {
        request, response, user_id, conv_bot_name, topic, revision,
        dialogue_id, card_type, qid, layout_id, layout_list,
        request_token, response_token, request_id, historical_request_id
    }
    Returns: { conv_id: int }

    GET params: ?user_id=X&topic=Y&request_id=Z
    """
    if request.method == 'GET':
        user_id = request.args.get('user_id', '')
        topic = request.args.get('topic', '')
        request_id = request.args.get('request_id', '')
        limit = int(request.args.get('limit', 100))

        conn = _get_db()
        try:
            query = "SELECT * FROM conversations WHERE 1=1"
            params = []
            if user_id:
                query += " AND user_id = ?"
                params.append(user_id)
            if topic:
                query += " AND topic = ?"
                params.append(topic)
            if request_id:
                query += " AND request_id = ?"
                params.append(request_id)
            query += " ORDER BY created_date DESC LIMIT ?"
            params.append(limit)
            rows = conn.execute(query, params).fetchall()
            return jsonify([dict(r) for r in rows])
        finally:
            conn.close()

    # POST — create conversation
    data = request.get_json(force=True) if request.is_json else request.form.to_dict()

    conn = _get_db()
    try:
        now = datetime.now(UTC).isoformat()
        cursor = conn.execute(
            """INSERT INTO conversations
               (user_id, request, response, conv_bot_name, topic, revision,
                dialogue_id, card_type, qid, layout_id, layout_list,
                request_token, response_token, request_id, historical_request_id,
                created_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.get('user_id', 0),
                data.get('request', ''),
                data.get('response', ''),
                data.get('conv_bot_name', 'Local LLM'),
                data.get('topic', ''),
                1 if data.get('revision') else 0,
                data.get('dialogue_id'),
                data.get('card_type', 'Custom GPT'),
                data.get('qid'),
                data.get('layout_id'),
                data.get('layout_list', '[]'),
                data.get('request_token', 0),
                data.get('response_token', 0),
                data.get('request_id', ''),
                data.get('historical_request_id', '[]'),
                now,
            )
        )
        conn.commit()
        conv_id = cursor.lastrowid
        return jsonify({"conv_id": str(conv_id)})
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT / USER PROFILE — replaces cloud /db/getstudent_by_user_id
# Consumers: hart_intelligence (language detection), helper.py:407
# ══════════════════════════════════════════════════════════════════════════════

@db_bp.route('/db/getstudent_by_user_id', methods=['POST'])
@db_bp.route('/getstudent_by_user_id', methods=['POST'])
def get_student_by_user_id():
    """Get user profile by user_id. Returns language, grade info.

    POST payload: { user_id: int }
    Returns: { user_id, preferred_language, standard, board, ... }

    Falls back to social DB user table for basic info.
    """
    data = request.get_json(force=True) if request.is_json else request.form.to_dict()
    user_id = data.get('user_id', 0)

    # Try to get from social DB (the user table has display_name, etc.)
    try:
        from integrations.social.models import User as SocialUser
        from integrations.social.models import db_session
        with db_session(commit=False) as session:
            user = session.query(SocialUser).get(int(user_id))
            if user:
                return jsonify({
                    "user_id": user.id,
                    "preferred_language": getattr(user, 'preferred_language', 'English'),
                    "standard": getattr(user, 'standard', ''),
                    "board": getattr(user, 'board', ''),
                    "display_name": user.display_name,
                    "email": user.email or '',
                })
    except Exception:
        pass

    # Fallback — return defaults
    return jsonify({
        "user_id": user_id,
        "preferred_language": "English",
        "standard": "",
        "board": "",
        "display_name": f"User {user_id}",
        "email": "",
    })


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT (AGENT) ROUTES — replaces cloud /createpromptlist, /getprompt, etc.
# Consumers: hart_intelligence agent creation/reuse pipeline
# Note: Local /prompts in chatbot_routes.py handles file-based prompts.
#       These routes add cloud-compatible API contract for HARTOS compatibility.
# ══════════════════════════════════════════════════════════════════════════════

def _get_prompts_dir():
    """Get prompts directory (same as HARTOS uses)."""
    prompts_dir = NUNBA_DIR / 'data' / 'prompts'
    prompts_dir.mkdir(parents=True, exist_ok=True)
    return prompts_dir


# The agent pipeline writes several files BESIDE an agent record, in the same
# directory.  None of them is an agent, and each carries a distinct shape:
#
#   {pid}_{flow}_{n}      per-action record written as each action is authored
#   {pid}_{flow}_recipe   the assembled recipe
#   {pid}_personality     the persona blob
#   {pid}.proposed.rN     a proposal variant
#   {pid}_vlm_agent       the vlm agent record
#
# Measured live 2026-09-06: GET /getprompt_all/ returned 1,844 rows of which
# 1,161 (63%) were these files — 588 per-action, 386 personality, 187 proposal
# — because the handlers excluded only '_recipe' and '_vlm_agent' and then used
# the filename stem as the prompt_id.  974/974 of those ids were EXACTLY a
# .json stem in the prompts dir, and 979 carried an empty prompt body.
#
# Matched on SHAPE, not on any underscore.  HARTOS's sibling site
# (hart_intelligence_entry /prompts/public) uses `'_' not in fname`, which is
# too aggressive for this directory: 9 live agents carry underscores in their
# ids (hive_economics_*, hive_infra_*, p2p_food_*, p2p_bills_*, p2p_rental_*)
# and a blanket underscore rule silently drops them.
# '_recipe' and '_vlm_agent' stay substring matches, which is what the two
# handlers did before and what tests/test_db_routes.py already pins.
# Anchored on the SUFFIX, not on a numeric parent id.  A first cut used
# `^\d+_\d+_\d+$`, which matches only digit-prefixed parents and therefore let
# c38e8b7c-ccbc-4127-a0a4-7604f69f9203_0_1 through — the one live per-action
# file whose parent id is a UUID (empty prompt body, so plainly an artifact).
# Measured against all 1,844 live rows: the suffix form excludes exactly that
# one extra row and drops none of the underscore-bearing real agents.
_ARTIFACT_STEM_RE = re.compile(
    r'_\d+_\d+$'             # per-action        {pid}_{flow}_{n}
    r'|_recipe'              # assembled recipe
    r'|_vlm_agent'           # vlm agent record
    r'|_personality$'        # personality blob
    r'|\.proposed\.r\d+$'    # proposal variant
)


def _is_agent_record(path):
    """True when a prompts-dir file is an agent record, not a build artifact.

    ONE predicate for both listing handlers — they previously carried the same
    incomplete filter inline, which is how the two drifted from what the
    pipeline actually writes.
    """
    if path.suffix != '.json':
        return False
    return not _ARTIFACT_STEM_RE.search(path.stem)


@db_bp.route('/createpromptlist', methods=['POST'])
def create_prompt_list():
    """Sync agent configs. Matches cloud /createpromptlist contract.

    POST payload: { listprompts: [{ prompt_id, prompt, user_id, name, is_active, image_url }] }
    Returns: { status: 'ok', synced: N }
    """
    data = request.get_json(force=True)
    prompts = data.get('listprompts', [])
    prompts_dir = _get_prompts_dir()
    synced = 0

    for p in prompts:
        prompt_id = p.get('prompt_id')
        if not prompt_id:
            continue

        prompt_file = prompts_dir / f"{prompt_id}.json"
        existing = {}
        if prompt_file.exists():
            try:
                with open(prompt_file, encoding='utf-8') as f:
                    existing = json.load(f)
            except Exception:
                pass

        # Merge — don't overwrite recipe details, just sync metadata
        existing.update({
            'prompt_id': prompt_id,
            'goal': p.get('prompt', existing.get('goal', '')),
            'user_id': p.get('user_id', existing.get('user_id')),
            'name': p.get('name', existing.get('name', '')),
            'is_active': p.get('is_active', True),
            'image_url': p.get('image_url', existing.get('image_url', '')),
            'synced_at': datetime.now(UTC).isoformat(),
        })

        with open(prompt_file, 'w', encoding='utf-8') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        synced += 1

    return jsonify({"status": "ok", "synced": synced})


@db_bp.route('/getprompt/', methods=['GET'])
def get_prompt():
    """Fetch agent config by prompt_id. Matches cloud /getprompt/?prompt_id=X.

    Returns: { prompt_id, name, prompt (goal), user_id, is_active, ... }
    """
    prompt_id = request.args.get('prompt_id', '')
    if not prompt_id:
        return jsonify({"error": "prompt_id required"}), 400

    prompts_dir = _get_prompts_dir()
    prompt_file = prompts_dir / f"{prompt_id}.json"

    if not prompt_file.exists():
        return jsonify({"error": f"Prompt {prompt_id} not found"}), 404

    try:
        with open(prompt_file, encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({
            "prompt_id": prompt_id,
            "name": data.get('name', ''),
            "prompt": data.get('goal', data.get('prompt', '')),
            "user_id": data.get('user_id', 0),
            "is_active": data.get('is_active', True),
            "image_url": data.get('image_url', ''),
            "custom_prompt": data.get('custom_prompt', ''),
            "source": "local",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@db_bp.route('/getprompt_onlyuserid/', methods=['GET'])
@db_bp.route('/getprompt_userid/', methods=['GET'])
def get_prompt_by_user():
    """List user's agents. Matches cloud /getprompt_onlyuserid/?user_id=X and
    /getprompt_userid/?user_id=X.

    Both spellings are live client calls: the Android app's
    GetPromptListApi.getCustomChats (GetPromptListApi.java:18) and the RN
    client's chatApi.getCustomBots (services/chatApi.js:92) ask for
    getprompt_userid/.  With only the _onlyuserid spelling here, those calls
    404'd whenever this node answered.

    Returns: list of prompt dicts
    """
    user_id = request.args.get('user_id', '')
    prompts_dir = _get_prompts_dir()
    results = []

    if not prompts_dir.exists():
        return jsonify(results)

    for f in prompts_dir.iterdir():
        if not _is_agent_record(f):
            continue
        try:
            with open(f, encoding='utf-8') as fh:
                data = json.load(fh)
            # Filter by user_id if provided
            file_user = str(data.get('user_id', ''))
            if user_id and file_user != str(user_id):
                continue
            results.append({
                "prompt_id": f.stem,
                "name": data.get('name', f.stem),
                "prompt": data.get('goal', data.get('prompt', '')),
                "user_id": data.get('user_id', 0),
                "is_active": data.get('is_active', True),
                "image_url": data.get('image_url', ''),
                "source": "local",
            })
        except Exception:
            continue

    return jsonify(results)


@db_bp.route('/getprompt_all/', methods=['GET'])
def get_all_prompts():
    """List all public agents. Matches cloud /getprompt_all/.

    Returns: list of all prompt dicts (no user filter)
    """
    prompts_dir = _get_prompts_dir()
    results = []

    if not prompts_dir.exists():
        return jsonify(results)

    for f in prompts_dir.iterdir():
        if not _is_agent_record(f):
            continue
        try:
            with open(f, encoding='utf-8') as fh:
                data = json.load(fh)
            results.append({
                "prompt_id": f.stem,
                "name": data.get('name', f.stem),
                "prompt": data.get('goal', data.get('prompt', '')),
                "user_id": data.get('user_id', 0),
                "is_active": data.get('is_active', True),
                "image_url": data.get('image_url', ''),
                "source": "local",
            })
        except Exception:
            continue

    return jsonify(results)


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER AVATAR + VOICE SAMPLE — replaces cloud /upload_teacher_avatar,
# /upload_voice_sample, /get_image_by_id and /get_voice_sample_id
# Writers: routes/upload_routes.py (/upload/image, /upload/audio), as MakeItTalk
#          writes central's rows for Android's uploads
# Readers: HARTOS core/teacher_avatar.lookup_avatar, on get_db_url() (this node
#          on the desktop): a chat's teacher_avatar_id -> voice_id -> the
#          recording a cloning TTS engine speaks from
# ══════════════════════════════════════════════════════════════════════════════

def record_voice_sample(voice_sample_name, voice_sample_url, user_id, request_id):
    """Store an uploaded voice recording; returns its voice id.

    Mirrors central crud.upload_voice_sample, plus the one link central makes
    elsewhere.  Central links an avatar to a voice when the TOONIFIED avatar
    row lands, and toonifying runs after both uploads, so the voice is always
    there first.  This node does not toonify: the avatar row lands at upload
    time, usually before the voice.  So the link is made by whichever upload
    arrives second, and here that is the voice: every avatar of the same
    upload (user_id + request_id) speaks with it, the newest recording.
    """
    user_id = str(user_id)
    conn = _get_db()
    try:
        voice_id = conn.execute(
            """INSERT INTO voice_sample
               (voice_sample_name, voice_sample_url, user_id, request_id, upload_date)
               VALUES (?, ?, ?, ?, ?)""",
            (voice_sample_name, voice_sample_url, user_id, request_id,
             datetime.now(UTC).isoformat()),
        ).lastrowid
        if request_id:
            conn.execute(
                "UPDATE teacher_avatar SET voice_id = ? WHERE user_id = ? AND request_id = ?",
                (voice_id, user_id, request_id))
        conn.commit()
        return voice_id
    finally:
        conn.close()


def record_teacher_avatar(image_name, image_url, user_id, request_id, name=''):
    """Store an uploaded avatar image; returns (teacher_avatar_id, voice_id).

    Mirrors central crud.upload_teacher_avatar: the avatar speaks with the
    newest recording of the same upload (user_id + request_id) when one is
    already here; record_voice_sample makes the link in the other order.  An
    upload without a request_id links nothing, because the request_id is the
    only thing that says which recording belongs to which image.  Nothing is
    toonified here, so the image is the avatar as uploaded (is_cartoon 0).
    An id below LOCAL_AVATAR_ID_BASE is refused, never issued.
    """
    user_id = str(user_id)
    conn = _get_db()
    try:
        voice = conn.execute(
            "SELECT voice_id FROM voice_sample WHERE user_id = ? AND request_id = ? "
            "ORDER BY voice_id DESC LIMIT 1",
            (user_id, request_id),
        ).fetchone() if request_id else None
        voice_id = voice['voice_id'] if voice else None
        avatar_id = conn.execute(
            """INSERT INTO teacher_avatar
               (image_name, image_url, user_id, request_id, name, voice_id, upload_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (image_name, image_url, user_id, request_id, name or None, voice_id,
             datetime.now(UTC).isoformat()),
        ).lastrowid
        if avatar_id < LOCAL_AVATAR_ID_BASE:
            # Only an id sequence that lost its seed gets here, and an id below
            # the base can be central's: refuse it rather than issue it.
            conn.rollback()
            raise RuntimeError(
                f'teacher_avatar id {avatar_id} is below LOCAL_AVATAR_ID_BASE')
        conn.commit()
        return avatar_id, voice_id
    finally:
        conn.close()


@db_bp.route('/get_image_by_id/<int:avatar_id>', methods=['GET'])
def get_image_by_id(avatar_id):
    """An active teacher avatar with every column, or null.

    Matches cloud /get_image_by_id/{id} (crud.get_image_by_id): lookup_avatar
    reads its image_url, and its voice_id names the voice sample to speak with.
    """
    conn = _get_db()
    try:
        row = conn.execute(
            "SELECT * FROM teacher_avatar WHERE teacher_avatar_id = ? AND is_active = 1",
            (avatar_id,),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return jsonify(None)
    avatar = dict(row)
    for flag in ('in_use', 'is_cartoon', 'is_active'):
        avatar[flag] = bool(avatar[flag])
    return jsonify(avatar)


@db_bp.route('/get_voice_sample_id/<int:voice_id>', methods=['GET'])
def get_voice_sample_id(voice_id):
    """An in-use voice sample, or null.

    Matches cloud /get_voice_sample_id/{id} (schemas.voiceSampleResponse):
    voice_id, voice_sample_url and upload_date.  Central answers an unknown
    id with an error and this node with null; lookup_avatar reads either as
    no voice.  voice_sample_url is the recording's /uploads/ URL on this
    node, which voice_reference turns into the file.
    """
    conn = _get_db()
    try:
        row = conn.execute(
            "SELECT voice_id, voice_sample_url, upload_date FROM voice_sample "
            "WHERE voice_id = ? AND in_use = 1",
            (voice_id,),
        ).fetchone()
    finally:
        conn.close()
    return jsonify(dict(row) if row else None)


# ══════════════════════════════════════════════════════════════════════════════
# REGISTRATION
# ══════════════════════════════════════════════════════════════════════════════

def register_db_routes(app):
    """Register the DB blueprint with the Flask app."""
    app.register_blueprint(db_bp)
    logger.info(
        "DB routes registered: /create_action, /conversation, /createpromptlist, "
        "/getprompt, /getprompt_onlyuserid, /getprompt_all, /db/getstudent_by_user_id, "
        "/get_image_by_id, /get_voice_sample_id"
    )
    logger.info(f"DB storage: {DB_PATH}")

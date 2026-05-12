"""Per-user file-replication store — WhatsApp-style cross-device attachments.

U9 workstream (tasks #412, #389).  Paired with ``desktop/chat_sync.py``:
``chat_sync`` holds the conversation *text* bucket; ``file_sync`` holds
the *binary* attachments referenced from ChatMessage.attachments rows.
When a device sends a message with an attached image/PDF/audio, the
payload flows:

    user → /api/chat-sync/files/push       (this module stores bytes)
         → /chat with attachments=[{file_id, sha256, name, mime, size}]
         → chat.new WAMP event fanned to all that user's devices
         → other device → /api/chat-sync/files/pull?file_id=<sha256>
         → (this module returns bytes)

Design principles (CLAUDE.md Gates):
  * Gate 2 (DRY): does NOT duplicate ``routes/upload_routes.py`` which
    handles one-shot Qwen-Vision inference on chat turns.  This module
    is specifically for *cross-device durable* binaries that need a
    stable file_id for replication.  If the two converge, fold into
    one upload service with sync/async modes — do NOT grow a third.
  * Gate 3 (SRP):
      - ``store(...)`` writes + returns metadata.
      - ``fetch(...)`` reads content + metadata.
      - ``list_since(...)`` enumerates for cursor-pull.
      - ``delete(...)`` removes one.
      - ``usage(...)`` returns quota state.
  * Gate 4 (no parallel paths): ONE store writer per (user, sha256).
    Concurrent uploads are serialized by a per-user lock.
  * Gate 7 (multi-OS): storage uses ``get_data_dir()``.  The shard
    directory structure is ``<user>/<sha[:2]>/<sha>`` so no single
    directory exceeds ~4k files (16²×16² = 65k shards).
  * Gate 8 (security):
      - Per-user isolation: each user's blobs live under their own
        subdirectory.  No cross-user dedup (would leak existence).
      - Path-traversal: file_id MUST be 64-hex-char SHA256; no slashes.
      - Quota: hard cap per user (default 500 MB).  Refuse on exceed.
      - Content-addressed: file_id is the SHA256 of bytes.  Server
        verifies on store; a client lying about sha256 is rejected.
      - MIME: trusted from client (desktop is single-operator).  A
        deny-list blocks obviously-dangerous extensions.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
import tempfile
import threading
import time
from typing import Any, BinaryIO

logger = logging.getLogger(__name__)

_DIRNAME = "file_sync"

# Default quotas.  Override via env on strange hardware (1GB USB stick
# install).  These are per-user, not global.
_DEFAULT_USER_QUOTA_BYTES = int(
    os.environ.get('NUNBA_FILE_SYNC_USER_QUOTA',
                   str(500 * 1024 * 1024))  # 500 MB
)
_MAX_FILE_BYTES = int(
    os.environ.get('NUNBA_FILE_SYNC_MAX_FILE',
                   str(50 * 1024 * 1024))   # 50 MB per-file cap
)

# Block extensions we never want Nunba to receive or serve — matches the
# intuition behind ``routes/upload_routes.py``'s type classifier plus
# Windows-executable / script blockers.  Not comprehensive — relies on
# file name as a cheap sieve; true content inspection is out of scope.
_BLOCKED_EXTENSIONS = frozenset({
    '.exe', '.dll', '.sys', '.scr', '.com', '.bat', '.cmd', '.msi',
    '.vbs', '.ps1', '.sh', '.app', '.dmg', '.pkg', '.deb', '.rpm',
    '.jar', '.class', '.jsp', '.php', '.asp', '.aspx',
})

# File_id MUST be lowercase hex SHA256 — exactly 64 chars.  Any deviation
# is a routing attack (path traversal via `..`) or an encoding bug; refuse.
_SHA256_HEX_LEN = 64


def _data_dir() -> str:
    """Resolve the Nunba user-writable data dir (same fallback chain
    as ``desktop/chat_sync.py``)."""
    try:
        from core.platform_paths import get_data_dir
        return get_data_dir()
    except Exception:  # noqa: BLE001
        try:
            from desktop.config import get_data_dir as _legacy_get
            return _legacy_get()
        except Exception:  # noqa: BLE001
            home = os.path.expanduser("~")
            if sys.platform == "win32":
                return os.path.join(home, "Documents", "Nunba")
            if sys.platform == "darwin":
                return os.path.join(home, "Library", "Application Support", "Nunba")
            return os.path.join(home, ".config", "nunba")


def _sanitize_user_id(user_id: str) -> str:
    """Strip anything non-alnum + underscore/dash.  Must yield a non-empty
    result or the call is refused (same policy as chat_sync)."""
    safe = "".join(c for c in str(user_id or '') if c.isalnum() or c in ("_", "-"))
    if not safe:
        raise ValueError("user_id must contain at least one alnum char")
    return safe


def _validate_file_id(file_id: str) -> str:
    """Return the file_id lowercased if it's a valid SHA256 hex; else
    raise.  Defeats path-traversal attempts (`..`, `/`, `\\`) and any
    encoding surprise — the only legal characters are [0-9a-f]."""
    if not isinstance(file_id, str) or len(file_id) != _SHA256_HEX_LEN:
        raise ValueError(f"file_id must be {_SHA256_HEX_LEN} hex chars")
    low = file_id.lower()
    if not all(c in '0123456789abcdef' for c in low):
        raise ValueError("file_id must be hex")
    return low


def _user_dir(user_id: str) -> str:
    return os.path.join(_data_dir(), _DIRNAME, _sanitize_user_id(user_id))


def _blob_path(user_id: str, file_id: str) -> str:
    fid = _validate_file_id(file_id)
    return os.path.join(_user_dir(user_id), fid[:2], fid)


def _meta_path(user_id: str, file_id: str) -> str:
    return _blob_path(user_id, file_id) + '.meta.json'


# Per-user serialization lock — avoids two concurrent uploads racing on
# the same sha256 and double-counting the quota.
_user_locks_lock = threading.Lock()
_user_locks: dict[str, threading.Lock] = {}


def _get_user_lock(user_id: str) -> threading.Lock:
    with _user_locks_lock:
        safe = _sanitize_user_id(user_id)
        lock = _user_locks.get(safe)
        if lock is None:
            lock = threading.Lock()
            _user_locks[safe] = lock
        return lock


def _atomic_write_bytes(path: str, data: bytes) -> None:
    """Tmpfile + os.replace for crash-safe writes."""
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".file_sync.", suffix=".tmp", dir=d)
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            try:
                os.fsync(fh.fileno())
            except Exception:  # noqa: BLE001 — tmpfs / FAT
                pass
        os.replace(tmp, path)
    except Exception:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:  # noqa: BLE001
            pass
        raise


def _atomic_write_json(path: str, payload: dict) -> None:
    """Mirror _atomic_write_bytes for the JSON sidecar."""
    _atomic_write_bytes(
        path,
        json.dumps(payload, separators=(',', ':')).encode('utf-8'),
    )


def _current_usage_bytes(user_id: str) -> int:
    """Sum the sizes recorded in this user's metadata sidecars.

    Derived from metadata (not filesystem stat) so a corrupted/orphan
    blob doesn't double-count.  Blob + .meta.json naming keeps the walk
    bounded even on filesystems that stat slowly.
    """
    total = 0
    root = _user_dir(user_id)
    if not os.path.isdir(root):
        return 0
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if not name.endswith('.meta.json'):
                continue
            try:
                with open(os.path.join(dirpath, name), encoding='utf-8') as fh:
                    m = json.load(fh)
                total += int(m.get('size') or 0)
            except Exception:  # noqa: BLE001
                continue
    return total


def usage(user_id: str) -> dict[str, int]:
    """Return ``{'bytes': int, 'files': int, 'quota_bytes': int}``."""
    root = _user_dir(user_id)
    files = 0
    if os.path.isdir(root):
        for _dp, _dn, filenames in os.walk(root):
            files += sum(1 for n in filenames if n.endswith('.meta.json'))
    return {
        'bytes': _current_usage_bytes(user_id),
        'files': files,
        'quota_bytes': _DEFAULT_USER_QUOTA_BYTES,
    }


def _extension_ok(name: str) -> bool:
    """Return False for obvious-executable extensions."""
    low = (name or '').lower()
    for ext in _BLOCKED_EXTENSIONS:
        if low.endswith(ext):
            return False
    return True


def store(
    user_id: str,
    stream_or_bytes: BinaryIO | bytes,
    *,
    name: str = 'file',
    mime: str = 'application/octet-stream',
    device_id: str | None = None,
) -> dict[str, Any]:
    """Persist bytes for ``user_id``.  Returns the stored metadata dict.

    The returned ``file_id`` equals the SHA256 of the content.  On a
    duplicate upload (same content, same user) this is idempotent: the
    existing metadata is returned without re-writing.

    Raises:
        ValueError — invalid user_id, blocked extension, empty data,
            file too large, quota exceeded.
    """
    _ = _sanitize_user_id(user_id)  # validates early

    if not _extension_ok(name):
        raise ValueError(f"extension blocked: {name!r}")

    # Materialise to bytes with a bounded read — a client streaming a
    # multi-GB upload at us must not OOM the desktop process before the
    # size check fires.  Read one byte past the cap so we can detect
    # overrun without buffering more than necessary.
    if hasattr(stream_or_bytes, 'read'):
        data = stream_or_bytes.read(_MAX_FILE_BYTES + 1)
    else:
        data = bytes(stream_or_bytes or b'')

    if not data:
        raise ValueError("empty payload")
    if len(data) > _MAX_FILE_BYTES:
        raise ValueError(
            f"file exceeds per-file cap {_MAX_FILE_BYTES} bytes"
        )

    sha = hashlib.sha256(data).hexdigest()
    file_id = sha

    with _get_user_lock(user_id):
        meta_path = _meta_path(user_id, file_id)
        # Idempotent: same content → already stored → return existing meta.
        if os.path.isfile(meta_path):
            try:
                with open(meta_path, encoding='utf-8') as fh:
                    return json.load(fh)
            except Exception:  # noqa: BLE001
                # Corrupt sidecar: overwrite.  Size already counted.
                pass

        # Quota: we count BEFORE writing so a partial-write mid-walk can't
        # sneak in under the cap.
        current = _current_usage_bytes(user_id)
        if current + len(data) > _DEFAULT_USER_QUOTA_BYTES:
            raise ValueError(
                f"quota exceeded: {current}+{len(data)} > "
                f"{_DEFAULT_USER_QUOTA_BYTES} bytes"
            )

        blob_path = _blob_path(user_id, file_id)
        _atomic_write_bytes(blob_path, data)

        now_ms = int(time.time() * 1000)
        meta = {
            'file_id': file_id,
            'sha256': sha,
            'name': str(name)[:255],
            'mime': str(mime)[:127],
            'size': len(data),
            'device_id': str(device_id or '')[:64] or None,
            'created_at': now_ms,
        }
        _atomic_write_json(meta_path, meta)
        logger.info("file_sync.store user=%s file_id=%s size=%d",
                    user_id, file_id[:12], len(data))
        return meta


def fetch(user_id: str, file_id: str) -> tuple[bytes | None, dict | None]:
    """Return ``(bytes, meta)`` or ``(None, None)`` when absent/unreadable."""
    try:
        _validate_file_id(file_id)
    except ValueError as e:
        logger.debug("file_sync.fetch rejected: %s", e)
        return None, None
    blob_path = _blob_path(user_id, file_id)
    meta_path = _meta_path(user_id, file_id)
    if not (os.path.isfile(blob_path) and os.path.isfile(meta_path)):
        return None, None
    try:
        with open(meta_path, encoding='utf-8') as fh:
            meta = json.load(fh)
        with open(blob_path, 'rb') as fh:
            data = fh.read()
        return data, meta
    except Exception as e:  # noqa: BLE001
        logger.warning("file_sync.fetch failed for %s/%s: %s",
                       user_id, file_id[:12], e)
        return None, None


def list_since(user_id: str, since_ms: int = 0,
               *, limit: int = 200) -> list[dict]:
    """Metadata for files created after ``since_ms``.  Ordered by
    created_at ASC.  Used by cursor-pull when a new device enumerates
    its backlog.  Does NOT return bytes — clients fetch by file_id on
    demand."""
    try:
        since = int(since_ms or 0)
    except (TypeError, ValueError):
        since = 0
    root = _user_dir(user_id)
    if not os.path.isdir(root):
        return []
    cap = max(1, min(int(limit or 200), 2000))
    out: list[dict] = []
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if not name.endswith('.meta.json'):
                continue
            try:
                with open(os.path.join(dirpath, name), encoding='utf-8') as fh:
                    meta = json.load(fh)
                if int(meta.get('created_at') or 0) > since:
                    out.append(meta)
            except Exception:  # noqa: BLE001
                continue
    out.sort(key=lambda m: int(m.get('created_at') or 0))
    return out[:cap]


def delete(user_id: str, file_id: str) -> bool:
    """Delete both the blob and metadata.  Returns True if anything was
    removed.  Idempotent — absent file returns False, not an error."""
    try:
        _validate_file_id(file_id)
    except ValueError:
        return False
    blob = _blob_path(user_id, file_id)
    meta = _meta_path(user_id, file_id)
    removed = False
    with _get_user_lock(user_id):
        for p in (blob, meta):
            try:
                if os.path.isfile(p):
                    os.remove(p)
                    removed = True
            except Exception as e:  # noqa: BLE001
                logger.warning("file_sync.delete failed for %s: %s", p, e)
    return removed

"""Cross-device chat attachments over HTTP: Nunba's door to HARTOS's one
upload service.

U9 workstream (tasks #412, #389), WhatsApp-style.  Paired with
``desktop/chat_sync.py``: ``chat_sync`` holds the conversation *text*
bucket; this module answers for the *binary* attachments referenced from
ChatMessage.attachments rows.  When a device sends a message with an
attached image/PDF/audio, the payload flows:

    user -> POST /api/chat-sync/files/push   (store(): the bytes go into the store)
         -> /chat with attachments=[{file_id, sha256, name, mime, size}]
         -> chat.new WAMP event fanned to all that user's devices
         -> other device -> GET /api/chat-sync/files/pull?file_id=<sha256>
            (fetch(): the stored file, which the route sends)

ONE upload service (owner ruling A10a, 2026-10-14).  The bytes, their
record, the size cap, the per-user quota and retention all belong to
HARTOS's core.user_file_store, under its 'chat_attachment' purpose
(core.user_file_store.PURPOSES).  This module keeps no storage, no index,
no quota and no lock of its own; it holds only the shapes the four routes
in main.py (/api/chat-sync/files/push, /pull, /usage and DELETE /<file_id>)
answer with.  A file pushed here sits in the same store as the clips, logo
and song audio her phone sends over its device link, so a /chat turn binds
its file_id like any of those (core.chat_attachments).

What the store decides, and this door inherits:
  * file_id is the sha256 of the bytes, computed by the store; a client
    never names it.
  * Each user's files sit in a folder named by a hash of the user id
    (core.user_file_store.user_dir_name), so no id can steer a path, and
    there is no cross-user dedup (that would leak existence).
  * The MIME type must be one the purpose lists: images, PDF and office
    documents, plain text and CSV, audio and video.  Never a page (HTML,
    SVG, script) or a program, so nothing served back can run; and a
    download is named so it never ends in a program's extension
    (fetch's ``download_name``).
  * 50 MB per file and 500 MB per user (the purpose's limits); a chat
    attachment is kept until she deletes it.
Only chat attachments cross this door: her reel clips, logo and songs are
not served, listed or deleted here.

Gate 2: does NOT duplicate ``routes/upload_routes.py``, which handles
one-shot Qwen-Vision inference on chat turns and keeps nothing.

Until 2026-10-14 this module wrote its own blobs under
get_data_dir()/file_sync/ with a quota of its own.  No client used it, so
nothing was migrated (A10a).
"""

from __future__ import annotations

import mimetypes
import os
from typing import Any, BinaryIO

# HARTOS's one store.  When HARTOS is not importable, importing this module
# fails and the routes answer 501 file_sync_unavailable.
from core.user_file_store import get_user_file_store, is_xid

#: The store purpose of a file sent through these routes.
PURPOSE = 'chat_attachment'

#: What each refusal of the store means, in words for the client.
_REASONS = {
    'bad_offer': 'empty or malformed upload',
    'bad_name': 'the file name must be a bare name (no folders)',
    'bad_mime': 'this type of file is not accepted',
    'too_large': 'the file is over the per-file cap',
    'quota': 'quota exceeded',
    'no_space': 'the desktop has no room for it',
    'busy': 'the desktop is busy with this file; try again',
}


class FileRefused(ValueError):
    """The store refused an upload.  ``reason`` is one of
    core.user_file_store.REFUSALS (bad_offer, bad_name, bad_mime, too_large,
    quota, no_space, ...)."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(_REASONS.get(reason, reason))


def _store():
    """The process's one store (tests point this at one on a temp root)."""
    return get_user_file_store()


def _meta(held) -> dict[str, Any]:
    """The route's shape of a stored file: ``created_at`` in epoch ms."""
    return {
        'file_id': held.xid,
        'sha256': held.sha256,
        'name': held.name,
        'mime': held.mime,
        'size': held.size,
        'created_at': int(held.created_at * 1000),
    }


def _held(user_id, file_id):
    """This user's chat attachment ``file_id``, or None."""
    if not is_xid(file_id):
        return None
    held = _store().resolve(user_id, file_id, box='in')
    return held if held is not None and held.purpose == PURPOSE else None


def _download_name(held) -> str:
    """The name the file is saved under: hers when its own extension already
    says this type, else hers plus the stored file's extension, so a file
    sent as 'invoice.exe' arrives as 'invoice.exe.pdf'."""
    ext = os.path.splitext(held.path)[1]
    name = held.name
    if name.lower().endswith(ext) or mimetypes.guess_type(name, strict=False)[0] == held.mime:
        return name
    return name + ext


def store(
    user_id: str,
    stream_or_bytes: BinaryIO | bytes,
    *,
    name: str = 'file',
    mime: str = 'application/octet-stream',
) -> dict[str, Any]:
    """Put a file into the store for ``user_id`` and return its metadata
    ``{file_id, sha256, name, mime, size, created_at}``.

    ``file_id`` is the sha256 of the content.  The same content stored again
    by the same user is one file, recorded under the latest name.  Raises
    FileRefused (a ValueError) with the store's ``reason`` when the store
    refuses it, and ValueError for an empty user id.
    """
    reply = _store().put_file(user_id, stream_or_bytes, name=name, mime=mime,
                              purpose=PURPOSE)
    if reply.get('type') != 'file_done':
        raise FileRefused(reply.get('reason', 'bad_offer'))
    held = _held(user_id, reply['xid'])
    if held is None:              # deleted between the put and this read
        raise FileRefused('not_found')
    return _meta(held)


def fetch(user_id: str, file_id: str) -> tuple[str | None, dict | None]:
    """``(path, meta)`` of a stored chat attachment, ``meta`` carrying the
    ``download_name`` to send it under; ``(None, None)`` when absent, not a
    chat attachment, or ``file_id`` is not a sha256 (64 lowercase hex)."""
    held = _held(user_id, file_id)
    if held is None:
        return None, None
    return held.path, dict(_meta(held), download_name=_download_name(held))


def list_since(user_id: str, since_ms: int = 0,
               *, limit: int = 200) -> list[dict]:
    """Metadata for chat attachments stored after ``since_ms``, oldest
    first, at most ``limit`` (1-2000).  Used by cursor-pull when a new
    device enumerates its backlog.  Does NOT return bytes: clients fetch by
    file_id on demand."""
    try:
        since = int(since_ms or 0)
    except (TypeError, ValueError):
        since = 0
    cap = max(1, min(int(limit or 200), 2000))
    rows = [_meta(held) for held in _store().query_inbox(user_id, purpose=PURPOSE,
                                                         unconsumed_only=False)]
    rows = [m for m in rows if m['created_at'] > since]
    rows.sort(key=lambda m: m['created_at'])
    return rows[:cap]


def delete(user_id: str, file_id: str) -> bool:
    """Delete one chat attachment and its record.  True when it was there
    and is gone; False for an absent file, another purpose's file or a
    malformed id (never an error)."""
    return is_xid(file_id) and _store().delete(user_id, file_id, purpose=PURPOSE)


def usage(user_id: str) -> dict[str, int]:
    """``{'bytes': int, 'files': int, 'quota_bytes': int}`` of this user's
    chat attachments, against the purpose's quota."""
    s = _store()
    files = s.query_inbox(user_id, purpose=PURPOSE, unconsumed_only=False)
    return {
        'bytes': s.usage(user_id, purpose=PURPOSE),
        'files': len(files),
        'quota_bytes': s.purposes[PURPOSE].quota,
    }

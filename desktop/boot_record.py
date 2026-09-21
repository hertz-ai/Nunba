"""boot_record — one durable line per boot, for decisions you must be able
to read back HOURS later.

WHY THIS EXISTS, measured 2026-09-21.  The floating companion window does
not exist in the running app.  Every other explanation was eliminated: the
creation kwargs are accepted, an isolated process creates both windows with
those exact kwargs (with the same browser backend and the same real URLs),
the historical colour bug is absent from the installed bytecode, the
geometry puts it on screen, nothing before the call can raise, the route
serves, the block is unconditional, and the handler does log.

The one line that would say WHY went to ``frozen_debug.log``, which rotates
at about 21 MB keeping a single ``.old`` generation -- roughly 15 to 80
minutes under load, against an app that had been up nine hours.  So the
answer existed, briefly, and was gone before anyone asked the question.  The
other long-retention log (``agent_system.log``) carries HARTOS agent
activity and never sees the window setup at all.

A boot decision is not chatter.  It is answered once, it explains the shape
of the whole session, and it is asked about long afterwards -- so it belongs
in a file that does not rotate, one line per boot, greppable by a person.
That is what this writes.

DESIGN
------
Append-only JSONL under ``~/Documents/Nunba/logs/boot_record.jsonl``, beside
the logs people already look in.  One line per event, each carrying its own
timestamp, so a reader can see the last N boots at a glance and diff a boot
that worked against one that did not.

Never fatal.  Boot must not fail because a record could not be written; a
write error degrades to a debug line and the caller continues.  That is the
same never-fail floor the rest of the boot path keeps, and the reason every
call here is best-effort.

Bounded.  The file is trimmed to the most recent ``MAX_LINES`` so it cannot
grow without limit on a machine that boots often, while still holding far
more history than a rotating debug log.
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

#: Kept small enough to read by eye, large enough to span weeks of boots.
MAX_LINES = 500

_FILENAME = 'boot_record.jsonl'


def record_path() -> Path:
    """Where the record lives.  Beside the logs people already open."""
    return (Path(os.path.expanduser('~')) / 'Documents' / 'Nunba' / 'logs'
            / _FILENAME)


def record(event: str, ok: bool, detail: Optional[str] = None,
           **fields: Any) -> bool:
    """Append one durable line.  Returns whether it was written.

    ``event``  what was decided or attempted, e.g. 'companion_window'.
    ``ok``     whether it worked.  A bool, not a message, so a reader can
               grep for failures without parsing prose.
    ``detail`` the reason -- an exception's text on failure, or what was
               chosen on success.  This is the part that was being lost.

    The return value exists so a caller CAN check, not so it must: every
    failure here is already logged, and no caller should branch on whether
    its own diagnostics landed.
    """
    entry = {'ts': time.time(),
             'when': time.strftime('%Y-%m-%d %H:%M:%S'),
             'event': str(event),
             'ok': bool(ok)}
    if detail:
        entry['detail'] = str(detail)[:2000]
    for k, v in fields.items():
        try:
            json.dumps(v)          # keep the line readable and valid
            entry[k] = v
        except (TypeError, ValueError):
            entry[k] = repr(v)[:200]

    try:
        path = record_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'a', encoding='utf-8') as fh:
            fh.write(json.dumps(entry) + '\n')
        _trim(path)
        return True
    except Exception as e:
        # Logged, never raised: a boot must not fail because its own
        # diagnostics could not be written.
        logger.debug('boot_record skipped (%s): %s', event, e)
        return False


def _trim(path: Path) -> None:
    """Keep the most recent MAX_LINES.  Best-effort, never fatal."""
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            lines = fh.readlines()
        if len(lines) <= MAX_LINES:
            return
        tmp = path.with_suffix('.jsonl.tmp')
        with open(tmp, 'w', encoding='utf-8') as fh:
            fh.writelines(lines[-MAX_LINES:])
        os.replace(tmp, path)       # atomic; a reader never sees a half file
    except Exception as e:
        logger.debug('boot_record trim skipped: %s', e)


def read_recent(event: Optional[str] = None, limit: int = 20) -> list:
    """The last `limit` records, newest first, optionally one event only.

    For a person or a later session asking "what happened at the last few
    boots" without grepping a 20 MB log that no longer holds it.
    """
    try:
        path = record_path()
        if not path.exists():
            return []
        out = []
        with open(path, 'r', encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue        # a torn line must not hide the rest
                if event is None or entry.get('event') == event:
                    out.append(entry)
        return out[-limit:][::-1]
    except Exception as e:
        logger.debug('boot_record read skipped: %s', e)
        return []

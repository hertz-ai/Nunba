"""Behavioural tests: a PDF parse falls back to the text layer when the build
ships no rasteriser, and a failed parse is recorded on the DURABLE row.

Measured 2026-09-13 on the installed build: neither pdf2image+poppler nor
PyMuPDF is in the Nunba bundle, so _pdf_to_images() returns [] and every
upload failed with "Failed to convert PDF to images" -- while its pdf_files
row stayed 'pending' for good (file_id 1, two days after its parse died).
PyPDF2 3.0.1 IS bundled (lib/PyPDF2); the fallback reads the text layer and
the outline with it.

Drives the REAL _run_pdf_parse against the REAL sqlite schema on a temp DB.
Stubbed: the rasteriser (the missing piece being simulated), the book-name
LLM call, and the crossbar publisher.
"""
import os
import sys
import types
import uuid
from unittest.mock import MagicMock, patch

import pytest

# Imported up front: patch.dict(sys.modules) in _run() drops any module that
# is imported for the first time inside it.
from PyPDF2 import PdfWriter

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope='module')
def env(tmp_path_factory):
    """REAL upload_routes on a throwaway DB.

    _get_db() reads db_routes.DB_PATH at call time, so pointing that one
    attribute at a temp file isolates every read and write the parse makes.
    Importing under NUNBA_DATA_DIR keeps a first import's side effects
    (_init_db, the upload dirs) out of the user's real data dir as well.
    """
    root = tmp_path_factory.mktemp('pdf_fallback')
    with patch.dict(os.environ, {'NUNBA_DATA_DIR': str(root)}):
        from routes import db_routes, upload_routes
    with patch.object(db_routes, 'DB_PATH', root / 'nunba_db.sqlite'):
        db_routes._init_db()
        yield types.SimpleNamespace(ur=upload_routes, db=db_routes, root=root)


# A minimal PDF with KNOWN text, optionally with a real outline (bookmarks) --
# the outline is what a real textbook carries and what the fallback reads for
# chapters, so it is part of a realistic fixture.
_PAGES = [
    ("Chapter 1: Units and Measurement", "The SI base unit of length is the metre."),
    ("Chapter 1: Units and Measurement", "Dimensional analysis checks equations."),
    ("Chapter 2: Motion", "Acceleration is the rate of change of velocity."),
]
_OUTLINE = [("Chapter 1: Units and Measurement", 0), ("Chapter 2: Motion", 2)]


def _pdf(root, name, outline=True):
    def esc(s):
        return s.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)')

    n = len(_PAGES)
    page_ids = [3 + i for i in range(n)]
    content_ids = [3 + n + i for i in range(n)]
    font_id = 3 + 2 * n
    outline_id = font_id + 1
    item_ids = [outline_id + 1 + i for i in range(len(_OUTLINE))]

    objs = {
        1: "<< /Type /Catalog /Pages 2 0 R"
           + (f" /Outlines {outline_id} 0 R" if outline else "") + " >>",
        2: f"<< /Type /Pages /Kids [{' '.join(f'{p} 0 R' for p in page_ids)}] /Count {n} >>",
        font_id: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }
    for i, (title, line) in enumerate(_PAGES):
        objs[page_ids[i]] = (f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                             f"/Contents {content_ids[i]} 0 R "
                             f"/Resources << /Font << /F1 {font_id} 0 R >> >> >>")
        cs = f"BT\n/F1 18 Tf\n72 720 Td\n({esc(title)}) Tj\n0 -40 Td\n({esc(line)}) Tj\nET\n"
        objs[content_ids[i]] = f"<< /Length {len(cs)} >>\nstream\n{cs}endstream"
    if outline:
        objs[outline_id] = (f"<< /Type /Outlines /First {item_ids[0]} 0 R "
                            f"/Last {item_ids[-1]} 0 R /Count {len(item_ids)} >>")
        for k, (title, page_idx) in enumerate(_OUTLINE):
            links = (f" /Prev {item_ids[k - 1]} 0 R" if k else "") + \
                    (f" /Next {item_ids[k + 1]} 0 R" if k + 1 < len(item_ids) else "")
            objs[item_ids[k]] = (f"<< /Title ({esc(title)}) /Parent {outline_id} 0 R{links} "
                                 f"/Dest [{page_ids[page_idx]} 0 R /Fit] >>")

    out, offsets = bytearray(b"%PDF-1.4\n"), {}
    for num in sorted(objs):
        offsets[num] = len(out)
        out += f"{num} 0 obj\n{objs[num]}\nendobj\n".encode('latin-1')
    xref_at, total = len(out), max(objs) + 1
    out += f"xref\n0 {total}\n0000000000 65535 f \n".encode('latin-1')
    for num in range(1, total):
        out += f"{offsets.get(num, 0):010d} 00000 n \n".encode('latin-1')
    out += (f"trailer\n<< /Size {total} /Root 1 0 R >>\n"
            f"startxref\n{xref_at}\n%%EOF\n").encode('latin-1')
    path = root / name
    path.write_bytes(bytes(out))
    return path


# ---------------------------------------------------------------------------
# Helpers: run the REAL parse, read the REAL DB
# ---------------------------------------------------------------------------

def _run(env, pdf_path, rasteriser_pages=()):
    """Run the real parse once; return (job, request_id, publish_mock)."""
    ur = env.ur
    job_id, req = uuid.uuid4().hex[:12], f'req-{uuid.uuid4().hex[:8]}'
    ur._parse_jobs[job_id] = {'status': 'queued', 'total_pages': 0, 'progress': 0,
                              'result': None, 'error': None, 'created_at': 0}
    publish = MagicMock()
    chat_stub = types.SimpleNamespace(publish_to_crossbar=publish)
    with patch.object(ur, '_pdf_to_images', return_value=list(rasteriser_pages)), \
         patch.object(ur, '_generate_book_name', return_value='Test Book'), \
         patch.dict(sys.modules, {'routes.chatbot_routes': chat_stub}):
        ur._run_pdf_parse(job_id, str(pdf_path), '777', req)
    return ur._parse_jobs.pop(job_id), req, publish


def _query(env, sql, args):
    conn = env.db._get_db()
    try:
        return [dict(r) for r in conn.execute(sql, args).fetchall()]
    finally:
        conn.close()


def _row(env, req):
    rows = _query(env, "SELECT * FROM pdf_files WHERE request_id = ?", (req,))
    assert len(rows) == 1, rows
    return rows[0]


def _by_page(env, file_id, col):
    rows = _query(env, f"SELECT page_number, {col} FROM page_layouts WHERE file_id = ? "
                       "ORDER BY page_number, layout_number", (file_id,))
    return {r['page_number']: r[col] for r in rows}


# ============================================================
# No rasteriser: the text layer carries the book
# ============================================================

class TestTextFallback:

    def test_parses_every_page_when_no_rasteriser(self, env):
        job, req, _ = _run(env, _pdf(env.root, 'book.pdf'))
        assert job['status'] == 'completed', job['error']
        assert job['result']['total_pages'] == 3
        row = _row(env, req)
        assert row['status'] == 'completed'
        assert row['total_pages'] == 3
        text = _by_page(env, row['file_id'], 'passage')
        assert 'The SI base unit of length is the metre.' in text[1]
        assert 'Acceleration is the rate of change of velocity.' in text[3]

    def test_chapters_come_from_the_pdf_outline(self, env):
        _, req, _ = _run(env, _pdf(env.root, 'outlined.pdf'))
        chapters = _by_page(env, _row(env, req)['file_id'], 'chapter_name')
        assert chapters == {1: 'Chapter 1: Units and Measurement',
                            2: 'Chapter 1: Units and Measurement',
                            3: 'Chapter 2: Motion'}

    def test_no_outline_still_serves_every_page_without_chapters(self, env):
        job, req, _ = _run(env, _pdf(env.root, 'flat.pdf', outline=False))
        assert job['status'] == 'completed', job['error']
        chapters = _by_page(env, _row(env, req)['file_id'], 'chapter_name')
        assert chapters == {1: None, 2: None, 3: None}

    def test_completion_is_published_like_the_vision_path(self, env):
        _, _, publish = _run(env, _pdf(env.root, 'published.pdf'))
        payload = publish.call_args[0][1]
        assert payload['type'] == 'pdf_parse_complete'
        assert payload['total_pages'] == 3

    def test_a_rasteriser_still_takes_the_vision_path(self, env):
        """When page images exist the VLM path runs and the fallback stays out."""
        ur = env.ur
        page = {'page_number': 1, 'page_type': 'content', 'text': 'from vlm', 'elements': []}
        with patch.object(ur, '_parse_page_via_vision', return_value=page) as vlm, \
             patch.object(ur, '_pdf_text_pages', wraps=ur._pdf_text_pages) as text_layer:
            job, _, _ = _run(env, _pdf(env.root, 'vlm.pdf'),
                             rasteriser_pages=[(1, str(env.root / 'page_1.jpg'))])
        assert vlm.call_count == 1
        assert text_layer.call_count == 0
        assert job['result']['total_pages'] == 1


# ============================================================
# A failed parse is recorded where it survives a restart
# ============================================================

class TestDurableFailure:

    def test_unreadable_file_marks_the_row_failed_not_pending(self, env):
        bad = env.root / 'not_a.pdf'
        bad.write_bytes(b'this is not a pdf')
        job, req, _ = _run(env, bad)
        assert job['status'] == 'failed'
        assert _row(env, req)['status'] == 'failed'

    def test_scanned_pdf_without_a_text_layer_fails_honestly(self, env):
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        writer.add_blank_page(width=612, height=792)
        scanned = env.root / 'scanned.pdf'
        with open(scanned, 'wb') as fh:
            writer.write(fh)
        job, req, _ = _run(env, scanned)
        assert job['status'] == 'failed'
        assert 'no text layer' in job['error']
        row = _row(env, req)
        assert row['status'] == 'failed'
        assert _by_page(env, row['file_id'], 'passage') == {}   # nothing half-stored

    def test_unexpected_exception_marks_the_row_failed(self, env):
        with patch.object(env.ur, '_pdf_text_pages', side_effect=RuntimeError('boom')):
            job, req, _ = _run(env, _pdf(env.root, 'boom.pdf'))
        assert job['status'] == 'failed'
        assert job['error'] == 'boom'
        assert _row(env, req)['status'] == 'failed'

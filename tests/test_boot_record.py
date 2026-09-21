"""A boot decision survives long enough to be asked about.

Written after the floating companion window was found missing from a
nine-hour-old process and the one line explaining why had already rotated
out of frozen_debug.log (which turns over in 15-80 minutes under load).
Every other cause had to be eliminated one at a time because the answer had
existed, briefly, and was gone.

So these hold boot_record to the properties that make it useful for exactly
that: it persists, it says ok or not ok without needing prose parsed, it
never takes the boot down with it, and it stays bounded.

    python -m pytest tests/test_boot_record.py -q
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from desktop import boot_record  # noqa: E402


@pytest.fixture
def somewhere(tmp_path):
    """Point the record at a temp file, never the real one."""
    target = tmp_path / 'logs' / 'boot_record.jsonl'
    with patch.object(boot_record, 'record_path', lambda: target):
        yield target


class TestItSurvivesToBeRead:
    def test_a_failure_is_readable_afterwards(self, somewhere):
        """The whole point: write the reason, read it back later."""
        assert boot_record.record('companion_window', False,
                                  detail='RuntimeError: boom') is True
        got = boot_record.read_recent('companion_window')
        assert len(got) == 1
        assert got[0]['ok'] is False
        assert 'boom' in got[0]['detail']

    def test_success_is_recorded_too(self, somewhere):
        """'created' vs 'never created' was the distinction nobody could
        make; recording only failures would leave it unmade."""
        boot_record.record('companion_window', True, detail='created at (1457, 572)')
        got = boot_record.read_recent('companion_window')
        assert got[0]['ok'] is True
        assert '1457' in got[0]['detail']

    def test_ok_is_a_bool_so_failures_are_greppable(self, somewhere):
        """A reader must find failures without parsing prose."""
        boot_record.record('e', True)
        boot_record.record('e', False, detail='went wrong')
        raw = somewhere.read_text(encoding='utf-8').strip().splitlines()
        assert [json.loads(r)['ok'] for r in raw] == [True, False]

    def test_newest_first_and_filtered_by_event(self, somewhere):
        for i in range(3):
            boot_record.record('companion_window', True, detail=str(i))
        boot_record.record('something_else', True)
        got = boot_record.read_recent('companion_window')
        assert [g['detail'] for g in got] == ['2', '1', '0']

    def test_every_line_carries_its_own_time(self, somewhere):
        boot_record.record('e', True)
        entry = json.loads(somewhere.read_text(encoding='utf-8').strip())
        assert isinstance(entry['ts'], float)
        assert entry['when']


class TestItNeverTakesTheBootDown:
    def test_an_unwritable_path_does_not_raise(self, tmp_path):
        """Boot must not fail because diagnostics could not be written."""
        with patch.object(boot_record, 'record_path',
                          lambda: tmp_path / 'nope' / 'x.jsonl'), \
             patch('builtins.open', side_effect=OSError('read-only')):
            assert boot_record.record('e', True) is False   # said so, no raise

    def test_a_value_that_cannot_be_json_still_writes_the_line(self, somewhere):
        """One awkward extra field must not cost the whole record."""
        boot_record.record('e', False, detail='why', obj=object())
        got = boot_record.read_recent('e')
        assert got[0]['detail'] == 'why'
        assert isinstance(got[0]['obj'], str)

    def test_a_torn_line_does_not_hide_the_rest(self, somewhere):
        boot_record.record('e', True, detail='first')
        with open(somewhere, 'a', encoding='utf-8') as fh:
            fh.write('{ this is not json\n')
        boot_record.record('e', True, detail='third')
        got = boot_record.read_recent('e')
        assert [g['detail'] for g in got] == ['third', 'first']

    def test_reading_a_file_that_does_not_exist_is_empty_not_an_error(
            self, somewhere):
        assert boot_record.read_recent() == []


class TestItStaysBounded:
    def test_it_trims_to_the_cap(self, somewhere, monkeypatch):
        monkeypatch.setattr(boot_record, 'MAX_LINES', 10)
        for i in range(25):
            boot_record.record('e', True, detail=str(i))
        lines = somewhere.read_text(encoding='utf-8').strip().splitlines()
        assert len(lines) == 10
        assert json.loads(lines[-1])['detail'] == '24'   # newest kept
        assert json.loads(lines[0])['detail'] == '15'    # oldest dropped

    def test_it_holds_far_more_than_a_rotating_log_would(self):
        """The default has to span weeks of boots; that is the whole
        improvement over frozen_debug.log."""
        assert boot_record.MAX_LINES >= 100

    def test_the_trim_is_atomic(self, somewhere, monkeypatch):
        """A reader must never catch a half-written file."""
        monkeypatch.setattr(boot_record, 'MAX_LINES', 5)
        seen = {}
        real = os.replace

        def spy(src, dst):
            seen['used'] = True
            return real(src, dst)

        with patch.object(boot_record.os, 'replace', spy):
            for i in range(12):
                boot_record.record('e', True, detail=str(i))
        assert seen.get('used'), 'trim must swap the file, not rewrite in place'


class TestItLivesWhereLogsAreLookedFor:
    def test_the_default_path_is_beside_the_other_logs(self):
        p = boot_record.record_path()
        assert p.name == 'boot_record.jsonl'
        assert p.parent.name == 'logs'
        assert 'Nunba' in str(p)


class TestTheCompanionUsesIt:
    """The reason this module exists: both outcomes of the companion's
    creation are recorded, so a missing window explains itself next boot."""

    def test_app_records_both_outcomes(self):
        app = Path(__file__).resolve().parent.parent / 'app.py'
        src = app.read_text(encoding='utf-8', errors='replace')
        assert src.count("_boot_record('companion_window'") == 2, (
            'the companion must record BOTH creation and failure; recording '
            'only one leaves "created then destroyed" and "never created" '
            'indistinguishable, which is what cost a day')
        assert "from desktop.boot_record import record as _boot_record" in src

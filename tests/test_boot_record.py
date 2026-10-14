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
import ast
import json
import logging
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


_ROOT = Path(__file__).resolve().parent.parent


def _write_build_info(d, text):
    (d / 'BUILD_INFO.txt').write_text(text, encoding='utf-8')


class TestItNamesTheBuildThatBooted:
    """Owner 10-03: every boot names the Nunba and HARTOS commits it runs.

    On 10-03 the 17:53 boot answered a 'hi' locally until 18:35 and the
    20:08 boot of the next install did not.  Neither log said which commit
    either build came from: BUILD_INFO.txt sits beside the exe and the next
    install overwrites it, and /api/harthash only answers while that build
    is still running.
    """

    def test_reads_build_info_beside_the_exe(self, tmp_path):
        _write_build_info(tmp_path, 'BUILD_SHA=aaa111\nHARTOS_SHA=bbb222\n'
                          'BUILD_TIME=2026-10-03T14:15:38Z\nBUILD_PLATFORM=win32\n')
        info = boot_record.build_identity(install_dir=str(tmp_path))
        assert info['nunba'] == 'aaa111'
        assert info['hartos'] == 'bbb222'
        assert info['build_time'] == '2026-10-03T14:15:38Z'
        assert info['source'] == 'BUILD_INFO.txt'

    def test_a_frozen_app_reads_the_file_beside_its_own_exe(
            self, tmp_path, monkeypatch):
        _write_build_info(tmp_path, 'BUILD_SHA=f00d\nHARTOS_SHA=beef\n')
        monkeypatch.setattr(sys, 'frozen', True, raising=False)
        monkeypatch.setattr(sys, 'executable', str(tmp_path / 'Nunba.exe'))
        info = boot_record.build_identity()
        assert (info['nunba'], info['hartos']) == ('f00d', 'beef')

    def test_a_missing_key_reads_unknown(self, tmp_path):
        _write_build_info(tmp_path, 'BUILD_SHA=aaa111\n')
        assert boot_record.build_identity(
            install_dir=str(tmp_path))['hartos'] == 'unknown'

    def test_the_harthash_keys_are_kept(self, tmp_path):
        """/api/harthash returns this dict; journey J243 reads these keys."""
        _write_build_info(tmp_path, 'BUILD_SHA=a\nHARTOS_SHA=b\n')
        info = boot_record.build_identity(install_dir=str(tmp_path))
        assert {'nunba', 'hartos', 'hevolveai', 'hevolve_database',
                'build_time', 'build_platform', 'source'} <= set(info)

    def test_a_source_run_asks_git_in_each_repo(self, tmp_path, monkeypatch):
        """No BUILD_INFO.txt (python main.py): HEAD of each sibling repo."""
        seen = []

        class _Done:
            returncode, stdout = 0, 'abc1234\n'

        def fake_run(cmd, **kw):
            seen.append((cmd, kw.get('cwd'), kw.get('timeout')))
            return _Done()

        monkeypatch.setattr(boot_record.subprocess, 'run', fake_run)
        info = boot_record.build_identity(install_dir=str(tmp_path),
                                          repo_root=str(tmp_path / 'Nunba'))
        assert info['source'] == 'live-git'
        assert info['build_time'] == 'dev-mode'
        assert info['nunba'] == info['hartos'] == 'abc1234'
        assert {os.path.basename(os.path.normpath(c)) for _, c, _ in seen} == {
            'Nunba', 'HARTOS', 'Hevolve_Database', 'hevolveai'}
        assert all(t for _, _, t in seen), 'every git call is bounded'

    def test_the_boot_logs_both_hashes_and_records_them(
            self, somewhere, tmp_path, caplog):
        _write_build_info(tmp_path, 'BUILD_SHA=aaa111\nHARTOS_SHA=bbb222\n'
                          'BUILD_TIME=t0\n')
        with caplog.at_level(logging.INFO, logger=boot_record.logger.name):
            boot_record.record_build_identity(install_dir=str(tmp_path))
        lines = [r.getMessage() for r in caplog.records
                 if '[BUILD]' in r.getMessage()]
        assert len(lines) == 1
        assert 'nunba=aaa111' in lines[0] and 'hartos=bbb222' in lines[0]
        got = boot_record.read_recent('build')
        assert got[0]['ok'] is True
        assert (got[0]['nunba'], got[0]['hartos']) == ('aaa111', 'bbb222')

    def test_an_unknown_hartos_is_recorded_as_not_ok(self, somewhere, tmp_path):
        """A build that cannot be traced to a HARTOS commit is greppable."""
        _write_build_info(tmp_path, 'BUILD_SHA=aaa111\nHARTOS_SHA=unknown\n')
        boot_record.record_build_identity(install_dir=str(tmp_path))
        assert boot_record.read_recent('build')[0]['ok'] is False

    def test_it_never_takes_the_boot_down(self, somewhere, tmp_path,
                                          monkeypatch):
        def boom(*a, **k):
            raise RuntimeError('reader broke')

        monkeypatch.setattr(boot_record, 'build_identity', boom)
        assert boot_record.record_build_identity(
            install_dir=str(tmp_path)) == {}


class TestEveryBootCallsIt:
    """One reader, called on every boot path."""

    @staticmethod
    def _main_tree():
        return ast.parse((_ROOT / 'main.py').read_text(
            encoding='utf-8', errors='replace'))

    def test_the_frozen_boot_names_its_build_right_after_startup(self):
        src = (_ROOT / 'app.py').read_text(encoding='utf-8', errors='replace')
        start = src.index('=== Nunba startup ===')
        call = src.find('record_build_identity()', start)
        assert 0 < call - start < 800, (
            'app.py must name the build immediately after its startup line, '
            'before anything that can fail')

    def test_a_standalone_main_names_its_build(self):
        for node in ast.walk(self._main_tree()):
            if (isinstance(node, ast.If)
                    and isinstance(node.test, ast.Compare)
                    and getattr(node.test.left, 'id', '') == '__name__'):
                calls = [n.func.id for n in ast.walk(node)
                         if isinstance(n, ast.Call)
                         and isinstance(n.func, ast.Name)]
                assert 'record_build_identity' in calls
                return
        pytest.fail("main.py has no `if __name__ == '__main__':` block")

    def test_main_has_no_second_build_info_reader(self):
        """/api/harthash calls build_identity; it does not parse the file."""
        tree = self._main_tree()
        names = [n.value for n in ast.walk(tree)
                 if isinstance(n, ast.Constant) and n.value == 'BUILD_INFO.txt']
        assert names == [], 'main.py parses BUILD_INFO.txt itself again'
        route = next(n for n in ast.walk(tree)
                     if isinstance(n, ast.FunctionDef) and n.name == 'harthash')
        called = {n.func.id for n in ast.walk(route)
                  if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        assert 'build_identity' in called

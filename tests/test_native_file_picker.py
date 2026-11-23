"""Every desktop has ONE native file picker, not only macOS.

Measured 2026-10-10: ``native_file_pick`` was defined inside the
``if sys.platform == 'darwin'`` class in app.py, so on Windows and Linux the
JS api (WindowApi) had only ``window_*`` methods.  The SPA's PDF / image
buttons asked for the picker, found none, and uploaded nothing.

Run: python -m pytest tests/test_native_file_picker.py --noconftest -p no:capture
"""
import ast
import enum
import sys
import types
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]


class _FakeWindow:
    def __init__(self, result):
        self._result = result
        self.calls = []

    def create_file_dialog(self, dialog_type=10, directory='', allow_multiple=False,
                           save_filename='', file_types=()):
        self.calls.append({'dialog_type': dialog_type, 'allow_multiple': allow_multiple})
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


@pytest.fixture
def fake_webview(monkeypatch):
    """pywebview 6.x: FileDialog.OPEN is the dialog type; OPEN_DIALOG is deprecated."""
    mod = types.ModuleType('webview')

    class FileDialog(enum.IntEnum):
        OPEN = 10
        FOLDER = 20
        SAVE = 30

    mod.FileDialog = FileDialog
    mod.OPEN_DIALOG = 10
    monkeypatch.setitem(sys.modules, 'webview', mod)
    return mod


def _picker(window):
    from desktop.native_api_window import FilePickerApi
    return FilePickerApi(lambda: window)


class TestNativeFilePick:
    def test_returns_the_path_the_person_chose(self, fake_webview):
        win = _FakeWindow(('C:\\Users\\a\\Documents\\book.pdf',))
        assert _picker(win).native_file_pick('pdf') == 'C:\\Users\\a\\Documents\\book.pdf'

    def test_asks_for_one_file_with_the_open_dialog(self, fake_webview):
        win = _FakeWindow(('x.pdf',))
        _picker(win).native_file_pick('pdf')
        assert win.calls == [{'dialog_type': 10, 'allow_multiple': False}]

    def test_a_cancelled_dialog_is_an_empty_string(self, fake_webview):
        assert _picker(_FakeWindow(None)).native_file_pick() == ''
        assert _picker(_FakeWindow(())).native_file_pick() == ''

    def test_a_dialog_that_raises_is_an_empty_string(self, fake_webview):
        assert _picker(_FakeWindow(RuntimeError('no form'))).native_file_pick() == ''

    def test_no_window_is_an_empty_string(self, fake_webview):
        assert _picker(None).native_file_pick() == ''

    def test_a_getter_that_raises_is_an_empty_string(self, fake_webview):
        from desktop.native_api_window import FilePickerApi

        def boom():
            raise RuntimeError('window not created')

        assert FilePickerApi(boom).native_file_pick() == ''

    def test_an_older_pywebview_with_only_open_dialog_still_works(self, monkeypatch):
        mod = types.ModuleType('webview')
        mod.OPEN_DIALOG = 10
        monkeypatch.setitem(sys.modules, 'webview', mod)
        win = _FakeWindow(('x.pdf',))
        assert _picker(win).native_file_pick() == 'x.pdf'
        assert win.calls[0]['dialog_type'] == 10


class _FakeSaveWindow:
    """create_file_dialog as pywebview answers a SAVE: a one-path tuple
    (Windows), a bare string (some platforms) or None (cancelled)."""

    def __init__(self, result):
        self._result = result
        self.calls = []

    def create_file_dialog(self, dialog_type=10, directory='', allow_multiple=False,
                           save_filename='', file_types=()):
        self.calls.append({'dialog_type': dialog_type, 'save_filename': save_filename})
        return self._result


class TestNativeFileSave:
    """The desktop window refuses page downloads, so the audit trail's Export
    hands its text here and the person picks where it goes.  A cancel, a
    failed write and a save are three different answers (review of
    41cd8060: a failed write read as a cancel)."""

    def test_writes_the_text_where_the_person_chose(self, fake_webview, tmp_path):
        target = tmp_path / 'audit_54.jsonl'
        win = _FakeSaveWindow((str(target),))
        body = '{"a": 1}\n{"b": "é"}\n'
        res = _picker(win).native_file_save('audit_54.jsonl', body)
        assert res == {'saved': True, 'path': str(target)}
        assert target.read_text(encoding='utf-8') == body
        assert win.calls == [{'dialog_type': 30, 'save_filename': 'audit_54.jsonl'}]

    def test_a_bare_string_answer_is_a_path_too(self, fake_webview, tmp_path):
        target = tmp_path / 'x.jsonl'
        res = _picker(_FakeSaveWindow(str(target))).native_file_save('x.jsonl', 'z')
        assert res == {'saved': True, 'path': str(target)}
        assert target.read_text(encoding='utf-8') == 'z'

    def test_the_suggested_name_is_only_a_file_name(self, fake_webview, tmp_path):
        win = _FakeSaveWindow(None)
        _picker(win).native_file_save('..\\..\\Windows\\evil.jsonl', 'z')
        assert win.calls[0]['save_filename'] == 'evil.jsonl'

    def test_a_cancelled_dialog_says_cancelled_and_writes_nothing(self, fake_webview, tmp_path):
        assert _picker(_FakeSaveWindow(None)).native_file_save('x.jsonl', 'z') == {
            'saved': False, 'cancelled': True}
        assert list(tmp_path.iterdir()) == []

    def test_an_unwritable_place_is_an_error_not_a_cancel(self, fake_webview, tmp_path):
        missing = tmp_path / 'no_such_dir' / 'x.jsonl'
        res = _picker(_FakeSaveWindow((str(missing),))).native_file_save('x.jsonl', 'z')
        assert res['saved'] is False and 'cancelled' not in res
        assert str(missing) in res['error']

    def test_non_text_is_refused_before_a_chosen_file_is_touched(self, fake_webview, tmp_path):
        target = tmp_path / 'keep.jsonl'
        target.write_text('already here', encoding='utf-8')
        win = _FakeSaveWindow((str(target),))
        res = _picker(win).native_file_save('keep.jsonl', {'not': 'text'})
        assert res == {'saved': False, 'error': 'only text can be saved'}
        assert win.calls == [], 'the dialog opened for a refused save'
        assert target.read_text(encoding='utf-8') == 'already here'

    def test_no_window_is_an_error(self, fake_webview):
        res = _picker(None).native_file_save('x.jsonl', 'z')
        assert res['saved'] is False and res['error']


class TestComposeJsApi:
    def test_a_window_only_host_gets_the_picker_beside_the_window_methods(self, fake_webview):
        from desktop.native_api_window import FilePickerApi, WindowApi, compose_js_api

        window = _FakeWindow(('C:\\b.pdf',))
        api = compose_js_api(WindowApi(lambda: window), FilePickerApi(lambda: window))

        assert callable(api.window_minimize)
        assert api.native_file_pick('pdf') == 'C:\\b.pdf'

    def test_a_platform_api_keeps_its_own_methods_and_gains_both(self, fake_webview):
        from desktop.native_api_window import (
            WINDOW_API_METHODS,
            FilePickerApi,
            WindowApi,
            compose_js_api,
        )

        class PlatformApi:  # stands in for the macOS class (mic, camera)
            def native_mic_start(self):
                return 'ok'

        window = _FakeWindow(('/Users/a/b.pdf',))
        platform_api = PlatformApi()
        api = compose_js_api(WindowApi(lambda: window), FilePickerApi(lambda: window),
                             platform_api)

        assert api is platform_api
        assert api.native_mic_start() == 'ok'
        assert api.native_file_pick() == '/Users/a/b.pdf'
        for name in WINDOW_API_METHODS:
            assert callable(getattr(api, name)), name

    def test_the_composed_methods_are_the_ones_pywebview_exposes_to_js(self, fake_webview):
        """pywebview exposes inspect.ismethod() attributes found by dir(api)."""
        import inspect

        from desktop.native_api_window import FilePickerApi, WindowApi, compose_js_api

        api = compose_js_api(WindowApi(lambda: None), FilePickerApi(lambda: None))
        exposed = {n for n in dir(api)
                   if not n.startswith('_') and inspect.ismethod(getattr(api, n))}
        assert 'native_file_pick' in exposed
        assert 'native_file_save' in exposed
        assert 'window_minimize' in exposed

    def test_window_api_methods_lists_every_window_method(self):
        """A window_* method missing from the list would vanish on macOS."""
        from desktop.native_api_window import WINDOW_API_METHODS, WindowApi

        defined = {n for n in dir(WindowApi)
                   if n.startswith('window_') and callable(getattr(WindowApi, n))}
        assert defined == set(WINDOW_API_METHODS)


class TestAppUsesTheOnePicker:
    @staticmethod
    def _tree():
        return ast.parse((REPO_ROOT / 'app.py').read_text(encoding='utf-8'))

    def test_app_does_not_define_a_second_picker(self):
        defs = [n.name for n in ast.walk(self._tree())
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        assert 'native_file_pick' not in defs

    def test_app_builds_its_js_api_through_compose_js_api(self):
        calls = [n for n in ast.walk(self._tree())
                 if isinstance(n, ast.Call)
                 and getattr(n.func, 'id', None) == 'compose_js_api']
        assert len(calls) == 1

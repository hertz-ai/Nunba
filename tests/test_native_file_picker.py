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

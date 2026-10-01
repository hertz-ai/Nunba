"""A native crash (access violation in cv2.pyd, 2026-10-01 20:21) left no trace
because nothing enabled faulthandler.  Pin the wiring in app.py and the
capture behaviour it relies on."""
import ast
import os
import subprocess
import sys
import textwrap

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.py')


def _calls(tree, dotted):
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func
            if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
                if f'{f.value.id}.{f.attr}' == dotted:
                    yield node


def test_app_enables_faulthandler_on_a_real_file_for_all_threads():
    with open(APP, encoding='utf-8') as fh:
        tree = ast.parse(fh.read())
    calls = list(_calls(tree, '_faulthandler.enable'))
    assert calls, "app.py must call faulthandler.enable"
    kw = {k.arg: k.value for k in calls[0].keywords}
    assert 'file' in kw, "needs its own file: frozen stderr has no fd"
    assert isinstance(kw.get('all_threads'), ast.Constant) and kw['all_threads'].value is True


def test_faulthandler_writes_the_native_crash_to_the_file(tmp_path):
    log = tmp_path / 'native_crash.log'
    code = textwrap.dedent(f"""
        import faulthandler, ctypes
        f = open(r'{log}', 'a', encoding='utf-8')
        faulthandler.enable(file=f, all_threads=True)
        ctypes.string_at(0)
    """)
    subprocess.run([sys.executable, '-c', code], capture_output=True, timeout=60)
    text = log.read_text(encoding='utf-8')
    assert 'fatal exception' in text.lower() or 'Fatal Python error' in text

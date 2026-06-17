"""Frozen `-c` subprocess entry behaviour for app.py.

HARTOS service supervisors (hevolveai_supervisor, gpu_worker,
diarization_service) spawn a child interpreter with
``subprocess.run([<python>, '-c', <code>])``.  On Windows the child is
``python-embed/python.exe`` (a real interpreter).  The macOS/Linux frozen
bundle has NO python-embed, so the supervisors' ``_resolve_python_exe()``
falls back to ``sys.executable`` -- which is the Nunba GUI binary itself.

Without an explicit ``-c`` shim near the top of app.py, that frozen binary
ignores ``-c``, boots app.py's __main__ GUI path, and the single-instance
guard pings the live GUI's ``/api/focus`` on a retry-backoff loop --
bouncing the Dock and stealing focus (macOS incident 2026-06-15: 82 pings
in one run) while the intended child server never starts.

These tests pin the fix: ``app.py -c <code>`` must behave like
``python -c <code>`` -- run the code as ``__main__``, honour its exit
code, forward stdout, and NEVER reach the single-instance guard.
"""
import os
import subprocess
import sys

import pytest

# The `-c` shim is gated to macOS in app.py (Windows uses python-embed's
# real interpreter; the frozen .exe is never invoked with `-c` there).  So
# these behavioural tests only apply on darwin — on Windows/Linux `app.py
# -c …` deliberately falls through to the GUI path and would hang.
pytestmark = pytest.mark.skipif(
    sys.platform != "darwin",
    reason="frozen `-c` shim is macOS-only (Windows uses python-embed)",
)

_APP_PY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py")


def _run_c(code, *extra_args, timeout=60):
    """Invoke `python app.py -c <code> [extra_args]` and capture result."""
    env = dict(os.environ)
    # Make sure a stray real instance / test harness env can't change behaviour.
    env.pop("NUNBA_SKIP_SINGLE_INSTANCE", None)
    return subprocess.run(
        [sys.executable, _APP_PY, "-c", code, *extra_args],
        capture_output=True, text=True, timeout=timeout, env=env,
    )


def test_dash_c_runs_code_and_honours_exit_code():
    """`app.py -c 'sys.exit(7)'` exits 7 -- proves the code ran, not the GUI."""
    proc = _run_c("import sys; sys.exit(7)")
    assert proc.returncode == 7, (
        f"expected exit 7 from the -c code, got {proc.returncode}. "
        f"stdout={proc.stdout[:200]!r} stderr={proc.stderr[-400:]!r}"
    )


def test_dash_c_forwards_stdout():
    """stdout from the -c code must reach the parent (supervisor pipe)."""
    proc = _run_c("import sys; sys.stdout.write('BRAIN_OK'); sys.stdout.flush()")
    assert proc.returncode == 0, f"stderr={proc.stderr[-400:]!r}"
    assert "BRAIN_OK" in proc.stdout, f"stdout={proc.stdout!r}"


def test_dash_c_runs_as_main():
    """The exec'd code sees __name__ == '__main__' (python -c semantics)."""
    proc = _run_c("import sys; sys.exit(0 if __name__ == '__main__' else 3)")
    assert proc.returncode == 0, (
        f"__name__ was not '__main__' (rc={proc.returncode}); "
        f"stderr={proc.stderr[-400:]!r}"
    )


def test_dash_c_does_not_ping_focus_or_boot_gui():
    """The -c path must short-circuit BEFORE _check_single_instance().

    If the guard ran, the code below would not be the only thing executed:
    the marker proves we exited via the -c handler, fast, with no GUI
    import side effects (which would blow the 20s budget and/or import
    webview).  `webview` must NOT be imported by the -c path.
    """
    proc = _run_c(
        "import sys; "
        "assert 'webview' not in sys.modules, 'GUI path booted'; "
        "sys.stdout.write('NOGUI'); sys.exit(0)",
        timeout=30,
    )
    assert proc.returncode == 0, (
        f"GUI booted or guard ran on the -c path; "
        f"stdout={proc.stdout[:200]!r} stderr={proc.stderr[-400:]!r}"
    )
    assert "NOGUI" in proc.stdout


def test_dash_c_argv_matches_python_semantics():
    """argv[0] == '-c' and post-code args follow, like real `python -c`."""
    proc = _run_c(
        "import sys; sys.exit(0 if sys.argv == ['-c', 'A', 'B'] else 5)",
        "A", "B",
    )
    assert proc.returncode == 0, (
        f"argv did not match python -c semantics (rc={proc.returncode}); "
        f"stderr={proc.stderr[-400:]!r}"
    )


# ── `-m` module entry (gpu_worker / TTS / STT / VLM / diarization / vision) ──
# These spawn ``[<python>, '-u', '-m', <module>, *args]``.  On the frozen
# macOS .app sys.executable is the GUI binary, so without the shim each spawn
# booted the GUI and the single-instance guard stole focus every ~2s while a
# worker (e.g. Whisper STT) retried.  The shim must run the module instead.

def _run_m(*args, timeout=60):
    """Invoke `python app.py <args>` (e.g. '-u','-m','calendar',...)."""
    env = dict(os.environ)
    env.pop("NUNBA_SKIP_SINGLE_INSTANCE", None)
    return subprocess.run(
        [sys.executable, _APP_PY, *args],
        capture_output=True, text=True, timeout=timeout, env=env,
    )


def test_dash_m_runs_module_as_main():
    """`app.py -m calendar 2025 1` runs the module (prints), not the GUI."""
    proc = _run_m("-m", "calendar", "2025", "1")
    assert proc.returncode == 0, (
        f"expected the -m module to run (rc 0), got {proc.returncode}. "
        f"stdout={proc.stdout[:200]!r} stderr={proc.stderr[-400:]!r}"
    )
    assert "2025" in proc.stdout, (
        f"module stdout not forwarded / args not passed; stdout={proc.stdout!r}"
    )


def test_dash_u_m_skips_leading_u_flag():
    """`-u` before `-m` must be skipped (gpu_worker spawns `-u -m <module>`)."""
    proc = _run_m("-u", "-m", "calendar", "2025", "1")
    assert proc.returncode == 0, (
        f"-u -m did not run the module (rc={proc.returncode}); "
        f"stdout={proc.stdout[:200]!r} stderr={proc.stderr[-400:]!r}"
    )
    assert "2025" in proc.stdout


def test_dash_m_missing_module_fails_without_booting_gui():
    """A missing `-m` module must fail fast (non-zero), NOT boot the GUI.

    If the GUI booted it would hit the single-instance guard and exit 0
    (stealing focus en route), or hang on webview.  A non-zero exit proves
    runpy ran and raised ModuleNotFoundError on the worker path instead.
    """
    proc = _run_m("-m", "nunba_no_such_worker_module_zzz", timeout=30)
    assert proc.returncode != 0, (
        f"missing -m module unexpectedly exited 0 — GUI/single-instance path "
        f"likely ran; stdout={proc.stdout[:200]!r} stderr={proc.stderr[-400:]!r}"
    )

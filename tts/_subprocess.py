"""Shared subprocess helpers for TTS modules.

ADAPTER, not an implementation.  The console-hiding flags have exactly ONE
source: ``desktop.platform_utils.get_subprocess_flags()``.

Why this module still exists rather than being deleted: six TTS modules import
``hidden_startupinfo`` **by name** and expect the ``(startupinfo,
creationflags)`` TUPLE shape — package_installer, backend_venv, piper_tts,
vibevoice_tts and ``_torch_probe``, the last of which runs *inside a venv
subprocess*.  Changing that signature would break the worker, so the tuple API
is preserved and only the implementation moved out.

Background (2026-08-11): eleven first-party copies of the same six-line
STARTUPINFO/CREATE_NO_WINDOW block had accumulated, and the copy that looked
canonical — ``platform_utils.get_subprocess_flags``, in the module whose
docstring advertises "Console window hiding", pinned by three test files — had
ZERO production callers.  The load-bearing copy was this one.  See
``tests/test_hidden_subprocess_single_source.py``.
"""


def hidden_startupinfo():
    """Return ``(startupinfo, creationflags)`` to hide console windows on Windows.

    Usage (unchanged for all existing callers)::

        si, cf = hidden_startupinfo()
        subprocess.run(cmd, startupinfo=si, creationflags=cf, ...)

    Delegates to the single canonical implementation and reshapes its kwargs
    dict into the tuple this module's callers expect.

    The import is fenced because this module is imported inside venv worker
    subprocesses.  Both ``tts`` and ``desktop`` resolve from the same sys.path
    root (a worker that can import ``tts._subprocess`` can import
    ``desktop.platform_utils``, and both are listed in
    ``scripts/setup_freeze_nunba.py`` packages[]), so the fallback should be
    unreachable — but hiding a console is cosmetic, never correctness, so a
    bundling surprise must degrade to "console visible" rather than kill TTS.
    """
    try:
        from desktop.platform_utils import get_subprocess_flags
        flags = get_subprocess_flags()
        return flags.get('startupinfo'), flags.get('creationflags', 0)
    except Exception:
        return None, 0

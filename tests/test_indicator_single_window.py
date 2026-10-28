"""The AI-control ribbon is built once, and run on the thread that built it.

Measured in a dev run (2026-10-21, transcript; stderr only, no log file):

    Exception in thread Thread-3 (create_window):
      File "...\\desktop\\indicator_window.py", line 980, in create_window
        _indicator_window.ribbon_window.mainloop()
    RuntimeError: Calling Tcl from different apartment

main.py starts initialize_indicator() then toggle_indicator(False).
initialize_indicator slept a fixed 0.5 s and toggle_indicator, still seeing
_indicator_window None because building takes ~1 s, started a SECOND
create_window thread.  Each thread then ran mainloop() on whatever the shared
global held -- the other thread's Tk.  server.log 2026-10-22 11:58:58 shows
the pair (two "Ribbon tab created" 2 ms apart); the installed app's gui_app.log
12:15:06-09 shows it too, 0.9 s apart, which only missed colliding by luck and
still leaked a window.
"""
import threading
import time
import types

import pytest


@pytest.fixture
def iw(monkeypatch):
    mod = pytest.importorskip('desktop.indicator_window')
    built = []
    stop = threading.Event()

    class SlowRibbon:
        """Takes ~1 s to build, as the real ribbon measured."""

        def __init__(self, server_port=5000):
            time.sleep(1.0)
            self.built_on = threading.get_ident()
            self.ran_on = None
            built.append(self)
            self.ribbon_window = types.SimpleNamespace(mainloop=self._mainloop)

        def _mainloop(self):
            self.ran_on = threading.get_ident()
            stop.wait(10)

        def hide(self):
            pass

        def show(self):
            pass

    monkeypatch.setattr(mod, 'RibbonIndicator', SlowRibbon)
    monkeypatch.setattr(mod, '_indicator_window', None)
    monkeypatch.setattr(mod, '_window_thread', None)
    monkeypatch.setattr(mod, 'indicator_active', False)
    mod._built = built
    yield mod
    stop.set()


def test_startup_sequence_builds_one_ribbon(iw):
    """main.py's exact sequence: initialize, then toggle hidden."""
    iw.initialize_indicator()
    iw.toggle_indicator(False)
    time.sleep(1.5)  # long enough for a second build to finish if one started
    assert len(iw._built) == 1, (
        f"{len(iw._built)} ribbons built; the second one's mainloop runs on "
        "another thread's Tk ('Calling Tcl from different apartment')")


def test_concurrent_initialisers_build_one_ribbon(iw):
    """main.py's import-time init and app.py's delayed init can overlap."""
    ts = [threading.Thread(target=iw.initialize_indicator) for _ in range(3)]
    for t in ts:
        t.start()
    for t in ts:
        t.join(10)
    time.sleep(1.5)
    assert len(iw._built) == 1


def test_mainloop_runs_on_the_thread_that_built_the_ribbon(iw):
    iw.initialize_indicator()
    iw.toggle_indicator(False)
    time.sleep(1.5)
    for ribbon in iw._built:
        assert ribbon.ran_on == ribbon.built_on


def test_initialize_returns_once_the_ribbon_exists(iw):
    """No fixed sleep: a caller that shows right after init finds a window."""
    iw.initialize_indicator()
    assert iw._indicator_window is not None

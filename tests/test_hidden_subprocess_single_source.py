"""Console-hiding flags must have ONE implementation, and Windows spawns must use it.

Reported live 2026-08-11: console windows flashing during the TTS/STT engine
install.  Investigating it found the opposite of the filed diagnosis and a
textbook parallel path.

WHAT THE INVESTIGATION ACTUALLY FOUND (all measured, not inferred):

  * The pip/install path was ALREADY guarded — tts/package_installer.py and
    tts/backend_venv.py call `hidden_startupinfo()` at every spawn, and the
    SHIPPED build carries it (grep of the installed
    lib/tts/package_installer.pyc at BUILD_SHA=0f9151da found the symbol).  So
    "the pip path lacks the flags" was false.
  * Instead there were **11 first-party copies** of the same six-line
    `subprocess.STARTUPINFO(); dwFlags |= STARTF_USESHOWWINDOW; wShowWindow = 0;
    CREATE_NO_WINDOW` block across desktop/, llama/, main.py, scripts/ and tts/.
  * Worse, the copy that LOOKED canonical was dead.
    `desktop/platform_utils.get_subprocess_flags()` lives in the module whose
    docstring advertises "Console window hiding" and is pinned by THREE test
    files (test_desktop_module, test_cross_platform, test_platform_utils) — yet
    it had ZERO production callers.  The load-bearing helper was
    `tts/_subprocess.hidden_startupinfo()`: 6 production consumers, no test.

    Tested-but-unused, while the used one is untested.  That is the same shape as
    the rest of this codebase's recurring defect — the artifact that looks
    authoritative is not the one doing the work — and it is why three passing
    test files did not prevent 11 copies from accumulating.

THE CONTRACT THESE TESTS PIN

  1. Exactly ONE place constructs the flags: `desktop.platform_utils`.
     `tts._subprocess.hidden_startupinfo` stays as a thin tuple-shaped ADAPTER
     over it (6 existing consumers keep their API, and it must not re-implement).
  2. `get_subprocess_flags()` is not dead — production code calls it.
  3. New `subprocess.STARTUPINFO()` constructions outside the canonical home fail
     here, so copy #12 cannot land quietly.

WHY `desktop.platform_utils` IS THE RIGHT HOME (checked, not assumed): it imports
only logging/os/subprocess/sys, so it is safe to import from a venv worker
subprocess — `tts/_torch_probe.py` needs the helper from inside one.  A
GUI-importing home would have broken that worker.

EXEMPTIONS, each with a reason (not a convenience list):
  * `scripts/` — developer-run tools.  A visible console there is desirable, and
    they must stay runnable standalone without importing desktop/.
  * platform-gated spawns (`ioreg`, `sysctl`, `system_profiler`, `xdg-mime`,
    `xdpyinfo`, `glslc` behind a linux/darwin branch) are exempt from the
    "must pass flags" rule: there is no Windows console to hide on a code path
    that cannot execute on Windows.  Guarding them would be a no-op the helper
    already returns ({} off-win32), so the value is zero and the diff noise real.
"""
import ast
import pathlib
import re

import pytest

REPO = pathlib.Path(__file__).resolve().parent.parent
CANONICAL_MODULE = 'desktop/platform_utils.py'
ADAPTER_MODULE = 'tts/_subprocess.py'

# Trees that are not ours to police.
_SKIP_DIRS = ('.venv', 'venv', '__pycache__', 'python-embed', 'node_modules',
              'build', 'site-packages', '.pycharm_plugin', 'hub_deps', 'dist',
              'python-embed-broken-20260502')


def _first_party_py():
    for p in REPO.rglob('*.py'):
        s = p.as_posix()
        if any(('/' + d + '/') in s for d in _SKIP_DIRS):
            continue
        rel = s.replace(REPO.as_posix() + '/', '')
        if rel.startswith('tests/'):
            continue
        yield rel, p


def test_startupinfo_is_constructed_in_exactly_one_place():
    """RED before the fix: 11 copies.

    Every extra copy is a place the flags can silently diverge (one forgets
    CREATE_NO_WINDOW, another forgets SW_HIDE) and a place a reviewer has to
    re-check.  `scripts/` is exempt — see the module docstring.
    """
    offenders = []
    for rel, p in _first_party_py():
        if rel.startswith('scripts/'):
            continue
        try:
            txt = p.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        for i, line in enumerate(txt.splitlines(), 1):
            if 'subprocess.STARTUPINFO()' in line and not line.strip().startswith('#'):
                offenders.append(f'{rel}:{i}')

    assert offenders == [f'{CANONICAL_MODULE}:426'] or (
        len(offenders) == 1 and offenders[0].startswith(CANONICAL_MODULE)), (
        'the console-hiding flag block is constructed in more than one place:\n  '
        + '\n  '.join(offenders)
        + f'\n\nCall {CANONICAL_MODULE}::get_subprocess_flags() instead — it is '
          'the single source and is import-light enough for venv workers. '
          'Duplicates drift: one copy forgets CREATE_NO_WINDOW, another forgets '
          'SW_HIDE, and a console flashes in the frozen GUI app.')


def test_canonical_helper_has_production_callers():
    """Guard against the exact trap this bug was hiding in.

    `get_subprocess_flags()` was pinned by three test files while NO production
    code called it — passing tests over dead code, which is why 11 duplicates
    accumulated unnoticed.  A helper only prevents duplication if it is actually
    reached.
    """
    callers = []
    for rel, p in _first_party_py():
        if rel == CANONICAL_MODULE:
            continue
        try:
            txt = p.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        if 'get_subprocess_flags' in txt:
            callers.append(rel)

    assert callers, (
        'get_subprocess_flags() has no production callers — it is tested but '
        'dead, exactly the state that let 11 inline copies accumulate. Route '
        'the Windows spawn sites through it.')


def test_tts_adapter_delegates_and_does_not_reimplement():
    """`hidden_startupinfo` keeps its tuple API but must not own the logic.

    6 TTS modules (package_installer, backend_venv, piper_tts, vibevoice_tts,
    _torch_probe) import it, and _torch_probe runs inside a venv subprocess, so
    the signature must not change.  It may adapt; it may not duplicate.
    """
    src = (REPO / ADAPTER_MODULE).read_text(encoding='utf-8', errors='replace')

    assert 'subprocess.STARTUPINFO()' not in src, (
        f'{ADAPTER_MODULE} still builds the STARTUPINFO itself — it must call '
        'desktop.platform_utils.get_subprocess_flags() and merely reshape the '
        'result into the (startupinfo, creationflags) tuple its callers expect.')
    assert 'get_subprocess_flags' in src, (
        f'{ADAPTER_MODULE} no longer delegates to the canonical helper')

    tree = ast.parse(src)
    names = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    assert 'hidden_startupinfo' in names, (
        'hidden_startupinfo was removed — 6 TTS modules import it by name, '
        'including _torch_probe which runs inside a venv subprocess')


@pytest.mark.parametrize('site', [
    # (file, symbol that must appear near the spawn) — Windows-reachable spawns
    # that were flashing a console.  Each was verified reachable on win32:
    # not behind a darwin/linux branch, and not a scripts/ dev tool.
    ('app.py', 'get_subprocess_flags'),
    ('main.py', 'get_subprocess_flags'),
    ('llama/llama_installer.py', 'get_subprocess_flags'),
])
def test_windows_reachable_spawn_modules_use_the_canonical_flags(site):
    """These modules spawn on Windows at runtime and must hide the console."""
    rel, symbol = site
    src = (REPO / rel).read_text(encoding='utf-8', errors='replace')
    assert symbol in src, (
        f'{rel} spawns subprocesses on Windows but never references {symbol}; '
        'each unguarded spawn flashes a console window in the frozen GUI app.')


def test_no_timeoutless_spawn_in_the_canonical_home():
    """Standing repo rule: no spawn without a timeout (the 27-min wmic hang).

    Scoped to the canonical module so the rule is enforced where the shared
    primitive lives, rather than asserting it repo-wide in this test.
    """
    src = (REPO / CANONICAL_MODULE).read_text(encoding='utf-8', errors='replace')
    calls = [m.start() for m in re.finditer(r'subprocess\.(run|Popen|call)\s*\(', src)]
    for pos in calls:
        window = src[pos:pos + 400]
        # register_protocol/autostart spawns are fire-and-forget OS registrations
        # on non-Windows; they are allowed check=False without a timeout.
        if 'check=False' in window or 'timeout' in window:
            continue
        pytest.fail(
            f'{CANONICAL_MODULE} has a subprocess call at offset {pos} with '
            'neither a timeout nor check=False — a hung child would wedge the '
            'desktop app with no recovery.')

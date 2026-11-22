"""A test run starts no real model server, and llama's files stay out of the
person's home.

21 Nov 2026: two runs of tests/test_chatbot_routes.py each started a real
llama-server from ~/.nunba/llama.cpp with the owner's model (ports 8082 and
8083, about 4 GB of video memory each, left running after the run), rewrote
~/.nunba/llama_config.json (server_port 8083) and ~/.nunba/server_status.json.

Two ways in.  TestChatRoute.test_chat_local_fallback_returns_response posts
/chat with no model reachable; the route answers "starting" and calls
get_orchestrator().ensure_loaded_async('llm') (routes/chatbot_routes.py),
whose background thread runs models/orchestrator.py LlamaLoader.load:
LlamaConfig() on ~/.nunba, _save_config(), start_server(), and in
_do_start_server the subprocess.Popen of llama-server.  And any test that
imports main starts its _boot_main_server thread, which calls
cfg.start_server() too.  Either thread gets there after the test has passed,
so nothing a fixture sets is still in place.

tests/hermetic_run.install() sets, for the whole process (tests/conftest.py
calls it at import; a runner that loads no conftest.py calls it itself):
  - an audit hook, on every event through which Python starts a program,
    that refuses every start of llama-server, whichever class, shell or
    launcher it goes through, and (unless NUNBA_TEST_INSTALLED_APP=1) every
    start of the installed Nunba and every stop of Nunba by name;
  - the app's own switches that keep main from booting a model;
  - NUNBA_TEST_HOME, a private folder that llama.llama_installer.home_dir
    returns in place of the person's home.

Nothing here starts llama-server: where a start is checked, the call that
asks the operating system for a process is a recorder.
"""
import ast
import json
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# The first import of llama.llama_config or models.orchestrator pulls in
# HARTOS (transformers); cold, on a busy disk, that alone passed the
# default 60 s.
pytestmark = pytest.mark.timeout(300)

# How things stood while test modules were being imported, before any fixture
# of any test had run.
_REFUSAL_AT_IMPORT = getattr(subprocess, 'refuses_model_servers', False)
_SWITCHES_AT_IMPORT = {name: os.environ.get(name) for name in (
    'HEVOLVE_EAGER_LLM', 'NUNBA_DISABLE_LLAMA_AUTOSTART', 'HEVOLVE_DRAFT_FIRST')}


def _home_dir():
    """llama's home lookup, by whichever name this tree has it."""
    from llama import llama_installer
    lookup = getattr(llama_installer, 'home_dir', None) or getattr(
        llama_installer, '_home_dir', Path.home)
    return lookup()


# ---------------------------------------------------------------------------
# No llama-server start
# ---------------------------------------------------------------------------

class _ReachedTheOS(Exception):
    """Raised by the recorder in place of creating a process."""


@pytest.fixture
def handed_to_the_os(monkeypatch):
    """Record every command subprocess asks the operating system to start,
    and start none of them: the recorder stands where CreateProcess (Windows)
    or fork_exec (elsewhere) is called, below every Popen class."""
    reached = []

    def record(*args, **kwargs):
        reached.append(args[1] if sys.platform == 'win32' else list(args[0]))
        raise _ReachedTheOS()

    if sys.platform == 'win32':
        monkeypatch.setattr(subprocess._winapi, 'CreateProcess', record)
    else:
        monkeypatch.setattr(subprocess, '_fork_exec', record)
    return reached


def _try_to_start(command, popen=None, **kwargs):
    try:
        (popen or subprocess.Popen)(command, **kwargs)
    except _ReachedTheOS:
        return None
    except Exception as refusal:      # the refusal is the wanted outcome
        return refusal
    return None


_BIN = os.path.join('C:', os.sep, 'Users', 'someone', '.nunba', 'llama.cpp',
                    'build', 'bin', 'Release')
_EXE = os.path.join(_BIN, 'llama-server.exe')

LLAMA_SERVER_STARTS = [
    # The shape _do_start_server builds: a list, the binary's full path first.
    [_EXE, '--model', 'm.gguf', '--port', '8082'],
    ['C:/Users/someone/.trueflow/llama.cpp/build/bin/llama-server.exe', '--port', '8083'],
    ['/usr/local/bin/llama-server', '--port', '8080'],
    ['llama-server'],
    ['LLAMA-SERVER.EXE', '--port', '8081'],
    [Path(_BIN) / 'llama-server.exe', '--port', '8082'],
    (_EXE, '--port', '8082'),
    'llama-server --port 8082',
    '"C:\\Program Files\\llama.cpp\\llama-server.exe" --port 8082',
    Path(_BIN) / 'llama-server.exe',
    # Through a shell (review of bfd0fcdf: the program-name check missed these).
    ['cmd', '/c', 'llama-server', '--port', '8082'],
    ['cmd.exe', '/c', _EXE, '--port', '8082'],
    ['cmd', '/c', 'start', '/b', 'llama-server', '--port', '8082'],
    ['cmd', '/c', 'echo starting && llama-server --port 8082'],
    'cmd /c llama-server --port 8082',
    'cmd /c "C:\\Program Files\\llama.cpp\\llama-server.exe" --port 8082',
    ['powershell', '-NoProfile', '-Command', "& 'C:\\x y\\llama-server.exe' --port 8082"],
    ['sh', '-c', 'cd /tmp; exec /usr/local/bin/llama-server --port 8082'],
    ['bash', '-c', 'true || llama-server'],
    ['cmd', '/c', 'cmd', '/c', 'llama-server'],
    # Through a launcher (review of 604a9825: a rule that looked for the start
    # itself let each of these reach the operating system).
    ['cmd', '/c', 'start', '/wait', 'llama-server'],
    ['cmd', '/c', 'start', '/min', 'llama-server'],
    ['cmd', '/c', 'timeout 1 > nul & llama-server'],
    ['powershell', '-Command', 'Start-Process llama-server'],
    ['powershell', '-Command',
     "Start-Process -FilePath 'C:\\a b\\llama-server.exe' -ArgumentList '--port 1'"],
    ['wmic', 'process', 'call', 'create', 'llama-server.exe'],
    ['wmic', 'process', 'call', 'create', 'C:\\x\\llama-server.exe --port 1'],
    ['explorer.exe', _EXE],
    ['a-wrapper-nobody-listed', '--binary', _EXE],
    ['"C:\\Program Files\\Git\\bin\\bash.exe"', '-c', 'llama-server'],
]


@pytest.mark.parametrize('command', LLAMA_SERVER_STARTS, ids=repr)
def test_a_llama_server_start_never_reaches_the_operating_system(
        command, handed_to_the_os):
    refusal = _try_to_start(command, cwd=None, env=dict(os.environ))

    assert handed_to_the_os == [], (
        'a test process handed a llama-server start to the operating system')
    assert isinstance(refusal, OSError), refusal
    assert 'subprocess.Popen' in str(refusal), (
        'the refusal must say how a test checks a start')


@pytest.mark.parametrize('command', [
    'llama-server --port 8082',
    'echo starting && llama-server --port 8082',
    'start "" llama-server --port 1',
    'start /wait llama-server --port 1',
    'start /b "" "C:\\Program Files\\llama.cpp\\llama-server.exe"',
], ids=repr)
def test_a_start_through_the_shell_flag_is_refused(command, handed_to_the_os):
    refusal = _try_to_start(command, shell=True)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


def test_the_start_is_refused_when_the_command_is_a_keyword(handed_to_the_os):
    try:
        subprocess.Popen(args=['llama-server', '--port', '8082'])
    except Exception:
        pass

    assert handed_to_the_os == []


def test_the_start_is_refused_when_only_the_executable_names_it(handed_to_the_os):
    refusal = _try_to_start(['server', '--port', '8082'], executable=_EXE)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


@pytest.mark.skipif(sys.platform != 'win32', reason='asyncio.windows_utils is Windows only')
def test_asyncios_own_popen_class_is_refused_too(handed_to_the_os):
    """asyncio.windows_utils.Popen subclasses subprocess.Popen when asyncio
    is imported, which is before conftest.py: a guard put on the name
    subprocess.Popen later never reaches it."""
    import asyncio.windows_utils as windows_utils

    refusal = _try_to_start(['llama-server', '--port', '8082'],
                            popen=windows_utils.Popen)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


def test_a_popen_class_held_since_before_conftest_is_refused_too(handed_to_the_os):
    """Any module that did `from subprocess import Popen` early keeps the
    class it took.  The refusal is under the class, not on the name."""
    class HeldSinceBefore(subprocess.Popen.__mro__[-2]):
        pass

    refusal = _try_to_start(['llama-server'], popen=HeldSinceBefore)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


OTHER_PROGRAMS = [
    [sys.executable, '-c', 'pass'],
    ['taskkill', '/F', '/IM', 'llama-server.exe'],
    ['nvidia-smi', '--query-gpu=memory.free', '--format=csv'],
    ['git', '-C', os.path.join(_BIN, 'llama-server'), 'status'],
    'tasklist | findstr llama-server',
    ['my-llama-server-wrapper', '--port', '8082'],
    # a stand-in binary of another name is not llama-server
    ['mock-llama-server', '--port', '8082'],
    [os.path.join(_BIN, 'fake-llama-server.exe'), '--port', '8082'],
    ['llama-server-bench.exe'],
    # A shell that only names one.
    ['cmd', '/c', 'taskkill', '/F', '/IM', 'llama-server.exe'],
    ['cmd', '/c', 'tasklist | findstr llama-server'],
    'cmd /c taskkill /F /IM llama-server.exe',
    ['sh', '-c', 'pkill llama-server; echo done'],
    ['powershell', '-Command', 'Get-Process llama-server'],
    ['bash', 'llama-server-notes.sh'],
    ['cmd', '/c', 'echo', 'llama-server'],
    ['type', 'llama-server.log'],
    ['shutdown', '/a'],
    ['npm.cmd', 'run', 'build'],
    [sys.executable, '-c', 'print("llama-server", "taskkill /IM Nunba.exe")'],
]


@pytest.mark.parametrize('command', OTHER_PROGRAMS, ids=repr)
def test_every_other_program_starts_as_before(command, handed_to_the_os):
    """Only a program being run counts.  A command that merely names
    llama-server (stopping one, listing one) is not a start."""
    refusal = _try_to_start(command)

    assert refusal is None
    assert len(handed_to_the_os) == 1


def test_a_listing_through_the_shell_flag_starts_as_before(handed_to_the_os):
    refusal = _try_to_start('tasklist | findstr llama-server', shell=True)

    assert refusal is None
    assert len(handed_to_the_os) == 1


def test_the_refusal_is_in_place_before_any_test_runs():
    """A fixture is too late and gone too soon: the start runs on a
    background thread after the test that asked for it has ended."""
    assert _REFUSAL_AT_IMPORT, (
        'no llama-server refusal was in place while test modules were imported')


def test_the_refusal_holds_on_another_thread(handed_to_the_os):
    seen = []
    worker = threading.Thread(
        target=lambda: seen.append(_try_to_start(['llama-server'])))
    worker.start()
    worker.join(10)

    assert handed_to_the_os == []
    assert seen and isinstance(seen[0], OSError)


def test_a_tests_own_double_still_receives_the_start():
    """Tests that check a start replace subprocess.Popen, as they always
    have; the refusal is under the double, not over it."""
    from llama import llama_config

    with patch('subprocess.Popen') as double:
        llama_config.subprocess.Popen(['llama-server', '--port', '8082'])

    double.assert_called_once_with(['llama-server', '--port', '8082'])


def test_subprocess_popen_is_the_standard_class_and_still_runs_programs():
    assert subprocess.Popen.__module__ == 'subprocess'
    assert subprocess.Popen.__name__ == 'Popen'
    with subprocess.Popen([sys.executable, '-c', 'pass']) as child:
        assert child.wait(30) == 0


def test_the_app_is_told_not_to_boot_a_model_by_its_own_switches():
    """Importing main starts _boot_main_server, which went for the model
    (main.py reads these where it decides the eager boot).  Child processes
    inherit them."""
    assert _SWITCHES_AT_IMPORT == {
        'HEVOLVE_EAGER_LLM': '0',
        'NUNBA_DISABLE_LLAMA_AUTOSTART': '1',
        'HEVOLVE_DRAFT_FIRST': '0',
    }


def test_source_guard_main_still_reads_those_switches():
    source = (PROJECT_ROOT / 'main.py').read_text(encoding='utf-8')
    for name in _SWITCHES_AT_IMPORT:
        assert f"os.environ.get('{name}'" in source, name


# ---------------------------------------------------------------------------
# The installed Nunba: not started, not stopped, unless asked
# ---------------------------------------------------------------------------
# tests/test_pywebview_background_start.py asks with NUNBA_TEST_INSTALLED_APP=1
# and is skipped without it.  That is one file's promise; this is the same
# rule under every file, so a new one cannot force-stop the person's running
# app (taskkill /IM Nunba.exe) or start the installed one by forgetting it.

_INSTALLED = 'C:\\Program Files (x86)\\HevolveAI\\Nunba\\Nunba.exe'

TOUCHES_THE_INSTALLED_APP = [
    ['taskkill', '/F', '/IM', 'Nunba.exe'],
    'taskkill /F /IM Nunba.exe',
    ['cmd', '/c', 'taskkill', '/IM', 'nunba.exe'],
    ['pkill', '-f', 'Nunba'],
    ['killall', 'Nunba'],
    ['powershell', '-Command', 'Stop-Process -Name Nunba -Force'],
    [_INSTALLED, '--background'],
    ['Nunba.exe', '--background'],
    ['Nunba'],
    ['cmd', '/c', 'start', '', _INSTALLED],
    ['C:/Program Files/HevolveAI/Nunba/Nunba.exe'],
    ['/Applications/Nunba.app/Contents/MacOS/Nunba'],
    ['/opt/nunba/Nunba', '--background'],
    # Review of 604a9825: each of these reached the operating system.
    ['taskkill', '/F', '/FI', 'IMAGENAME eq Nunba.exe'],
    ['taskkill', '/T', '/IM', 'NUNBA.EXE'],
    ['wmic', 'process', 'where', "name='Nunba.exe'", 'delete'],
    ['powershell', '-Command', 'Get-Process Nunba | Stop-Process'],
    ['cmd', '/c', 'start', '/b', 'taskkill', '/IM', 'Nunba.exe'],
    ['psexec', 'taskkill', '/F', '/FI', 'IMAGENAME eq Nunba.exe'],
    ['explorer.exe', _INSTALLED],
    ['powershell', '-Command', f"Start-Process '{_INSTALLED}'"],
]


@pytest.fixture
def not_asked(monkeypatch):
    monkeypatch.delenv('NUNBA_TEST_INSTALLED_APP', raising=False)


@pytest.mark.parametrize('command', TOUCHES_THE_INSTALLED_APP, ids=repr)
def test_the_installed_app_is_not_started_or_stopped_unasked(
        command, handed_to_the_os, not_asked):
    refusal = _try_to_start(command)

    assert handed_to_the_os == [], (
        'a test process started or stopped the installed Nunba unasked')
    assert isinstance(refusal, OSError), refusal
    assert 'NUNBA_TEST_INSTALLED_APP=1' in str(refusal), (
        'the refusal must say how to do it on purpose')


@pytest.mark.parametrize('command', [
    f'start "" "{_INSTALLED}"',
    'start "" Nunba.exe',
    'taskkill /F /FI "IMAGENAME eq Nunba.exe"',
], ids=repr)
def test_the_installed_app_through_the_shell_flag_is_refused(
        command, handed_to_the_os, not_asked):
    refusal = _try_to_start(command, shell=True)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal
    assert 'NUNBA_TEST_INSTALLED_APP=1' in str(refusal)


# Every other way Python starts a program raises its own audit event.  The
# interpreter raises it just before it acts, so raising the event here is the
# same question put to the same hook, with nothing started.
_MODEL = 'ModelServerStartRefused'
_APP = 'InstalledAppNotAsked'
OTHER_WAYS_TO_START = [
    (_MODEL, 'os.system', ('llama-server --port 1',)),
    (_MODEL, 'os.system', (b'start "" llama-server',)),
    (_MODEL, 'os.system', ('echo hi && llama-server --port 1',)),
    (_APP, 'os.system', ('echo hi & taskkill /IM Nunba.exe',)),
    (_MODEL, 'os.startfile', ('llama-server.exe', None)),
    (_MODEL, 'os.startfile/2', (_EXE, 'open', '--port 1', None, 1)),
    (_MODEL, 'os.spawn', (0, _EXE, ['llama-server'], None)),
    (_MODEL, 'os.spawn', (0, 'C:\\x\\run.exe', ['llama-server'], None)),
    (_MODEL, 'os.posix_spawn', ('llama-server', ['llama-server'], {})),
    (_MODEL, 'os.exec', ('/usr/bin/llama-server', ['llama-server'], None)),
    (_MODEL, '_winapi.CreateProcess', (None, f'"{_EXE}" --port 1', None)),
    (_MODEL, '_winapi.CreateProcess', (_EXE, 'x --port 1', None)),
    (_APP, 'os.system', ('taskkill /F /IM Nunba.exe',)),
    (_APP, 'os.system', (f'start "" "{_INSTALLED}"',)),
    (_APP, 'os.startfile', (_INSTALLED, None)),
    (_APP, 'os.startfile/2', (_INSTALLED, 'open', '', None, 1)),
    (_APP, 'os.spawn', (0, _INSTALLED, ['Nunba'], None)),
    (_APP, 'os.exec', (_INSTALLED, [_INSTALLED], None)),
    (_APP, '_winapi.CreateProcess', (None, 'taskkill /F /FI "IMAGENAME eq Nunba.exe"', None)),
    ('', 'os.system', ('tasklist | findstr llama-server',)),
    ('', 'os.system', ('echo Nunba.exe',)),
    ('', 'os.startfile', ('C:\\docs\\readme.txt', None)),
    ('', 'os.spawn', (0, sys.executable, ['python', '-c', 'pass'], None)),
    ('', '_winapi.CreateProcess', (None, 'taskkill /F /PID 12', None)),
    ('', 'os.kill', (1234, 9)),
]


@pytest.mark.parametrize('wanted, event, args', OTHER_WAYS_TO_START,
                         ids=lambda v: v if isinstance(v, str) else repr(v)[:60])
def test_every_way_python_starts_a_program_is_asked(wanted, event, args, not_asked):
    try:
        sys.audit(event, *args)
        said = ''
    except OSError as refusal:
        said = type(refusal).__name__

    assert said == wanted


def test_asked_for_the_other_ways_let_the_installed_app_through_only(monkeypatch):
    monkeypatch.setenv('NUNBA_TEST_INSTALLED_APP', '1')
    for wanted, event, args in OTHER_WAYS_TO_START:
        try:
            sys.audit(event, *args)
            said = ''
        except OSError as refusal:
            said = type(refusal).__name__
        assert said == (wanted if wanted == _MODEL else ''), (event, args)


def test_a_test_that_starts_the_real_app_on_purpose_can_shed_the_runs_variables():
    """install() sets four variables for the whole process.  The one file
    that starts the installed app on purpose must not hand them on: the app
    would boot no model and look in a private home."""
    helper = _hermetic_run()
    assert hasattr(helper, 'env_outside_the_run'), 'tests/hermetic_run.py has no such helper'
    inside = {'NUNBA_TEST_HOME': 'a;b', 'HEVOLVE_EAGER_LLM': '0',
              'NUNBA_DISABLE_LLAMA_AUTOSTART': '1', 'HEVOLVE_DRAFT_FIRST': '0',
              'PATH': 'kept', 'NUNBA_TEST_INSTALLED_APP': '1', 'HEVOLVE_OTHER': 'kept'}

    assert helper.env_outside_the_run(inside) == {
        'PATH': 'kept', 'NUNBA_TEST_INSTALLED_APP': '1', 'HEVOLVE_OTHER': 'kept'}
    assert set(helper.env_outside_the_run()) == set(os.environ) - set(helper.RUN_VARIABLES)
    assert set(helper.RUN_VARIABLES) == {
        'NUNBA_TEST_HOME', 'HEVOLVE_EAGER_LLM', 'NUNBA_DISABLE_LLAMA_AUTOSTART',
        'HEVOLVE_DRAFT_FIRST'}


def test_the_installed_app_named_only_as_the_executable_is_refused(
        handed_to_the_os, not_asked):
    refusal = _try_to_start(['app', '--background'], executable=_INSTALLED)

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


@pytest.mark.parametrize('value', ['0', 'true', 'yes', ' '])
def test_only_the_exact_switch_asks(value, handed_to_the_os, monkeypatch):
    monkeypatch.setenv('NUNBA_TEST_INSTALLED_APP', value)

    refusal = _try_to_start(['taskkill', '/F', '/IM', 'Nunba.exe'])

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


@pytest.mark.parametrize('command', TOUCHES_THE_INSTALLED_APP, ids=repr)
def test_asked_for_it_goes_through(command, handed_to_the_os, monkeypatch):
    monkeypatch.setenv('NUNBA_TEST_INSTALLED_APP', '1')

    refusal = _try_to_start(command)

    assert refusal is None
    assert len(handed_to_the_os) == 1


def test_asking_for_the_installed_app_does_not_ask_for_a_model_server(
        handed_to_the_os, monkeypatch):
    monkeypatch.setenv('NUNBA_TEST_INSTALLED_APP', '1')

    refusal = _try_to_start(['llama-server', '--port', '8082'])

    assert handed_to_the_os == []
    assert isinstance(refusal, OSError), refusal


def _not_the_installed_app(tmp_path):
    return [
        ['taskkill', '/F', '/PID', '1234'],
        ['taskkill', '/F', '/IM', 'notepad.exe'],
        ['tasklist', '/FI', 'IMAGENAME eq Nunba.exe'],
        ['git', 'log', '--grep', 'Nunba.exe'],
        [sys.executable, '-c', 'print("taskkill /IM Nunba.exe")'],
        # A build under test, and a stand-in a test made in its own folder.
        [os.path.join('build', 'Nunba', 'Nunba.exe'), '--validate'],
        [str(tmp_path / 'Nunba.exe'), '-c', 'pass'],
        [str(tmp_path / 'app' / 'Nunba.exe')],
        ['Nunba-setup.exe'],
        ['cmd', '/c', 'echo', 'Nunba.exe'],
        ['explorer.exe', str(tmp_path)],
        ['powershell', '-Command', 'Get-Process Nunba'],
    ]


@pytest.mark.parametrize('index', range(12))
def test_what_is_not_the_installed_app_starts_as_before(
        index, tmp_path, handed_to_the_os, not_asked):
    command = _not_the_installed_app(tmp_path)[index]

    refusal = _try_to_start(command)

    assert refusal is None, command
    assert len(handed_to_the_os) == 1


# ---------------------------------------------------------------------------
# Nothing of llama's written in, or looked for under, the person's home
# ---------------------------------------------------------------------------

def _everything_under(folder):
    return sorted(str(p.relative_to(folder)) for p in Path(folder).rglob('*'))


def _within(path, folder):
    path = os.path.normcase(os.path.abspath(str(path)))
    folder = os.path.normcase(os.path.abspath(str(folder)))
    return path == folder or path.startswith(folder + os.sep)


@pytest.fixture
def person(tmp_path, monkeypatch):
    """(home, private): a stand-in for the person's home, and the folder a
    test run is given in its place, paired the way tests/conftest.py pairs
    the real ones.  The real home is never used here, so this is safe on a
    tree without the fix too."""
    home = tmp_path / 'person'
    private = tmp_path / 'private'
    home.mkdir()
    private.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    monkeypatch.setenv('NUNBA_TEST_HOME', os.pathsep.join([str(home), str(private)]))
    monkeypatch.delenv('NUNBA_MODELS_DIR', raising=False)
    assert Path.home() == home
    return home, private


@pytest.fixture
def no_gpu_probe(monkeypatch):
    from llama.llama_installer import LlamaInstaller
    monkeypatch.setattr(LlamaInstaller, '_detect_gpu', lambda self: False)


def test_the_default_config_is_written_in_the_private_folder(person, no_gpu_probe):
    from llama.llama_config import LlamaConfig
    home, private = person

    cfg = LlamaConfig()
    cfg.config['server_port'] = 8083
    cfg._save_config()
    cfg._write_server_status(True, pid=1, model='m', port=8083)
    cfg._write_caption_status(True, pid=1, model='m', port=8081)

    assert _everything_under(home) == [], (
        "a test wrote the person's home")
    saved = json.loads((private / '.nunba' / 'llama_config.json').read_text())
    assert saved['server_port'] == 8083
    assert (private / '.nunba' / 'server_status.json').is_file()
    assert (private / '.trueflow' / 'server_status.json').is_file()
    assert (private / '.nunba' / 'caption_server_status.json').is_file()
    assert (private / '.trueflow' / 'caption_server_status.json').is_file()


def test_the_default_installer_keeps_to_the_private_folder(person, no_gpu_probe):
    from llama.llama_installer import LlamaInstaller
    home, private = person

    installer = LlamaInstaller()

    assert _everything_under(home) == []
    assert installer.install_dir == private / '.nunba' / 'llama.cpp'
    assert installer.models_dir == private / '.nunba' / 'models'
    assert installer.default_models_dir == private / '.nunba' / 'models'
    assert LlamaInstaller.resolve_models_dir() == private / '.nunba' / 'models'


def test_the_installer_reads_the_storage_choice_saved_in_the_private_folder(
        person, no_gpu_probe, tmp_path):
    from llama.llama_installer import LlamaInstaller
    home, private = person
    chosen = tmp_path / 'chosen'
    (home / '.nunba').mkdir()
    (home / '.nunba' / 'llama_config.json').write_text(
        json.dumps({'models_dir': str(tmp_path / 'the_persons_own')}))
    (private / '.nunba').mkdir()
    (private / '.nunba' / 'llama_config.json').write_text(
        json.dumps({'models_dir': str(chosen)}))

    assert LlamaInstaller.resolve_models_dir() == chosen.resolve()


_PERSONS_BINARIES = [
    ('.trueflow', 'llama.cpp', 'build', 'bin', 'Release'),
    ('.trueflow', 'llama.cpp', 'build', 'bin'),
    ('.local', 'bin'),
    ('llama.cpp', 'build', 'bin', 'Release'),
    ('llama.cpp', 'build', 'bin'),
]


@pytest.mark.parametrize('folder', _PERSONS_BINARIES, ids='/'.join)
def test_a_llama_server_in_the_persons_home_is_not_found(
        folder, person, no_gpu_probe):
    """A binary another product put in the person's home (TrueFlow's build,
    their own checkout) is not this test run's to find, let alone to run."""
    from llama.llama_installer import LlamaInstaller
    home, private = person
    installer = LlamaInstaller()
    exe = 'llama-server.exe' if 'windows' in installer.os_name else 'llama-server'
    theirs = home.joinpath(*folder)
    theirs.mkdir(parents=True)
    (theirs / exe).write_bytes(b'')

    found = installer.find_llama_server(check_system_first=True)

    assert found is None or not _within(found, home), found


def test_the_same_binary_in_the_private_folder_is_found(person, no_gpu_probe):
    from llama.llama_installer import LlamaInstaller
    home, private = person
    installer = LlamaInstaller()
    exe = 'llama-server.exe' if 'windows' in installer.os_name else 'llama-server'
    mine = private / '.trueflow' / 'llama.cpp' / 'build' / 'bin'
    mine.mkdir(parents=True)
    (mine / exe).write_bytes(b'')

    found = installer.find_llama_server(check_system_first=True)

    assert found is not None and _within(found, private), found


def test_models_already_on_the_machine_are_not_looked_for_in_the_real_home():
    """The sibling-project folders (~/.trueflow/models, ~/.ollama/models)
    are where the 21 Nov runs found the owner's model."""
    from llama import llama_installer
    real_home, _, _private = os.environ.get('NUNBA_TEST_HOME', '').partition(os.pathsep)
    real_home = real_home or os.path.expanduser('~')

    looked_in = {os.path.normcase(os.path.abspath(str(folder)))
                 for folder in llama_installer.SIBLING_MODEL_DIRS}
    # The person's own two folders, exactly.  (The private home may itself sit
    # under the real one: on Windows the temp folder is inside the profile.)
    the_persons = {os.path.normcase(os.path.abspath(os.path.join(real_home, name, 'models')))
                   for name in ('.trueflow', '.ollama')}

    assert len(looked_in) == 2
    assert looked_in & the_persons == set()


def test_the_zinc_server_installs_under_the_private_folder(person):
    from llama.zinc_installer import ZincInstaller
    home, private = person

    assert ZincInstaller().install_dir == private / '.nunba' / 'zinc'
    assert ZincInstaller(install_dir=str(home / 'given')).install_dir == home / 'given'


def test_the_load_a_chat_with_no_model_asks_for_writes_the_private_config(
        person, no_gpu_probe, monkeypatch):
    """The 21 Nov path itself, from the function the background thread runs,
    with the start replaced by a recorder."""
    from llama.llama_config import LlamaConfig
    from llama.llama_installer import MODEL_PRESETS
    from models.orchestrator import LlamaLoader
    home, private = person
    asked = []
    monkeypatch.setattr(
        LlamaConfig, 'start_server',
        lambda self, model_preset=None, force_new_port=False:
            asked.append(self.config_file) or False)
    preset = MODEL_PRESETS[0]
    entry = SimpleNamespace(id='llm-test', name=preset.display_name,
                            files={'model': preset.file_name})

    assert LlamaLoader().load(entry, 'gpu') is False

    assert asked == [private / '.nunba' / 'llama_config.json']
    assert _everything_under(home) == [], "the load wrote the person's home"
    saved = json.loads(asked[0].read_text())
    assert saved['llm_mode'] == 'local' and saved['use_gpu'] is True


def test_a_test_that_moves_home_itself_keeps_the_home_it_chose(
        tmp_path, monkeypatch, no_gpu_probe):
    """The private folder stands in for the person's home only.  Tests that
    point home at their own folder (test_model_storage_path,
    test_caption_server_spawn_lock) read and write there, as before."""
    from llama.llama_config import LlamaConfig
    from llama.llama_installer import LlamaInstaller
    moved = tmp_path / 'moved'
    moved.mkdir()
    monkeypatch.setenv('USERPROFILE', str(moved))
    monkeypatch.setenv('HOME', str(moved))
    monkeypatch.setenv('NUNBA_TEST_HOME', os.pathsep.join(
        [str(tmp_path / 'someone_else'), str(tmp_path / 'private')]))
    monkeypatch.delenv('NUNBA_MODELS_DIR', raising=False)

    cfg = LlamaConfig()
    cfg._save_config()

    assert cfg.config_dir == moved / '.nunba'
    assert (moved / '.nunba' / 'llama_config.json').is_file()
    assert LlamaInstaller.resolve_models_dir() == moved / '.nunba' / 'models'
    assert not (tmp_path / 'private').exists()


@pytest.mark.parametrize('value', ['', 'only-one-part', os.pathsep, 'x' + os.pathsep])
def test_without_a_complete_pair_home_is_home(value, tmp_path, monkeypatch):
    """Unset is every run that is not a test: Path.home(), nothing else."""
    home = tmp_path / 'home'
    home.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    if value:
        monkeypatch.setenv('NUNBA_TEST_HOME', value)
    else:
        monkeypatch.delenv('NUNBA_TEST_HOME', raising=False)

    assert _home_dir() == home


def test_the_persons_home_paired_with_no_folder_is_not_a_stand_in(tmp_path, monkeypatch):
    home = tmp_path / 'home'
    home.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    monkeypatch.setenv('NUNBA_TEST_HOME', str(home) + os.pathsep)

    assert _home_dir() == home


def test_an_explicit_config_folder_is_used_as_given(person, no_gpu_probe, tmp_path):
    from llama.llama_config import LlamaConfig
    home, private = person

    cfg = LlamaConfig(config_dir=str(tmp_path / 'given'))
    cfg._save_config()

    assert cfg.config_dir == tmp_path / 'given'
    assert (tmp_path / 'given' / 'llama_config.json').is_file()
    assert _everything_under(home) == []


def test_this_run_was_given_a_private_folder_for_the_real_home():
    person_home, _, private = os.environ.get('NUNBA_TEST_HOME', '').partition(os.pathsep)

    assert person_home and private, 'tests/conftest.py set no private home'
    assert os.path.normcase(os.path.abspath(person_home)) == os.path.normcase(
        os.path.abspath(os.path.expanduser('~')))
    assert os.path.isdir(private)
    assert _within(private, tempfile.gettempdir())
    assert _home_dir() == Path(private)


def _hermetic_run():
    """tests/hermetic_run.py as this run loaded it, or None on a tree that
    has no such helper."""
    return sys.modules.get('tests.hermetic_run')


def test_source_guard_conftest_calls_the_one_helper_and_keeps_no_copy():
    source = (PROJECT_ROOT / 'tests' / 'conftest.py').read_text(encoding='utf-8')
    assert 'from tests.hermetic_run import install as _make_this_run_hermetic' in source
    assert '\n_make_this_run_hermetic()\n' in source
    for own_copy in ('addaudithook', 'NUNBA_TEST_HOME', 'HEVOLVE_EAGER_LLM', 'subprocess.Popen ='):
        assert own_copy not in source, own_copy


def test_source_guard_the_helper_needs_nothing_but_the_standard_library():
    """A runner calls install() before it imports anything of Nunba's or
    HARTOS's.  That only works while the helper itself imports neither."""
    path = PROJECT_ROOT / 'tests' / 'hermetic_run.py'
    assert path.is_file(), 'tests/hermetic_run.py is missing'
    imported = set()
    for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split('.')[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imported.add((node.module or '').split('.')[0])
    assert imported <= set(sys.stdlib_module_names), imported - set(sys.stdlib_module_names)


_A_RUNNER_WITHOUT_CONFTEST = '''
import os, subprocess, sys
sys.path.insert(0, sys.argv[1])
for name in ("NUNBA_TEST_HOME", "HEVOLVE_EAGER_LLM", "NUNBA_DISABLE_LLAMA_AUTOSTART", "HEVOLVE_DRAFT_FIRST"):
    os.environ.pop(name, None)
from tests.hermetic_run import install
install()
install()
print("switches", os.environ.get("HEVOLVE_EAGER_LLM"), os.environ.get("NUNBA_DISABLE_LLAMA_AUTOSTART"),
      os.environ.get("HEVOLVE_DRAFT_FIRST"))
person, _, private = os.environ.get("NUNBA_TEST_HOME", "").partition(os.pathsep)
print("home", os.path.normcase(person) == os.path.normcase(os.path.expanduser("~")), os.path.isdir(private))
for command in (["llama-server", "--port", "8082"], ["taskkill", "/F", "/IM", "Nunba.exe"]):
    try:
        subprocess.Popen(command)
        print("STARTED", command[0])
    except OSError as refusal:
        print("refused", command[0], type(refusal).__name__)
try:
    sys.audit("os.system", "start /wait llama-server")
    print("os.system let through")
except OSError as refusal:
    print("os.system refused", type(refusal).__name__)
print("loaded", sorted(m for m in sys.modules if m.split(".")[0] in ("llama", "main", "routes", "core", "integrations")))
'''


def test_a_runner_that_loads_no_conftest_gets_all_of_it_from_one_call(tmp_path):
    """A direct-call driver imports test modules itself, so pytest never
    loads tests/conftest.py for it.  One call gives it the same run.  The
    child here is such a runner: plain python, no pytest, no conftest."""
    env = {k: v for k, v in os.environ.items() if k != 'NUNBA_TEST_INSTALLED_APP'}
    env['TEMP'] = env['TMP'] = env['TMPDIR'] = str(tmp_path)
    done = subprocess.run([sys.executable, '-c', _A_RUNNER_WITHOUT_CONFTEST, str(PROJECT_ROOT)],
                          capture_output=True, text=True, env=env, timeout=120)

    assert done.stdout.splitlines() == [
        'switches 0 1 0',
        'home True True',
        'refused llama-server ModelServerStartRefused',
        'refused taskkill InstalledAppNotAsked',
        'os.system refused ModelServerStartRefused',
        'loaded []',
    ], done.stdout + done.stderr
    # the child's private home was removed when it exited
    assert [p.name for p in tmp_path.iterdir() if p.name.startswith('nunba_test_home_')] == []


def test_calling_it_again_changes_nothing():
    helper = _hermetic_run()
    assert helper is not None, 'tests/hermetic_run.py was not loaded by this run'
    before = dict(os.environ)

    helper.install()

    assert dict(os.environ) == before
    assert subprocess.refuses_model_servers is True


def test_a_private_home_left_by_a_killed_run_is_removed_a_day_on(tmp_path):
    """atexit does not run for a process that is killed (a pytest timeout
    kills the whole run), so the folder stays; nothing else removed it."""
    sweep = getattr(_hermetic_run(), '_remove_private_homes_left_behind', None)
    assert sweep is not None, 'nothing removes the folder a killed run left'
    now = 1_800_000_000
    made = {}
    for name, age in (('nunba_test_home_old', 2 * 86400), ('nunba_test_home_fresh', 3600),
                      ('nunba_test_home_edge', 86400 - 60), ('someone_elses_old', 9 * 86400)):
        made[name] = tmp_path / name
        made[name].mkdir()
        (made[name] / '.nunba').mkdir()
        os.utime(made[name], (now - age, now - age))
    (tmp_path / 'nunba_test_home_a_file').write_text('not a folder')
    os.utime(tmp_path / 'nunba_test_home_a_file', (now - 9 * 86400, now - 9 * 86400))

    sweep(str(tmp_path), now)

    assert sorted(p.name for p in tmp_path.iterdir()) == [
        'nunba_test_home_a_file', 'nunba_test_home_edge', 'nunba_test_home_fresh',
        'someone_elses_old']


def test_source_guard_llama_asks_for_home_in_one_place():
    """Some of these lookups sit inside long start functions no test drives to
    that line (the llama-server log folder), and two are module constants.
    Each must come from home_dir, so none of them can name the person's home
    on its own again."""
    direct = []
    for source in sorted((PROJECT_ROOT / 'llama').glob('*.py')):
        tree = ast.parse(source.read_text(encoding='utf-8'))
        owner_lines = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == 'home_dir':
                owner_lines = set(range(node.lineno, node.end_lineno + 1))
        for node in ast.walk(tree):
            if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
                continue
            if node.lineno in owner_lines:
                continue
            owner = node.func.value
            if (node.func.attr == 'home' and isinstance(owner, ast.Name)
                    and owner.id == 'Path'):
                direct.append((source.name, node.lineno, 'Path.home()'))
            if (node.func.attr == 'expanduser' and isinstance(owner, ast.Attribute)
                    and owner.attr == 'path'):
                direct.append((source.name, node.lineno, 'os.path.expanduser()'))

    assert direct == [], f'llama/ names the home folder itself: {direct}'

"""What makes a Nunba test run hermetic, in ONE place every runner calls.

    from tests.hermetic_run import install
    install()

tests/conftest.py calls it when pytest imports it.  A runner that does not go
through pytest (a direct-call driver that imports test modules itself, a probe
script) loads no conftest.py, so it must call install() itself, BEFORE it
imports anything else from Nunba or HARTOS: on 22 Nov 2026 such a driver
imported the app unguarded and a real model server was started.

install() is safe to call more than once.  It does three things, for the whole
process:
  - an audit hook refuses every subprocess start of llama-server, and, unless
    NUNBA_TEST_INSTALLED_APP=1, every start of the installed Nunba and every
    stop of Nunba by name;
  - the app's own switches are set so that importing main boots no model
    (HEVOLVE_EAGER_LLM=0, NUNBA_DISABLE_LLAMA_AUTOSTART=1, HEVOLVE_DRAFT_FIRST=0);
  - NUNBA_TEST_HOME names a private folder that llama.llama_installer.home_dir
    returns in place of the person's home.

None of it can be a fixture: POST /chat with no model up answers at once and
hands the start to a background thread (routes/chatbot_routes.py ->
ModelOrchestrator.ensure_loaded_async -> models/orchestrator.py
LlamaLoader.load), and that thread reaches the config write and the spawn
seconds after the test that caused it has ended and its fixtures are undone.
On 21 Nov 2026 two runs of tests/test_chatbot_routes.py each left a real
llama-server holding 4 GB of video memory and rewrote the owner's
~/.nunba/llama_config.json.  tests/test_a_test_run_starts_no_model_server.py
pins each part.

What this covers: every llama-server start made by THIS process, every start
of the installed Nunba and every stop of Nunba by name made by this process,
and the home lookups of llama/ (config, status files, log, binary and model
search).  What it does not: other modules that write ~/.nunba, and a start
made by a child process (a child inherits the variables, so it finds no
managed binary and does not boot a model on its own, but it has no hook).

Standard library only, so importing this module starts nothing.
"""
import atexit
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time


class ModelServerStartRefused(OSError):
    """A test tried to start a real model server.  An OSError, as a start
    that fails is anywhere else, so code that copes with a binary that will
    not run copes with this the same way."""


_SHELLS = frozenset({'cmd', 'powershell', 'pwsh', 'sh', 'bash', 'dash', 'zsh'})
_SHELL_WORDS = frozenset({'start', 'call', 'exec', 'nohup'})


def _words(command) -> list:
    """A command as its words, quotes dropped: a list as given, a string
    split the way a shell would."""
    if isinstance(command, (bytes, bytearray)):
        command = bytes(command).decode(errors='replace')
    if isinstance(command, os.PathLike):
        command = os.fspath(command)
    if isinstance(command, str):
        return [a or b or c for a, b, c in
                re.findall(r'"([^"]*)"|\'([^\']*)\'|([^\s"\']+)', command)]
    try:
        return [w.decode(errors='replace') if isinstance(w, (bytes, bytearray))
                else str(w) for w in command]
    except TypeError:
        return []


def _program(word) -> str:
    """The program a word names: no folder, no .exe/.cmd/.bat/.com."""
    name = re.split(r'[\\/]', word)[-1].lower()
    return re.sub(r'\.(exe|cmd|bat|com)$', '', name)


_SWITCH = re.compile(r'-\S*|/[A-Za-z?]{1,2}')      # -c, -Command, /c, /b
_JOIN = re.compile(r'&&|\|\||[|&;\n]')


def _commands(command, _depth=0):
    """Every command a command line runs, each as its words: the line
    itself, or, for a shell, each command the shell is given
    (`cmd /c a && b` is a and b; `sh -c "x; exec y"` is x and y)."""
    words = [w for w in _words(command) if w]
    if not words:
        return
    if _program(words[0]) not in _SHELLS or _depth >= 3:
        yield words
        return
    rest = words[1:]
    while rest and _SWITCH.fullmatch(rest[0]):
        rest.pop(0)
    # What the shell was given, as one line: either one quoted line, or words.
    line = rest[0] if len(rest) == 1 else ' '.join(
        f'"{w}"' if re.search(r'\s', w) else w for w in rest)
    for piece in _JOIN.split(line):
        run = [w for w in _words(piece) if w]
        while run and (_SWITCH.fullmatch(run[0]) or _program(run[0]) in _SHELL_WORDS):
            run.pop(0)
        if run:
            yield from _commands(run, _depth + 1)


def _starts_a_model_server(command) -> bool:
    """Does this command line run llama-server?  Only a program being run
    counts: `taskkill /IM llama-server.exe` names one and starts none."""
    return any(_program(run[0]) == 'llama-server' for run in _commands(command))


# The one switch a test file sets to work on the INSTALLED app on purpose
# (tests/test_pywebview_background_start.py reads the same name).
INSTALLED_APP_SWITCH = 'NUNBA_TEST_INSTALLED_APP'
_STOPS_BY_NAME = frozenset({'taskkill', 'pkill', 'killall', 'stop-process'})


def _is_the_installed_app(word) -> bool:
    """Nunba as installed on the machine: by bare name (found on PATH) or
    under an install folder.  A build under test (build/Nunba/Nunba.exe) and a
    stand-in a test made in its own folder are not it."""
    if _program(word) != 'nunba':
        return False
    path = word.replace('\\', '/').lower()
    return ('/' not in path or '/hevolveai/nunba/' in path
            or path.startswith(('/applications/nunba.app/', '/opt/nunba/', '/usr/')))


def _does_to_the_installed_app(command) -> str:
    """'starts' or 'stops' when a command line starts the installed Nunba
    or stops Nunba by name (taskkill /IM Nunba.exe takes the person's running
    app with it), else ''."""
    for run in _commands(command):
        if _is_the_installed_app(run[0]):
            return 'starts'
        if _program(run[0]) in _STOPS_BY_NAME and any(
                _program(word) == 'nunba' for word in run[1:]):
            return 'stops'
    return ''


class InstalledAppNotAsked(OSError):
    """A test tried to start or stop the installed Nunba without the switch."""


def _refuse_what_a_test_run_must_not_start(event, args):
    """Audit hook.  subprocess raises this event from every Popen, whichever
    class made it (asyncio's own subclass too) and whatever name the caller
    reached it by, just before the operating system is asked.  One place for
    every test file: a new file cannot forget it."""
    if event != 'subprocess.Popen':
        return
    executable, command = args[0], args[1]
    lines = [command] + ([[executable]] if executable else [])
    if any(_starts_a_model_server(line) for line in lines):
        raise ModelServerStartRefused(
            f'a test run does not start a real model server ({command!r}). '
            'To check a start, replace subprocess.Popen in the test '
            'with a double (unittest.mock.patch) and read its calls.')
    if os.environ.get(INSTALLED_APP_SWITCH, '').strip() == '1':
        return
    for line in lines:
        what = _does_to_the_installed_app(line)
        if what:
            raise InstalledAppNotAsked(
                f'a test run {what} the installed Nunba only when asked '
                f'({command!r}): set {INSTALLED_APP_SWITCH}=1 to do it on '
                'purpose.  To check the call, replace subprocess.run or '
                'subprocess.Popen in the test with a double.')


def _remove_private_homes_left_behind(temp_dir, now, older_than=86400):
    """A private home is removed when its run exits.  A run that was killed
    leaves its folder; a later run removes it here, once it is a day old, so
    a run still going beside this one keeps its own."""
    for name in os.listdir(temp_dir):
        left = os.path.join(temp_dir, name)
        try:
            if (name.startswith('nunba_test_home_') and os.path.isdir(left)
                    and now - os.path.getmtime(left) > older_than):
                shutil.rmtree(left, ignore_errors=True)
        except OSError:
            pass


def install():
    """Make this process a hermetic test run.  See the module docstring."""
    if not getattr(subprocess, 'refuses_model_servers', False):
        # An audit hook cannot be taken off again, which is the point; the mark
        # keeps a second import of this file from adding a second one.
        sys.addaudithook(_refuse_what_a_test_run_must_not_start)
        subprocess.refuses_model_servers = True

    # The app's own switches, so the boot thread that importing main starts does
    # not go for a model at all (main.py reads them where it decides the eager
    # boot; tests/e2e/conftest.py sets the older name for its subprocesses).  A
    # run that sets one itself keeps its value.
    os.environ.setdefault('HEVOLVE_EAGER_LLM', '0')
    os.environ.setdefault('NUNBA_DISABLE_LLAMA_AUTOSTART', '1')
    os.environ.setdefault('HEVOLVE_DRAFT_FIRST', '0')

    if not os.environ.get('NUNBA_TEST_HOME'):
        # Read by llama.llama_installer.home_dir: the person's home, then the
        # folder that stands in for it.
        _remove_private_homes_left_behind(tempfile.gettempdir(), time.time())
        private_home = tempfile.mkdtemp(prefix='nunba_test_home_')
        atexit.register(shutil.rmtree, private_home, ignore_errors=True)
        os.environ['NUNBA_TEST_HOME'] = os.pathsep.join(
            [os.path.expanduser('~'), private_home])

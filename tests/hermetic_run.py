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
  - an audit hook, on every event through which Python starts a program
    (subprocess.Popen, _winapi.CreateProcess, os.system, os.startfile,
    os.spawn*, os.posix_spawn, os.exec*), refuses every start of llama-server,
    and, unless NUNBA_TEST_INSTALLED_APP=1, every start of the installed Nunba
    and every stop of Nunba by name;
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

# Tools whose command line may NAME llama-server or Nunba without starting
# either: they list, find, stop, print or read, or (python) run a script whose
# text merely mentions the name.  Every other program that names one is taken
# to start it: start, Start-Process, explorer, wmic, a wrapper nobody listed.
# The list is the short one on purpose.  A harmless stranger that gets refused
# costs a test one double; a launcher that gets through costs the person their
# video memory or their running app (review of 604a9825: a rule that looked
# for the start missed `start /wait`, Start-Process, explorer and wmic).
_NAMES_WITHOUT_STARTING = frozenset({
    'taskkill', 'tskill', 'tasklist', 'findstr', 'find', 'grep', 'pkill', 'pgrep',
    'killall', 'kill', 'echo', 'where', 'which', 'git', 'get-process',
    'stop-process', 'ps', 'pytest', 'nvidia-smi', 'dir', 'ls', 'type', 'cat',
})
_PYTHON = re.compile(r'python[\d.]*w?|py')
# Tools that stop a process by its NAME.  By pid (taskkill /PID) is the
# caller's own child and stays allowed; by name takes the person's running
# app with it.
_STOPS_BY_NAME = frozenset({'taskkill', 'tskill', 'pkill', 'killall', 'kill',
                            'stop-process', 'wmic'})

_SWITCH = re.compile(r'-\S*|/[A-Za-z?]{1,4}')      # -c, -Command, /c, /wait
_JOIN = re.compile(r'&&|\|\||[|&;\n]')
_SHELL_NAME = r'(?:cmd|powershell|pwsh|sh|bash|dash|zsh)(?:\.exe)?'
_LEADING_SHELL = re.compile(
    r'\s*(?:"(?:[^"]*[\\/])?' + _SHELL_NAME + r'"|(?:[^"\s]*[\\/])?' + _SHELL_NAME + r')(?=\s|$)'
    r'(?:\s+(?:-\S+|/[A-Za-z?]{1,4})(?=\s|$))*\s*', re.I)
# llama-server as a program: not llama-server-bench, not my-llama-server, not
# llama-server.log, not a folder named llama-server on the way to something else.
_LLAMA_SERVER = re.compile(
    r'(?<![\w.-])llama-server(?:\.(?:exe|cmd|bat|com))?(?=$|[\s"\'&|;()<>,])', re.I)
# Nunba as installed on the machine.  A build under test
# (build/Nunba/Nunba.exe) and a stand-in in a test's own folder are not it.
_INSTALLED_NUNBA = re.compile(
    r'hevolveai[\\/]+nunba[\\/]+nunba(?:\.exe)?(?=$|[\s"\'&|;()<>,])'
    r'|[\\/]applications[\\/]nunba\.app[\\/]'
    r'|(?<![\w.-])[\\/]opt[\\/]nunba[\\/]nunba(?=$|[\s"\'&|;()<>,])', re.I)
_BARE_NUNBA = re.compile(r'nunba(?:\.exe)?', re.I)


def _text(command) -> str:
    """A command as one line of text: a string as given, a list joined the
    way Windows joins it (a word with a blank in it goes in quotes)."""
    if isinstance(command, (bytes, bytearray)):
        return bytes(command).decode(errors='replace')
    if isinstance(command, os.PathLike):
        return os.fspath(command)
    if isinstance(command, str):
        return command
    try:
        words = [w.decode(errors='replace') if isinstance(w, (bytes, bytearray))
                 else str(w) for w in command]
    except TypeError:
        return ''
    return ' '.join(f'"{w}"' if (not w or re.search(r'\s', w)) else w for w in words)


def _words(text) -> list:
    """A line's words, quotes dropped, empties and blanks dropped."""
    found = re.findall(r'"([^"]*)"|\'([^\']*)\'|([^\s"\']+)', text)
    return [w for w in ((a or b or c).strip() for a, b, c in found) if w]


def _program(word) -> str:
    """The program a word names: no folder, no .exe/.cmd/.bat/.com."""
    name = re.split(r'[\\/]', word)[-1].lower()
    return re.sub(r'\.(exe|cmd|bat|com)$', '', name)


def _commands(command, shell=False, _depth=0):
    """Every command a command line runs, as (first program, words, text).

    A shell is looked into: `cmd /c a && b` is a and b, `sh -c "x; exec y"`
    is x and y, and so on down.  `shell` says the line itself is one a shell
    will read (os.system, Popen(shell=True) on POSIX)."""
    text = _text(command)
    opened = _LEADING_SHELL.match(text)
    if opened and opened.end() and _depth < 4:
        shell, text = True, text[opened.end():]
    if shell and _depth < 4:
        text = text.strip()
        if len(text) > 1 and text[0] == text[-1] and text[0] in '"\'':
            text = text[1:-1]
        for piece in _JOIN.split(text):
            if piece.strip():
                yield from _commands(piece, False, _depth + 1)
        return
    yield from _one(text)


def _one(text):
    words = _words(text)
    while words and _SWITCH.fullmatch(words[0]):
        words.pop(0)
    if words:
        yield _program(words[0]), words, text


def _only_names(first) -> bool:
    return first in _NAMES_WITHOUT_STARTING or bool(_PYTHON.fullmatch(first))


def _starts_a_model_server(command, shell=False) -> bool:
    """Does this command line run llama-server?  `taskkill /IM
    llama-server.exe` and `tasklist | findstr llama-server` name one and start
    none; anything else that names it is taken to start it."""
    return any(_LLAMA_SERVER.search(text) and not _only_names(first)
               for first, _words_, text in _commands(command, shell))


# The one switch a test file sets to work on the INSTALLED app on purpose
# (tests/test_pywebview_background_start.py reads the same name).
INSTALLED_APP_SWITCH = 'NUNBA_TEST_INSTALLED_APP'


def _does_to_the_installed_app(command, shell=False) -> str:
    """'starts' or 'stops' when a command line starts the installed Nunba
    or stops Nunba by name (taskkill /IM Nunba.exe, taskkill /FI "IMAGENAME eq
    Nunba.exe", Stop-Process -Name Nunba: each takes the person's running app
    with it), else ''."""
    whole = _text(command).lower()
    looked_into = False
    for first, words, text in _commands(command, shell):
        looked_into = looked_into or text != _text(command)
        lowered = text.lower()
        tools = {_program(word) for word in words}
        if 'nunba' in lowered and (first in _STOPS_BY_NAME or (
                not _only_names(first) and tools & _STOPS_BY_NAME)):
            return 'stops'
        if _only_names(first):
            continue
        if _INSTALLED_NUNBA.search(text) or any(
                _BARE_NUNBA.fullmatch(word) for word in words):
            return 'starts'
    # A shell line that both names Nunba and stops something, however the two
    # are joined (`Get-Process Nunba | Stop-Process`).
    if looked_into and 'nunba' in whole and re.search(
            r'stop-process|taskkill|tskill|pkill|killall|\.kill\(|terminate', whole):
        return 'stops'
    return ''


class InstalledAppNotAsked(OSError):
    """A test tried to start or stop the installed Nunba without the switch."""


def _lines_of(event, args):
    """The command lines an audit event is about, as (command, is a shell
    line) pairs, or () for an event that starts nothing."""
    if event == 'subprocess.Popen':             # executable, args, cwd, env
        return [(args[1], False)] + ([([args[0]], False)] if args[0] else [])
    if event == '_winapi.CreateProcess':        # application_name, command_line, cwd
        return [(args[1] or '', False)] + ([([args[0]], False)] if args[0] else [])
    if event == 'os.system':                    # command
        return [(args[0], True)]
    if event in ('os.startfile', 'os.startfile/2'):   # path, operation[, arguments, ...]
        extra = args[2] if len(args) > 2 and args[2] else ''
        return [([args[0]], False)] + ([(extra, False)] if extra else [])
    if event in ('os.spawn', 'os.posix_spawn', 'os.exec'):
        path, argv = (args[1], args[2]) if event == 'os.spawn' else (args[0], args[1])
        return [([path], False), (list(argv or []), False)]
    return ()


_EVENTS = frozenset({'subprocess.Popen', '_winapi.CreateProcess', 'os.system',
                     'os.startfile', 'os.startfile/2', 'os.spawn',
                     'os.posix_spawn', 'os.exec'})


def _refuse_what_a_test_run_must_not_start(event, args):
    """Audit hook, on every event through which Python starts a program:
    subprocess.Popen (raised by every Popen, whichever class made it, asyncio's
    own subclass too), _winapi.CreateProcess, os.system, os.startfile,
    os.spawn*, os.posix_spawn and os.exec*, each just before the operating
    system is asked.  One place for every test file: a new file cannot forget
    it.  Not covered, and nothing here can cover it: a start made through
    ctypes or by a child process."""
    if event not in _EVENTS:
        return
    lines = _lines_of(event, args)
    if not lines:
        return
    shown = _text(lines[0][0])
    if any(_starts_a_model_server(line, shell) for line, shell in lines):
        raise ModelServerStartRefused(
            f'a test run does not start a real model server ({shown!r}, '
            f'{event}).  To check a start, replace subprocess.Popen in the '
            'test with a double (unittest.mock.patch) and read its calls.')
    if os.environ.get(INSTALLED_APP_SWITCH, '').strip() == '1':
        return
    for line, shell in lines:
        what = _does_to_the_installed_app(line, shell)
        if what:
            raise InstalledAppNotAsked(
                f'a test run {what} the installed Nunba only when asked '
                f'({shown!r}, {event}): set {INSTALLED_APP_SWITCH}=1 to do it '
                'on purpose.  To check the call, replace subprocess.run or '
                'subprocess.Popen in the test with a double.')


# The variables install() sets.  A test that starts the REAL app on purpose
# must not hand them on to it (the app would boot no model and look in a
# private home): it starts it with env_outside_the_run().
RUN_VARIABLES = ('NUNBA_TEST_HOME', 'HEVOLVE_EAGER_LLM',
                 'NUNBA_DISABLE_LLAMA_AUTOSTART', 'HEVOLVE_DRAFT_FIRST')


def env_outside_the_run(environ=None) -> dict:
    """The environment without what install() put there."""
    environ = os.environ if environ is None else environ
    return {name: value for name, value in environ.items() if name not in RUN_VARIABLES}


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
    #
    # HEVOLVE_DRAFT_FIRST=0 is wider than the boot: HARTOS reads the same name
    # in chat() (hart_intelligence_entry.py) as "draft-first hard off, whatever
    # the request says", and a server a test starts as a child inherits it.
    # So in a run that goes through here an in-process /chat and such a child
    # never answer draft-first unless the test sets the variable itself
    # (monkeypatch.setenv('HEVOLVE_DRAFT_FIRST', '1') or env_extra).  No test
    # in this tree reads the name; one that measures draft-first must set it.
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

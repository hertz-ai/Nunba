"""A test run starts no real model server and writes nothing in the person's
~/.nunba.

21 Nov 2026: two runs of tests/test_chatbot_routes.py each started a real
llama-server from ~/.nunba/llama.cpp with the owner's model (ports 8082 and
8083, about 4 GB of video memory each, left running after the run), rewrote
~/.nunba/llama_config.json (server_port 8083) and ~/.nunba/server_status.json.

The way in: TestChatRoute.test_chat_local_fallback_returns_response posts
/chat with no model reachable.  The route answers "starting" and calls
get_orchestrator().ensure_loaded_async('llm') (routes/chatbot_routes.py),
whose background thread runs models/orchestrator.py LlamaLoader.load:
LlamaConfig() on ~/.nunba, _save_config(), start_server(), and in
_do_start_server the subprocess.Popen of llama-server.  The thread gets there
after the test has passed, so nothing a fixture sets is still in place.

tests/conftest.py now sets two things for the whole process, at import:
subprocess.Popen refuses to run llama-server, and NUNBA_TEST_HOME gives
llama.llama_installer._home_dir a private folder in place of the person's
home.  Nothing here starts a process: where a start is checked, the step that
hands the command to the operating system is a recorder.
"""
import ast
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# The first import of llama.llama_config or models.orchestrator pulls in
# HARTOS (transformers); cold, on a busy disk, that alone passed the
# default 60 s.
pytestmark = pytest.mark.timeout(300)

# What subprocess.Popen is while test modules are being imported, before any
# fixture of any test has run.
_POPEN_AT_IMPORT = subprocess.Popen


# ---------------------------------------------------------------------------
# No llama-server start
# ---------------------------------------------------------------------------

@pytest.fixture
def handed_to_the_os(monkeypatch):
    """Record every command that would reach the operating system through
    subprocess.Popen, and start none of them."""
    started = []

    def record(self, args, *rest, **kwargs):
        started.append(args)

    monkeypatch.setattr(subprocess.Popen, '_execute_child', record)
    return started


def _try_to_start(command, **kwargs):
    try:
        subprocess.Popen(command, **kwargs)
    except Exception as refusal:      # the refusal is the wanted outcome
        return refusal
    return None


_BIN = os.path.join('C:', os.sep, 'Users', 'someone', '.nunba', 'llama.cpp',
                    'build', 'bin', 'Release')

LLAMA_SERVER_STARTS = [
    # The shape _do_start_server builds: a list, the binary's full path first.
    [os.path.join(_BIN, 'llama-server.exe'), '--model', 'm.gguf', '--port', '8082'],
    ['C:/Users/someone/.trueflow/llama.cpp/build/bin/llama-server.exe', '--port', '8083'],
    ['/usr/local/bin/llama-server', '--port', '8080'],
    ['llama-server'],
    ['LLAMA-SERVER.EXE', '--port', '8081'],
    [Path(_BIN) / 'llama-server.exe', '--port', '8082'],
    (os.path.join(_BIN, 'llama-server.exe'), '--port', '8082'),
    'llama-server --port 8082',
    '"C:\\Program Files\\llama.cpp\\llama-server.exe" --port 8082',
    Path(_BIN) / 'llama-server.exe',
    b'llama-server --port 8082',
]


@pytest.mark.parametrize('command', LLAMA_SERVER_STARTS, ids=repr)
def test_a_llama_server_start_never_reaches_the_operating_system(
        command, handed_to_the_os):
    refusal = _try_to_start(command, cwd=None, env=dict(os.environ))

    assert handed_to_the_os == [], (
        'a test process handed a llama-server start to the operating system')
    assert refusal is not None
    assert 'subprocess.Popen' in str(refusal), (
        'the refusal must say how a test checks a start')


def test_the_start_is_refused_when_the_command_is_a_keyword(handed_to_the_os):
    try:
        subprocess.Popen(args=['llama-server', '--port', '8082'])
    except Exception:
        pass

    assert handed_to_the_os == []


OTHER_PROGRAMS = [
    [sys.executable, '-c', 'pass'],
    ['taskkill', '/F', '/IM', 'llama-server.exe'],
    ['nvidia-smi', '--query-gpu=memory.free', '--format=csv'],
    ['git', '-C', os.path.join(_BIN, 'llama-server'), 'status'],
    'tasklist | findstr llama-server',
    ['my-llama-server-wrapper', '--port', '8082'],
    ['llama-server-bench.exe'],
]


@pytest.mark.parametrize('command', OTHER_PROGRAMS, ids=repr)
def test_every_other_program_starts_as_before(command, handed_to_the_os):
    """Only the program being run counts.  A command that merely names
    llama-server (stopping one, listing one) is not a start."""
    subprocess.Popen(command)

    assert handed_to_the_os == [command]


def test_the_refusal_is_in_place_before_any_test_runs():
    """A fixture is too late and gone too soon: the start runs on a
    background thread after the test that asked for it has ended."""
    assert getattr(_POPEN_AT_IMPORT, 'refuses_model_servers', False), (
        'subprocess.Popen was the plain one while test modules were imported')
    assert subprocess.Popen is _POPEN_AT_IMPORT


def test_the_refusal_holds_on_another_thread_after_a_test(handed_to_the_os):
    import threading

    seen = []
    worker = threading.Thread(
        target=lambda: seen.append(_try_to_start(['llama-server'])))
    worker.start()
    worker.join(10)

    assert handed_to_the_os == []
    assert seen and seen[0] is not None


def test_a_tests_own_double_still_receives_the_start():
    """Tests that check a start replace subprocess.Popen, as they always
    have; the refusal is under the double, not over it."""
    from llama import llama_config

    with patch('subprocess.Popen') as double:
        llama_config.subprocess.Popen(['llama-server', '--port', '8082'])

    double.assert_called_once_with(['llama-server', '--port', '8082'])


def test_it_is_still_a_popen():
    assert isinstance(subprocess.Popen, type)
    assert subprocess.Popen.__mro__[-2].__name__ == 'Popen'
    with subprocess.Popen([sys.executable, '-c', 'pass']) as child:
        assert child.wait(30) == 0
        assert isinstance(child, subprocess.Popen)


# ---------------------------------------------------------------------------
# Nothing written in the person's home
# ---------------------------------------------------------------------------

def _everything_under(folder):
    return sorted(str(p.relative_to(folder)) for p in Path(folder).rglob('*'))


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


def test_the_load_a_chat_with_no_model_asks_for_writes_the_private_config(
        person, no_gpu_probe, monkeypatch):
    """The 21 Nov path itself, from the function the background thread runs,
    with the start replaced by a recorder."""
    from models.orchestrator import LlamaLoader

    from llama.llama_config import LlamaConfig
    from llama.llama_installer import MODEL_PRESETS
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
    from llama import llama_installer
    home = tmp_path / 'home'
    home.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    if value:
        monkeypatch.setenv('NUNBA_TEST_HOME', value)
    else:
        monkeypatch.delenv('NUNBA_TEST_HOME', raising=False)

    assert getattr(llama_installer, '_home_dir', Path.home)() == home


def test_the_persons_home_paired_with_no_folder_is_not_a_stand_in(tmp_path, monkeypatch):
    from llama import llama_installer
    home = tmp_path / 'home'
    home.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    monkeypatch.setenv('NUNBA_TEST_HOME', str(home) + os.pathsep)

    assert getattr(llama_installer, '_home_dir', Path.home)() == home


def test_an_explicit_config_folder_is_used_as_given(person, no_gpu_probe, tmp_path):
    from llama.llama_config import LlamaConfig
    home, private = person

    cfg = LlamaConfig(config_dir=str(tmp_path / 'given'))
    cfg._save_config()

    assert cfg.config_dir == tmp_path / 'given'
    assert (tmp_path / 'given' / 'llama_config.json').is_file()
    assert _everything_under(home) == []


def test_this_run_was_given_a_private_folder_for_the_real_home():
    from llama import llama_installer
    person_home, _, private = os.environ.get('NUNBA_TEST_HOME', '').partition(os.pathsep)

    assert person_home and private, 'tests/conftest.py set no private home'
    assert os.path.normcase(os.path.abspath(person_home)) == os.path.normcase(
        os.path.abspath(os.path.expanduser('~')))
    assert os.path.isdir(private)
    assert os.path.normcase(os.path.abspath(private)).startswith(
        os.path.normcase(os.path.abspath(tempfile.gettempdir())))
    assert getattr(llama_installer, '_home_dir', Path.home)() == Path(private)


def test_llama_config_asks_for_home_in_one_place():
    """The llama-server log folder and the two ~/.trueflow status files are
    built inside long start functions no test drives to that line.  Each must
    come from _home_dir, so none of them can name the person's home on its
    own again."""
    tree = ast.parse((PROJECT_ROOT / 'llama' / 'llama_config.py').read_text(
        encoding='utf-8'))
    direct = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
            continue
        owner = node.func.value
        if node.func.attr == 'home' and isinstance(owner, ast.Name) and owner.id == 'Path':
            direct.append((node.lineno, 'Path.home()'))
        if (node.func.attr == 'expanduser' and isinstance(owner, ast.Attribute)
                and owner.attr == 'path'):
            direct.append((node.lineno, 'os.path.expanduser()'))

    assert direct == [], f'llama_config.py names the home folder itself: {direct}'

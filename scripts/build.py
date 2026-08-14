#!/usr/bin/env python3
"""
build.py - Cross-platform build script for Nunba Desktop App

"A Friend, A Well Wisher, Your LocalMind"

Usage:
    python build.py              - Full build (auto-detect platform)
    python build.py app          - Build application only
    python build.py installer    - Build installer only (requires existing build)
    python build.py clean        - Clean build artifacts
    python build.py --platform windows  - Force Windows build
    python build.py --platform macos    - Force macOS build

Developer Setup — Clone repos (sibling directories):
    projects/
    ├── Nunba/              ← this repo (desktop app + React frontend)
    ├── HARTOS/             ← private: hertz-ai/HARTOS (backend engine)
    │   └── pyproject.toml declares these as dependencies (transitive):
    │       ├── hevolve-database  ← git+hertz-ai/Hevolve_Database
    │       └── embodied-ai       ← git+hertz-ai/HevolveAI
    ├── Hevolve_Database/   ← private: hertz-ai/Hevolve_Database (DB models, canonical)
    └── hevolveai/          ← private: hertz-ai/HevolveAI (embodied continual learner)

    Quick start:
        git clone https://github.com/hertz-ai/Nunba.git
        git clone https://github.com/hertz-ai/HARTOS.git
        # HARTOS gives transitive access to Hevolve_Database + hevolveai.
        # For direct editable installs (recommended for dev):
        git clone https://github.com/hertz-ai/Hevolve_Database.git
        git clone https://github.com/hertz-ai/HevolveAI.git
        cd Hevolve_Database && pip install -e . && cd ..
        cd hevolveai && pip install -e . && cd ..
        cd HARTOS && pip install -e . && cd ..

    The build script auto-discovers these sibling directories. If not found
    locally, it falls back to pip install from GitHub (requires git credentials
    for private repos).
"""
import argparse
import datetime
import os
import platform as plat
import re
import shutil
import subprocess
import sys
import tempfile
import threading

# Force unbuffered output so build logs appear in real time (not held until exit).
# Critical when running from IDEs, CI, or piped environments.
os.environ['PYTHONUNBUFFERED'] = '1'

# Ensure scripts/ is on sys.path so deps.py can be imported
_scripts_dir = os.path.dirname(os.path.abspath(__file__))
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)

from deps import VERSION, generate_requirements

APP_NAME = "Nunba"

# Detect platform
IS_WINDOWS = sys.platform == 'win32'
IS_MACOS = sys.platform == 'darwin'
IS_LINUX = sys.platform.startswith('linux')


HEVOLVE_REPO_URL = 'https://github.com/hertz-ai/HARTOS.git'
HEVOLVE_BRANCH = 'gpt4.1'
HEVOLVE_SOURCE_DIR = 'hartos_backend_src'


def fetch_hartos_backend_source():
    """Clone latest hart-backend source for bundling into the installer.

    This is used as a fallback when pip install fails, and also provides
    the source files that cx_Freeze bundles into the frozen executable.
    """
    print_info("Fetching latest hart-backend source...")

    if os.path.exists(HEVOLVE_SOURCE_DIR):
        # Pull latest if already cloned
        if os.path.exists(os.path.join(HEVOLVE_SOURCE_DIR, '.git')):
            if run_command(
                ['git', '-C', HEVOLVE_SOURCE_DIR, 'pull', '--ff-only'],
                "Updating existing hart-backend clone...",
                check=False
            ):
                return True

        # Remove stale directory and re-clone
        shutil.rmtree(HEVOLVE_SOURCE_DIR, ignore_errors=True)

    return run_command(
        ['git', 'clone', '--depth', '1', '--branch', HEVOLVE_BRANCH,
         HEVOLVE_REPO_URL, HEVOLVE_SOURCE_DIR],
        f"Cloning hart-backend ({HEVOLVE_BRANCH})...",
        check=False
    )



def _is_elevated():
    """True only when this process actually holds an elevated token."""
    if sys.platform != 'win32':
        return False
    try:
        import ctypes
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def normalize_embed_acl(path):
    r"""Undo the ACL damage an ELEVATED build does to python-embed.

    THE MECHANISM (proven on this machine, 2026-08-13):
    Windows COPY inherits ACLs from the destination; MOVE PRESERVES the
    source's.  `pip install --target` stages into a temp dir and then
    MOVES into place -- so a build launched from an elevated shell carries
    `BUILTIN\Administrators` ownership + SE_DACL_PROTECTED into
    python-embed.  A later NON-elevated run gets ERROR_ACCESS_DENIED on
    those files, and `os.path.isfile()` SWALLOWS OSError, so "access
    denied" silently becomes "file missing".  The integrity gate then
    reports the package CORRUPT and prescribes rm -rf -- which also hits
    access-denied.  That whole chain produced "23 file(s) STILL corrupt
    after autorepair" and exit 1, from a tree poisoned by an elevated
    build nine minutes earlier.  Nothing in the error text mentions
    permissions, which is why it read as corruption for hours.

    Being agnostic of HOW the build was launched means handing the tree
    back to normal inheritance while we still hold the privilege to do
    it.  `icacls /reset /T` re-applies inheritable ACLs from the parent
    (the repo directory, owned by the invoking user).

    Runs ONLY when actually elevated -- an ordinary build has nothing to
    undo, so this costs nothing in the common case.  Never fatal: a
    failure here must not fail an otherwise-good build; it leaves the
    pre-existing condition alone and says so loudly.
    """
    if not _is_elevated() or not os.path.isdir(path):
        return False
    print_info("Elevated build detected - normalizing python-embed ACLs "
               "so a later non-elevated run can still read the bundle")
    try:
        r = subprocess.run(
            ['icacls', path, '/reset', '/T', '/C', '/Q'],
            capture_output=True, text=True, timeout=1800)
        if r.returncode == 0:
            print_info("python-embed ACLs normalized (inheritance restored)")
            return True
        print_warn(
            f"icacls /reset returned {r.returncode}; python-embed may still "
            f"carry Administrators-only ACLs. A later NON-elevated run can "
            f"then misreport those files as corrupt. "
            f"{(r.stderr or r.stdout or '').strip()[:400]}")
    except Exception as e:
        print_warn(f"ACL normalization skipped ({type(e).__name__}: {e})")
    return False


def print_header(text):
    """Print a header line"""
    print("=" * 60, flush=True)
    print(f"  {text}", flush=True)
    print("=" * 60, flush=True)


def print_info(text):
    """Print info message"""
    print(f"[INFO] {text}", flush=True)


def print_warn(text):
    """Print warning message"""
    print(f"[WARN] {text}", flush=True)


def print_error(text):
    """Print error message"""
    print(f"[ERROR] {text}", flush=True)


def _nunba_build_log_path(name):
    """Return the absolute path to a build-category log file under
    ~/Documents/Nunba/logs/.

    Matches the convention CLAUDE.md calls out ("~/Documents/Nunba/logs"
    for all user-writable logs) so a single `tail -f` across that
    directory surfaces both build-time and runtime events.  The dir is
    created if missing so callers never have to guard for it.
    """
    _dir = os.path.join(
        os.path.expanduser('~'), 'Documents', 'Nunba', 'logs',
    )
    try:
        os.makedirs(_dir, exist_ok=True)
    except Exception:
        pass
    return os.path.join(_dir, name)


def _tee_subprocess_to_log(cmd, log_path, description=None, timeout_s=None):
    """Run a subprocess and stream (tee) stdout+stderr in real time to
    both the console AND `log_path` — so a `tail -f log_path` shows
    progress live even when the subprocess emits nothing to its own
    internal log files.

    Returns True on exit-code 0, False on failure / timeout / kill.
    On timeout the process is hard-killed and a clear marker is written
    to the log so operators can tell "wedged" from "errored".
    """
    if description:
        print_info(description)
    _cmd_str = cmd if isinstance(cmd, str) else ' '.join(cmd)
    print(f"  > {_cmd_str}", flush=True)

    try:
        _log = open(log_path, 'a', encoding='utf-8', buffering=1)  # line-buffered
    except OSError:
        _log = None

    _session_hdr = (
        f"\n===== build subprocess {datetime.datetime.now().isoformat()} "
        f"timeout={timeout_s}s =====\n  cmd: {_cmd_str}\n"
    )
    if _log:
        _log.write(_session_hdr)
        _log.flush()

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except Exception as e:
        _msg = f"[tee] failed to spawn: {e}"
        if _log:
            _log.write(_msg + '\n')
            _log.close()
        print_error(_msg)
        return False

    _timed_out = {'hit': False}

    def _killer():
        try:
            proc.wait(timeout=timeout_s)
        except subprocess.TimeoutExpired:
            _timed_out['hit'] = True
            try:
                proc.kill()
            except Exception:
                pass

    _killer_thread = None
    if timeout_s:
        _killer_thread = threading.Thread(target=_killer, daemon=True)
        _killer_thread.start()

    try:
        assert proc.stdout is not None
        for _line in proc.stdout:
            _line = _line.rstrip('\n')
            _ts = datetime.datetime.now().strftime('%H:%M:%S')
            _out = f"[{_ts}] {_line}"
            print(_out, flush=True)
            if _log:
                try:
                    _log.write(_out + '\n')
                    _log.flush()
                except Exception:
                    pass
    except Exception as e:
        print_error(f"[tee] read failed: {e}")

    try:
        _rc = proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _timed_out['hit'] = True
        try:
            proc.kill()
        except Exception:
            pass
        _rc = -1

    _footer = (
        f"===== build subprocess exit rc={_rc} timed_out={_timed_out['hit']} "
        f"@ {datetime.datetime.now().isoformat()} =====\n"
    )
    if _log:
        _log.write(_footer)
        _log.close()

    if _timed_out['hit']:
        print_error(
            f"Subprocess TIMED OUT after {timeout_s}s (killed). "
            f"Full live log: {log_path}"
        )
        return False
    if _rc != 0:
        print_warn(
            f"Subprocess exited rc={_rc}.  Live log: {log_path}"
        )
        return False
    return True


def run_command(cmd, description=None, check=True, timeout_s=None, env=None):
    """Run a command and optionally check for errors.

    timeout_s: if set, kill the subprocess after this many seconds and
    return False instead of blocking forever.  Used by acceptance gates
    that historically have wedged (e.g. the langchain-fix infinite-loop
    on some dev machines, 2026-04-19) — the bundle itself is usable but
    the verify step loops for 80+ min of CPU with no log output.

    env: optional environment override, forwarded to subprocess.run.
    Added for the python-embed pip top-up, which MUST run with
    PYTHONNOUSERSITE=1 — see the call site for why.  Optional and
    defaulting to None so every existing caller is unaffected.
    """
    if description:
        print_info(description)
    print(f"  > {cmd if isinstance(cmd, str) else ' '.join(cmd)}", flush=True)

    try:
        if isinstance(cmd, str):
            result = subprocess.run(cmd, shell=True, check=check,
                                    timeout=timeout_s, env=env)
        else:
            result = subprocess.run(cmd, check=check, timeout=timeout_s,
                                    env=env)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        _cmd_str = cmd if isinstance(cmd, str) else ' '.join(cmd)
        print_error(f"Command TIMED OUT after {timeout_s}s: {_cmd_str}")
        return False
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print_error(f"Command failed: {e}")
        return False


def _find_best_python():
    """Find the best non-conda Python for building.

    Conda Python bundles packages (numpy, etc.) with broken _distributor_init
    that lacks DLL loading code. cx_Freeze then bundles this broken numpy,
    causing 'numpy._core.multiarray failed to import' in the frozen app.

    Prefer standalone CPython (e.g. C:\\Python312) over conda/miniconda.
    """
    # Prefer specific standalone CPython installations
    candidates = []
    if IS_WINDOWS:
        for ver in ['312', '311', '313', '310']:
            for base in [f'C:\\Python{ver}', os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Python', f'Python{ver}')]:
                exe = os.path.join(base, 'python.exe')
                if os.path.isfile(exe):
                    candidates.append(exe)
    else:
        for ver in ['3.12', '3.11', '3.13', '3.10']:
            for base in [f'/usr/local/bin/python{ver}', f'/usr/bin/python{ver}']:
                if os.path.isfile(base):
                    candidates.append(base)

    # Filter out conda/miniconda
    conda_keywords = ('conda', 'miniconda', 'anaconda', 'miniforge', 'mambaforge')
    for exe in candidates:
        low = exe.lower()
        if not any(kw in low for kw in conda_keywords):
            return exe

    # Fallback: use current Python even if conda
    return sys.executable


def activate_venv():
    """Get or create an isolated build venv.

    A dedicated venv ensures:
    - All packages are pip-installed from wheels (no conda mixing)
    - No --user fallback (venv site-packages is always writable)
    - No user site-packages leaking into the build
    - Reproducible builds regardless of host Python environment

    On CI (NUNBA_CI=1), skip venv — deps are pre-installed by the workflow.
    """
    if os.environ.get('NUNBA_CI'):
        print_info("CI mode — using system Python (deps pre-installed by workflow)")
        return sys.executable

    venv_dir = '.venv'
    venv_paths = ['.venv', 'venv']

    for venv in venv_paths:
        if IS_WINDOWS:
            python_exe = os.path.join(venv, 'Scripts', 'python.exe')
        else:
            python_exe = os.path.join(venv, 'bin', 'python')

        if os.path.exists(python_exe):
            print_info(f"Using existing virtual environment: {venv}")
            return python_exe

    # No venv found — create one for clean, isolated builds
    base_python = _find_best_python()
    print_header("Creating build virtual environment")
    print_info(f"Base Python: {base_python}")

    if not run_command(
        [base_python, '-m', 'venv', venv_dir],
        f"Creating .venv with {base_python}...",
        check=False
    ):
        print_warn(f"Failed to create venv. Using system Python: {sys.executable}")
        return sys.executable

    if IS_WINDOWS:
        python_exe = os.path.join(venv_dir, 'Scripts', 'python.exe')
    else:
        python_exe = os.path.join(venv_dir, 'bin', 'python')

    if not os.path.exists(python_exe):
        print_warn("Venv created but python not found. Using system Python.")
        return sys.executable

    # Upgrade pip in the fresh venv
    run_command(
        [python_exe, '-m', 'pip', 'install', '--upgrade', 'pip'],
        "Upgrading pip in venv...",
        check=False
    )

    print_info(f"Build venv ready: {python_exe}")
    return python_exe


def clean_build():
    """Clean build artifacts"""
    print_header("Cleaning build artifacts")

    dirs_to_remove = ['build', 'dist', 'Output', 'dmg_temp']
    files_to_remove = ['app.icns', '*.dmg']

    for d in dirs_to_remove:
        if os.path.exists(d):
            print_info(f"Removing {d}/")
            shutil.rmtree(d, ignore_errors=True)

    for pattern in files_to_remove:
        if '*' in pattern:
            import glob
            for f in glob.glob(pattern):
                print_info(f"Removing {f}")
                os.remove(f)
        elif os.path.exists(pattern):
            print_info(f"Removing {pattern}")
            os.remove(pattern)

    # Clean iconset on macOS
    if os.path.exists('app.iconset'):
        shutil.rmtree('app.iconset', ignore_errors=True)

    print_info("Done. All build artifacts removed.")


def install_dependencies(python_exe):
    """Install required dependencies from centralized deps.py

    Generates requirements.txt from deps.py (single source of truth),
    then installs via pip install -r. All versions are exact-pinned
    so pip has zero resolution work.
    """
    print_header("Installing Python dependencies")

    # Generate requirements.txt from deps.py — the ONE source of truth.
    # This keeps requirements.txt in sync for CI cache keys + pip-audit.
    req_file = generate_requirements('requirements.txt', sys.platform)
    print_info(f"Installing dependencies (VERSION {VERSION})")

    cmd = [python_exe, '-m', 'pip', 'install', '-r', req_file]
    if not run_command(cmd, "Installing dependencies...", check=False):
        print_warn("Some dependencies may have failed to install.")
        print_info("Continuing with build...")

    # Fix crossbarhttp circular import: its __init__.py uses Python 2-style
    # absolute self-import (from crossbarhttp import Client) which fails in
    # frozen executables. Patch to relative import (from .crossbarhttp import ...).
    _fix_crossbarhttp(python_exe)

    # Install hart-backend: prefer local sibling project, fall back to git
    _install_hartos_backend(python_exe)


def _fix_crossbarhttp(python_exe):
    """Fix crossbarhttp's circular import for cx_Freeze compatibility.

    crossbarhttp 0.1.2's __init__.py uses `from crossbarhttp import Client`
    (Python 2-style absolute self-import). In frozen executables this causes:
        ImportError: cannot import name 'Client' from partially initialized
        module 'crossbarhttp' (circular import)
    Fix: patch to relative import `from .crossbarhttp import Client`.
    """
    # Find the installed __init__.py
    site_pkgs = subprocess.check_output(
        [python_exe, '-c', 'import site; print(site.getsitepackages()[0])'],
        text=True,
    ).strip()
    init_py = os.path.join(site_pkgs, 'crossbarhttp', '__init__.py')
    if not os.path.exists(init_py):
        return
    with open(init_py) as f:
        content = f.read()
    old = 'from crossbarhttp import ('
    new = 'from .crossbarhttp import ('
    if old in content and new not in content:
        content = content.replace(old, new)
        with open(init_py, 'w') as f:
            f.write(content)
        print_info("Fixed crossbarhttp circular import (absolute to relative)")


def _stamp_version_in_file(filepath, pattern, replacement):
    """Replace a version string in a file using regex.

    Used to propagate VERSION from deps.py into files that can't import it
    at runtime (e.g. desktop/config.py runs inside frozen exe where scripts/
    doesn't exist).
    """
    if not os.path.exists(filepath):
        print_warn(f"Cannot stamp version: {filepath} not found")
        return False
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print_info(f"Stamped VERSION {VERSION} into {os.path.basename(filepath)}")
        return True
    return False


# NOTE: A `generate_build_hashes()` function used to live here that
# wrote a `build_hashes.json` next to the project root.  It was DEAD
# CODE — never called from any build phase, and the file never got
# included in the cx_Freeze bundle.  Meanwhile the build's actual
# version stamp is `BUILD_INFO.txt` (written further down in this
# file: search `_bi_path = os.path.join('build', 'Nunba',
# 'BUILD_INFO.txt')`).  Keeping the dead function around led
# main.py::harthash to read the never-shipped JSON and surface
# `unknown` for the version even on a successfully-built install.
#
# Removed 2026-04-27.  /api/harthash now reads BUILD_INFO.txt as the
# source of truth (with build_hashes.json as a legacy fallback for
# pre-removal installs); see main.py:harthash for the read order.


def stamp_version():
    """Stamp VERSION from deps.py into runtime files that can't import it."""
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(scripts_dir)

    # desktop/config.py: APP_VERSION = "X.Y.Z"
    _stamp_version_in_file(
        os.path.join(project_dir, 'desktop', 'config.py'),
        r'APP_VERSION\s*=\s*"[^"]*"',
        f'APP_VERSION = "{VERSION}"',
    )

    # desktop/crash_reporter.py: APP_VERSION = "X.Y.Z" (fallback)
    _stamp_version_in_file(
        os.path.join(project_dir, 'desktop', 'crash_reporter.py'),
        r'APP_VERSION\s*=\s*"[^"]*"',
        f'APP_VERSION = "{VERSION}"',
    )


def _find_local_hartos_backend():
    """Look for local HARTOS repo as a sibling directory."""
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(scripts_dir)
    parent = os.path.dirname(project_dir)

    candidates = [
        os.path.join(parent, 'HARTOS'),
        os.path.join(parent, 'hart-backend'),
    ]

    for path in candidates:
        pyproject = os.path.join(path, 'pyproject.toml')
        if os.path.exists(pyproject):
            print_info(f"Found local hart-backend at: {path}")
            return path

    return None


def _install_hevolve_database(python_exe):
    """Install hevolve-database (single source of truth for all DB models) from local sibling.

    MUST be called BEFORE hart-backend install. hart-backend's pyproject.toml
    declares hevolve-database as a git dependency. Pre-installing from local
    sibling satisfies the dependency so pip skips the git URL.
    """
    candidates = [
        # 1. Sibling directory (canonical repo clone)
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'Hevolve_Database'),
        # 2. User's PycharmProjects directory (fallback)
        os.path.join(os.path.expanduser('~'), 'PycharmProjects', 'Hevolve_Database'),
    ]
    for path in candidates:
        if os.path.exists(os.path.join(path, 'setup.py')):
            if run_command(
                [python_exe, '-m', 'pip', 'install', path],
                "Installing hevolve-database from local project...",
                check=False,
            ):
                return

    # Fallback: pip install from GitHub
    run_command(
        [python_exe, '-m', 'pip', 'install',
         'hevolve-database@git+https://github.com/hertz-ai/Hevolve_Database.git@realistic_intro_video'],
        "Installing hevolve-database (DB models)...",
        check=False,
    )


def _torch_constraints_file():
    """Write a pip *constraints* file pinning torch/torchaudio/torchvision to
    Nunba's requirements.txt versions, and return its path (or None).

    Why this exists: HevolveAI declares a loose `torch>=2.1.0` floor
    (requirements.txt / setup.py).  When `_install_embodied_ai` runs `pip
    install <hevolveai>` with deps, pip's resolver honours that floor and
    silently UPGRADES the torch that install_dependencies() already pinned
    (torch==2.10.0) to the newest available (2.11.0) — uninstalling the
    matched 2.10.0 pair in the process.  The frozen bundle then ships
    torchaudio 2.10.0 against torch 2.11.0 (ABI mismatch) with torch itself
    excluded from lib/, so the first /chat request hits the torch/torchaudio
    native path and hard-crashes the app (no Python traceback).

    Passing this file as `pip install -c <file>` makes Nunba's pins
    authoritative over HevolveAI's floor WITHOUT touching its other deps —
    DRY: the versions come from requirements.txt, not a second hardcoded copy.
    """
    req = os.path.join(os.path.dirname(_scripts_dir), 'requirements.txt')
    pins = []
    try:
        with open(req, encoding='utf-8') as fh:
            for line in fh:
                s = line.strip()
                if s.lower().startswith(('torch==', 'torchaudio==', 'torchvision==')):
                    pins.append(s)
    except OSError:
        return None
    if not pins:
        return None
    fd, path = tempfile.mkstemp(prefix='nunba_torch_constraints_', suffix='.txt')
    with os.fdopen(fd, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(pins) + '\n')
    print_info(f"torch constraint pins (vs HevolveAI's torch>=2.1.0): {', '.join(pins)}")
    return path


def _install_embodied_ai(python_exe):
    """Install HevolveAI (Embodied Continual Learner With Hiveintelligence) from local sibling first.

    MUST be called BEFORE hart-backend install. hart-backend's pyproject.toml
    declares `embodied-ai @ git+https://github.com/hertz-ai/HevolveAI.git@main`
    which is a private repo. If pip can't reach it, the entire hart-backend
    install fails. Pre-installing from the local sibling satisfies the dependency
    so pip skips the git URL during hart-backend resolution.

    Falls back to git install only if local sibling is unavailable (requires
    the user's git credentials for private repo access).

    Always passes `-c <torch-constraints>` so HevolveAI's loose `torch>=2.1.0`
    floor cannot clobber Nunba's pinned torch==2.10.0 / torchaudio==2.10.0 pair
    (see `_torch_constraints_file` for the crash this prevents).
    """
    _constraints = _torch_constraints_file()
    _c_args = ['-c', _constraints] if _constraints else []

    # Try local sibling first
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'hevolveai'),
        os.path.join(os.path.expanduser('~'), 'PycharmProjects', 'hevolveai'),
    ]
    for path in candidates:
        if os.path.exists(os.path.join(path, 'setup.py')):
            if run_command(
                [python_exe, '-m', 'pip', 'install', *_c_args, path],
                "Installing embodied-ai from local project (torch pins constrained)...",
                check=False,
            ):
                return

    # Fallback: pip install from GitHub
    run_command(
        [python_exe, '-m', 'pip', 'install', *_c_args,
         'embodied-ai@git+https://github.com/hertz-ai/HevolveAI.git@main'],
        "Installing HevolveAI (Continual Learner)...",
        check=False,
    )


def _install_hartos_backend(python_exe):
    """Install hart-backend with smart source detection.

    Priority:
      1. Local sibling project (non-editable install for frozen exe compatibility)
      2. pip install from GitHub main branch (requires user's git credentials)
      3. git clone fallback for cx_Freeze bundling

    Installs embodied-ai from local sibling FIRST, because hart-backend's
    pyproject.toml declares it as a git dependency. If pip can't reach the
    private git repo, the entire install fails. Pre-installing from local
    sibling satisfies the dependency so pip skips the git URL.

    Pins langchain==0.0.230 (monolithic) after install because pyproject.toml
    says >=0.0.230 which pip resolves to 1.x (slim package without llms/chains/etc.),
    breaking `from langchain.llms import OpenAI` in hart_intelligence (hart_intelligence.py).
    """
    # Pre-install dependencies from local siblings so pip doesn't try git URLs
    _install_hevolve_database(python_exe)
    _install_embodied_ai(python_exe)

    # 1. Check for local sibling project (non-editable for frozen exe compatibility)
    #    Use --no-deps because pyproject.toml declares embodied-ai as a private
    #    git URL that pip can't resolve. All deps are already installed above.
    local_path = _find_local_hartos_backend()
    if local_path:
        # Try with --no-deps first (avoids private git URL resolution failure)
        cmd = [python_exe, '-m', 'pip', 'install', '--no-deps', local_path]
        if not run_command(cmd, "Installing hart-backend (--no-deps)...", check=False):
            # Fallback: try full install (may work if git credentials are available)
            cmd = [python_exe, '-m', 'pip', 'install', local_path]
            if not run_command(cmd, "Installing hart-backend (full)...", check=False):
                print_warn("Local install failed. Trying git...")
                local_path = None  # fall through to git attempt

        if local_path:
            return

    # 2. pip install from GitHub (requires user's git credentials for private repos)
    hevolve_cmd = [
        python_exe, '-m', 'pip', 'install', '--no-deps',
        'hart-backend@git+https://github.com/hertz-ai/HARTOS.git@main'
    ]
    if run_command(hevolve_cmd, "Installing latest hart-backend from GitHub...", check=False):
        return

    # 3. Fallback: clone the repo source for cx_Freeze bundling
    print_warn("hart-backend pip install failed. Trying local clone...")
    fetch_hartos_backend_source()


def build_react_landing_page():
    """Build React landing-page if Node.js is available"""
    landing_dir = 'landing-page'

    if not os.path.isdir(landing_dir):
        print_info("No landing-page directory found, skipping React build.")
        return True

    # Check if Node.js is available
    try:
        result = subprocess.run(
            ['node', '--version'], capture_output=True, text=True
        )
        if result.returncode != 0:
            raise FileNotFoundError
    except (FileNotFoundError, OSError):
        print_warn("Node.js not found. Skipping React build.")
        print_info("Using existing landing-page/build.")
        return True

    print_header("Building React landing-page")
    # Unconditional `npm run build` — no mtime heuristic, no
    # "if _stale" guard.  Stale landing-page/build/ has shipped twice
    # in this session; every build run rebuilds the React bundle so the
    # installer always reflects HEAD.
    print_info("React bundle: running `npm run build` unconditionally.")

    # Install npm packages
    npm_cmd = 'npm.cmd' if IS_WINDOWS else 'npm'
    node_modules = os.path.join(landing_dir, 'node_modules')

    if os.path.isdir(node_modules):
        subprocess.run(
            [npm_cmd, 'install', '--legacy-peer-deps'],
            cwd=landing_dir, check=False
        )
    else:
        result = subprocess.run(
            [npm_cmd, 'install', '--legacy-peer-deps'],
            cwd=landing_dir, check=False
        )
        if result.returncode != 0:
            print_warn("npm install failed. Using existing landing-page/build.")
            return True

    # Build — increase Node.js heap to prevent OOM on large bundles.
    # 4GB was insufficient on the current landing-page bundle size
    # (webpack + tailwind + all lazy-split chunks): saw `FATAL ERROR:
    # CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of
    # memory` at 4096MB on 2026-04-15.  Bumped to 8192MB.  If CI runners
    # have less than 8GB available, scale via env override.
    env = os.environ.copy()
    env['CI'] = 'false'
    env['ESLINT_NO_DEV_ERRORS'] = 'true'
    env['DISABLE_ESLINT_PLUGIN'] = 'true'  # skip ESLint entirely during build
    _node_heap_mb = os.environ.get('NUNBA_NODE_HEAP_MB', '8192')
    env['NODE_OPTIONS'] = f'--max-old-space-size={_node_heap_mb}'

    # stdin=DEVNULL: on Windows CI npm can emit 'Terminate batch job (Y/N)?'
    # and block forever waiting on a console that will never answer.
    result = subprocess.run(
        [npm_cmd, 'run', 'build'],
        cwd=landing_dir, env=env, check=False, stdin=subprocess.DEVNULL
    )
    if result.returncode != 0:
        print_error("React build failed! Fix the build errors before freezing.")
        print_error("The frozen app will ship a broken frontend otherwise.")
        return False

    print_info("React build complete (output in landing-page/build/).")
    return True


def run_setup_wizard(python_exe, dsn=None):
    """Run the configuration wizard for crash reporting setup"""
    print_header("Configuration Wizard")

    # Check if already configured
    result = subprocess.run(
        [python_exe, os.path.join('desktop', 'setup_wizard.py'), '--check'],
        capture_output=True, text=True
    )

    if 'configured' in result.stdout and 'not_configured' not in result.stdout:
        print_info("Crash reporting is already configured.")
        return True

    # If DSN provided via command line, set it directly
    if dsn:
        print_info("Setting Sentry DSN from command line...")
        result = subprocess.run(
            [python_exe, os.path.join('desktop', 'setup_wizard.py'), '--dsn', dsn],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print_info("Sentry DSN configured successfully.")
            return True
        else:
            print_warn("Failed to set DSN. Continuing without crash reporting.")
            return False

    # Run interactive wizard
    print_info("Running interactive setup wizard...")
    print()
    result = subprocess.run([python_exe, os.path.join('desktop', 'setup_wizard.py')])

    return result.returncode == 0


def ensure_webview2_bootstrapper():
    """Download WebView2 bootstrapper if not present"""
    bootstrapper_path = "MicrosoftEdgeWebview2Setup.exe"
    bootstrapper_url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

    if os.path.exists(bootstrapper_path):
        print_info("WebView2 bootstrapper already present")
        return True

    print_info("Downloading WebView2 bootstrapper...")
    try:
        import urllib.request
        urllib.request.urlretrieve(bootstrapper_url, bootstrapper_path)
        if os.path.exists(bootstrapper_path):
            print_info(f"Downloaded: {bootstrapper_path}")
            return True
        else:
            print_error("Download failed - file not created")
            return False
    except Exception as e:
        print_error(f"Failed to download WebView2 bootstrapper: {e}")
        print_info("Please download manually from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/")
        return False


def slim_python_embed():
    """Remove unnecessary files from python-embed to reduce installer size.

    Strips pip, setuptools, test suites, __pycache__, .dist-info metadata,
    and CLI scripts that aren't needed at runtime.
    """
    embed_dir = os.path.join('build', 'Nunba', 'python-embed')
    if not os.path.exists(embed_dir):
        print_info("No python-embed in build, skipping slim step")
        return

    print_header("Slimming python-embed")
    site_packages = os.path.join(embed_dir, 'Lib', 'site-packages')
    removed_mb = 0

    # Tier 1: Remove dev/build tools not needed at runtime.
    # NOTE: pip is KEPT — needed for runtime auto-install of GPU torch,
    # TTS backends (chatterbox, cosyvoice), and model dependencies.
    # The install_cuda_torch() and install_backend_full() paths in
    # tts/package_installer.py call python-embed's pip at runtime.
    dev_packages = ['_distutils_hack', 'pkg_resources']
    for pkg in dev_packages:
        pkg_dir = os.path.join(site_packages, pkg)
        if os.path.exists(pkg_dir):
            size = _dir_size_mb(pkg_dir)
            shutil.rmtree(pkg_dir, ignore_errors=True)
            removed_mb += size
            print_info(f"Removed {pkg}/ ({size:.1f} MB)")

    # Dead-code removal (2026-04-17): the former allowlist-based strip
    # approach kept biting — transformers' runtime dep graph reaches
    # filelock, tqdm, regex, and others that the allowlist repeatedly
    # missed.  Policy now: keep ALL .dist-info (~5 MB total, negligible
    # vs installer size).  The dist-info branch in the walker below is
    # a no-op `continue`; the whole set is gone.

    # Remove tests, __pycache__ always; dist-info is kept (not stripped) per
    # runtime-metadata consumers.
    for root, dirs, files in os.walk(site_packages, topdown=False):
        for d in list(dirs):
            full_path = os.path.join(root, d)
            if d in ('tests', 'test', '__pycache__'):
                size = _dir_size_mb(full_path)
                shutil.rmtree(full_path, ignore_errors=True)
                removed_mb += size
            elif d.endswith('.dist-info'):
                # KEEP ALL dist-info in python-embed.  Total size is ~5MB.
                # transformers.dependency_versions_check calls
                # importlib.metadata.version() for tqdm, filelock, regex,
                # numpy, tokenizers, safetensors, accelerate, packaging,
                # pyyaml at import time.  ANY missing dist-info crashes
                # the entire parler_tts import chain.  An earlier
                # allowlist approach failed repeatedly — tqdm, filelock,
                # and others kept getting stripped because the set
                # couldn't keep up with transformers' dep checks.
                # 5MB of metadata is not worth the ongoing breakage.
                continue

    # Remove Scripts directory (CLI tools not needed at runtime)
    scripts_dir = os.path.join(embed_dir, 'Scripts')
    if os.path.exists(scripts_dir):
        size = _dir_size_mb(scripts_dir)
        shutil.rmtree(scripts_dir, ignore_errors=True)
        removed_mb += size
        print_info(f"Removed Scripts/ ({size:.1f} MB)")

    # Remove editable install artifacts (hardcoded dev paths won't work in frozen exe)
    import glob as _glob
    for f in _glob.glob(os.path.join(site_packages, '__editable__*')):
        try:
            fsize = os.path.getsize(f) / (1024 * 1024)
            os.remove(f)
            removed_mb += fsize
            print_info(f"Removed editable artifact: {os.path.basename(f)}")
        except OSError:
            pass
    # Remove editable finder modules (e.g. __editable___hartos_backend_0_0_0_finder.py)
    for f in _glob.glob(os.path.join(site_packages, '__editable___*_finder.py')):
        try:
            fsize = os.path.getsize(f) / (1024 * 1024)
            os.remove(f)
            removed_mb += fsize
            print_info(f"Removed editable finder: {os.path.basename(f)}")
        except OSError:
            pass
    # Remove .pth files that reference dev machine paths
    for f in _glob.glob(os.path.join(site_packages, '*.pth')):
        try:
            with open(f) as fh:
                content = fh.read()
            if '__editable__' in content or 'PycharmProjects' in content:
                os.remove(f)
                print_info(f"Removed dev .pth file: {os.path.basename(f)}")
        except (OSError, UnicodeDecodeError):
            pass

    # Tier 2: Remove confirmed-unused large packages.
    # Verified: zero imports in Nunba core or HARTOS core code.
    # Packages like torch, cv2, numpy, faiss, transformers ARE used and kept.
    # sympy was previously listed here but is LOAD-BEARING: torch 2.10's
    # torch._dynamo / torch.fx.experimental.symbolic_shapes / torch.utils._sympy
    # all import sympy at torch import time.  Indic Parler TTS (and every
    # transformers-backed generator) crashes with `ModuleNotFoundError:
    # No module named 'sympy'` when it's stripped from python-embed.
    # It now lives in EMBED_DEPS (deps.py) so the presence gate reinstalls
    # it on every build; do NOT re-add it to unused_packages.
    unused_packages = [
        # Not imported anywhere in core code (0 references)
        'scipy', 'scipy.libs',           # 137 MB - not imported
        'pandas',                          # 60 MB  - not imported
        'chromadb_rust_bindings',          # 57 MB  - chromadb not used in core
        'sklearn',                         # 41 MB  - not imported
        'kubernetes', 'kubernetes_asyncio',# 34 MB  - server-only, not desktop
        'networkx',                        # 15 MB  - transitive dep only
        'lief',                            # 12 MB  - binary analysis, not needed
        'pythonwin',                       # 11 MB  - dev tool
        'grpc', 'grpcio',                  # 12 MB  - google cloud only
    ]
    for pkg in unused_packages:
        pkg_dir = os.path.join(site_packages, pkg)
        if os.path.exists(pkg_dir):
            size = _dir_size_mb(pkg_dir)
            shutil.rmtree(pkg_dir, ignore_errors=True)
            removed_mb += size
            print_info(f"Removed {pkg}/ ({size:.1f} MB)")

    print_info(f"Total removed: {removed_mb:.0f} MB")


def _dir_size_mb(path):
    """Get directory size in MB"""
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            try:
                total += os.path.getsize(os.path.join(dirpath, f))
            except OSError:
                pass
    return total / (1024 * 1024)


def build_windows(python_exe, app_only=False, installer_only=False):
    """Build on Windows"""
    if installer_only:
        # Skip cx_Freeze, jump straight to Inno Setup
        return _build_windows_installer(python_exe)

    # Clean previous build before rebuilding
    build_dir = os.path.join('build', 'Nunba')
    if os.path.exists(build_dir):
        print_info("Cleaning previous build (preserving python-embed if unchanged)...")
        for item in os.listdir(build_dir):
            if item in ['python-embed', 'python-embed.hash']:
                continue
            item_path = os.path.join(build_dir, item)
            try:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                else:
                    os.remove(item_path)
            except Exception as e:
                print_warn(f"Failed to remove {item_path}: {e}")

    # Auto-create / refresh python-embed.
    #
    # Two invalidation gates — BOTH had to be added (2026-04-16) because
    # the original "only rebuild if dir missing" check turned every
    # EMBED_DEPS edit into a silent no-op: the `regex` pin landed in
    # deps.py (commits 481f25a, 31e480e, 0c6274f) but the stale snapshot
    # from an earlier build kept being reused, so every Indic Parler
    # load failed with `ModuleNotFoundError: No module named 'regex'`.
    #
    #   Gate A (hash): compare compute_embed_deps_hash() against the
    #   hash stored in python-embed.hash — mismatch triggers a full
    #   rebuild.  Any addition / removal / version bump in EMBED_DEPS
    #   flips the hash.
    #
    #   Gate B (presence): even on hash match, verify every package
    #   has a directory under site-packages and top-up any missing
    #   ones.  Survives the case where someone slimmed the snapshot
    #   manually or a prior build's slim step deleted too much.
    from deps import compute_embed_deps_hash, get_embed_install_list, missing_embed_packages
    embed_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'python-embed')
    hash_file = embed_src + '.hash'
    current_hash = compute_embed_deps_hash()
    stored_hash = None
    if os.path.isfile(hash_file):
        try:
            with open(hash_file, encoding='utf-8') as _hf:
                stored_hash = _hf.read().strip()
        except OSError:
            stored_hash = None

    # Forward-only atomic rebuild contract (2026-05-02):
    #   - rebuild_python_embed.py works in python-embed.building/ and
    #     atomic-swaps into python-embed/ ONLY after end-to-end
    #     verification passes (torch + torch._C + transformers +
    #     hevolveai canaries all loadable).
    #   - On any failure the live python-embed/ is unchanged and the
    #     scratch dir is preserved for forensics.  The script exits
    #     non-zero and we abort the build rather than ship a broken
    #     bundle.  Recovery is forward-only: re-run after fixing the
    #     root cause; the next run wipes the scratch dir at step 1.
    #   - The venv + ensurepip + launcher overlay is part of every
    #     full rebuild (no presence-gate forcing rebuilds for it).
    #     If you have an older python-embed snapshot without the
    #     overlay and don't want to bump deps, run:
    #       python scripts/rebuild_python_embed.py --overlay-only
    _needs_full_rebuild = (
        not os.path.isdir(embed_src)
        or not os.listdir(embed_src)
        or stored_hash != current_hash
    )
    rebuild_script = os.path.join('scripts', 'rebuild_python_embed.py')

    if _needs_full_rebuild:
        if not os.path.isdir(embed_src) or not os.listdir(embed_src):
            _reason = 'missing'
        else:
            _reason = f'EMBED_DEPS hash changed ({stored_hash} -> {current_hash})'
        print_header(f"Rebuilding python-embed ({_reason})")
        if not os.path.isfile(rebuild_script):
            print_error(f"rebuild_python_embed.py not found at {rebuild_script}")
            print_error("Aborting build — refusing to ship without a current python-embed.")
            sys.exit(1)
        if run_command([python_exe, rebuild_script],
                       "Building python-embed (atomic, scratch -> swap)..."):
            # Stamp the new hash so subsequent builds skip the rebuild.
            try:
                with open(hash_file, 'w', encoding='utf-8') as _hf:
                    _hf.write(current_hash)
                print_info(f"Wrote python-embed.hash = {current_hash}")
            except OSError as _e:
                print_warn(f"Failed to write {hash_file}: {_e}")
        else:
            print_error("python-embed rebuild FAILED — atomic swap was not performed.")
            print_error("Live python-embed/ is unchanged; scratch dir python-embed.building/")
            print_error("preserved for forensics.  Refusing to ship a broken/stale bundle.")
            print_error("Inspect the rebuild output above, fix the root cause, and re-run")
            print_error("'python scripts/build.py'.  The next run wipes the scratch dir")
            print_error("at step 1 and starts fresh.")
            sys.exit(1)
    else:
        print_info(f"python-embed exists and hash matches ({embed_src}, {current_hash})")

    # Gate B — presence check for each EMBED_DEPS package.  Fires even
    # when the hash matched, because a slim step or manual edit can
    # remove a directory without bumping the hash.  Top up just the
    # missing packages via an incremental pip install — no full rebuild.
    _embed_sp = os.path.join(embed_src, 'Lib', 'site-packages')
    if os.path.isdir(_embed_sp):
        _missing = missing_embed_packages(_embed_sp)
        if _missing:
            print_header(f"Topping up {len(_missing)} missing embed package(s): {_missing}")
            # Resolve pinned specs for just the missing names
            _all_specs = get_embed_install_list(include_torch=True)
            _by_name = {spec.split('==', 1)[0].lower(): spec for spec in _all_specs}
            _missing_specs = [_by_name[n.lower()] for n in _missing if n.lower() in _by_name]
            if _missing_specs:
                _embed_py = os.path.join(embed_src, 'python.exe' if sys.platform == 'win32' else 'bin/python')
                if os.path.isfile(_embed_py):
                    # PYTHONNOUSERSITE=1 is LOAD-BEARING, not hygiene.
                    #
                    # python-embed's python312._pth has `import site`
                    # UNCOMMENTED, so site processing runs and the USER
                    # site-dir (%APPDATA%\Roaming\Python\Python312\
                    # site-packages) lands on sys.path.  pip then resolves
                    # against it and reports "Requirement already satisfied"
                    # for a package that is NOT in the bundle — so this
                    # top-up step could detect torch missing, "install" it,
                    # and leave python-embed without torch.  A step that
                    # cannot succeed (cf. #620's warning that cannot fail).
                    #
                    # PROVEN 2026-08-12 on this machine:
                    #   without: "Requirement already satisfied: torch==2.10.0
                    #             in ...\Roaming\Python\Python312\site-packages"
                    #   with:    "Collecting torch==2.10.0 / Would install
                    #             torch-2.10.0"
                    # and torch was in fact ABSENT from
                    # python-embed/Lib/site-packages while the build reported
                    # topping it up.  CPU torch is deliberately BUNDLED (the
                    # GPU build is size-heavy and hardware-specific, so it is
                    # runtime-installed into ~/.nunba instead) — so a bundle
                    # without CPU torch breaks the "runtime deps are bundled"
                    # guarantee outright.
                    #
                    # scripts/rebuild_python_embed.py:308-312 ALREADY does
                    # this, with a comment describing this exact failure
                    # ("pip sees packages in AppData\Roaming... and skips
                    # them, leaving python-embed empty").  That lesson simply
                    # never reached this second python-embed installer — one
                    # copy learned it, the other did not.  Both now isolate.
                    _embed_env = os.environ.copy()
                    _embed_env['PYTHONNOUSERSITE'] = '1'
                    run_command(
                        [_embed_py, '-m', 'pip', 'install', *_missing_specs,
                         '--no-warn-script-location', '--no-deps'],
                        "Installing missing embed packages",
                        env=_embed_env,
                    )

    # Elevation vaccine -- MUST run after every python-embed write.
    # This call covers the writes ABOVE (atomic rebuild + incremental
    # top-up).  It is NOT the last one: cx_Freeze's post-build hook
    # writes python-embed again, so the vaccine runs a second time after
    # that call too.  See the note there before deleting either.
    normalize_embed_acl(embed_src)

    print_header("Building Nunba executable with cx_Freeze")

    # Purge all __pycache__ dirs and stale .pyc files before cx_Freeze.
    # cx_Freeze reads source .py files directly and compiles them into
    # lib/*.pyc. If stale __pycache__/*.pyc exist from a previous build
    # or IDE run, cx_Freeze may pick those up instead of the latest source.
    # Also removes the previous build output to prevent stale .pyc carry-over.
    print_info("Purging __pycache__ and stale .pyc to ensure fresh compilation...")
    _purged = 0
    for _purge_root in ['.', os.path.join('..', 'HARTOS')]:
        if os.path.isdir(_purge_root):
            for _root, _dirs, _files in os.walk(_purge_root):
                if '__pycache__' in _dirs:
                    _pc = os.path.join(_root, '__pycache__')
                    shutil.rmtree(_pc, ignore_errors=True)
                    _purged += 1
                    _dirs.remove('__pycache__')
    # Remove ENTIRE previous build output — not just lib/.
    # Any leftover .pyc, .py, or __pycache__ in build/Nunba/ can shadow fresh sources.
    if os.path.isdir(os.path.join('build', 'Nunba')):
        shutil.rmtree(os.path.join('build', 'Nunba'), ignore_errors=True)
        print_info("Removed previous build/Nunba/ entirely to prevent ANY stale carry-over")
    # Also purge python-embed __pycache__ in the SOURCE copy (not build/)
    embed_src = os.path.join('python-embed')
    if os.path.isdir(embed_src):
        for _root, _dirs, _files in os.walk(embed_src):
            if '__pycache__' in _dirs:
                _pc = os.path.join(_root, '__pycache__')
                shutil.rmtree(_pc, ignore_errors=True)
                _purged += 1
                _dirs.remove('__pycache__')
    print_info(f"Purged {_purged} __pycache__ directories")

    # Pre-build syntax gate: ast.parse every Python source file so a
    # stray typo (e.g. accidental keystrokes landing in main.py) never
    # ships.  cx_Freeze itself does NOT abort on syntax errors during
    # the bytecode-trace phase - it just emits a warning and the
    # broken file lands in the .exe.  setup_freeze_nunba.py:1340-1354
    # has a post-build py_compile step but it (a) runs AFTER cx_Freeze
    # has already shipped the broken bytecode, (b) only checks
    # build_exe/lib/*.py not the source tree, and (c) just logs a
    # WARNING on failure without aborting.  Real users hit
    # "main.py:5493 expected 'except' or 'finally' block" at app
    # startup with no signal during build.  This gate fails loud.
    print_info("Pre-build syntax gate: ast.parse all .py sources...")
    import ast as _ast
    _src_root = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    _bad: list = []
    _checked = 0
    for _walk_root, _walk_dirs, _walk_files in os.walk(_src_root):
        # Skip vendored / generated dirs that aren't shipped Python.
        _walk_dirs[:] = [
            _d for _d in _walk_dirs
            if _d not in {
                '.git', '.venv', 'venv', 'venv310', 'venv-build',
                'node_modules', 'build', 'dist', '__pycache__',
                'python-embed', 'python-embed-broken-20260502',
                'landing-page',  # JS tree, no .py to gate
                '.eggs', '.pytest_cache',
            }
        ]
        for _fname in _walk_files:
            if not _fname.endswith('.py'):
                continue
            _path = os.path.join(_walk_root, _fname)
            try:
                with open(_path, encoding='utf-8') as _f:
                    _ast.parse(_f.read(), filename=_path)
                _checked += 1
            except SyntaxError as _se:
                _bad.append((_path, _se))
            except (OSError, UnicodeDecodeError) as _e:
                # Read failure is its own class of broken; surface it.
                _bad.append((_path, _e))
    if _bad:
        print_error(
            f"Pre-build syntax gate: {len(_bad)}/{_checked + len(_bad)} files "
            f"failed to parse - aborting build to prevent shipping broken code:")
        for _path, _err in _bad:
            print_error(f"  {os.path.relpath(_path, _src_root)}: {_err}")
        return False
    print_info(f"Syntax gate: {_checked} .py files parse clean")

    # Run cx_Freeze
    _freeze_ok = run_command(
        [python_exe, os.path.join('scripts', 'setup_freeze_nunba.py'), 'build'],
        "Running cx_Freeze...")

    # Elevation vaccine, second dose -- THIS is the one that matters.
    # setup_freeze_nunba.py's post-build hook re-installs the sibling
    # packages INTO THE SOURCE python-embed (hart-backend, hevolveai,
    # hevolve-database, agent-ledger, then the HevolveArmor loader), so
    # the LAST writer runs inside the call above, long after the first
    # dose.  pip stages in %TEMP% and MOVES into place, and a MOVE
    # preserves the SOURCE ACL -- so an elevated build left 37 entries
    # owned by BUILTIN\\Administrators with no ACE for the invoking user,
    # and the next NON-elevated build could not read them.  It died with
    # "23 file(s) STILL corrupt after autorepair" (2026-08-14), a message
    # that never mentions permissions.  Runs on the FAILURE path too: a
    # build that dies mid-freeze must not leave the tree unreadable for
    # the retry.  Guarded by tests/test_build_script.py.
    normalize_embed_acl(embed_src)

    if not _freeze_ok:
        print_error("cx_Freeze build failed!")
        return False

    # Verify executable was created
    exe_path = os.path.join('build', 'Nunba', 'Nunba.exe')
    if not os.path.exists(exe_path):
        print_error(f"Nunba.exe was not created at {exe_path}")
        return False

    print_info(f"Build successful: {exe_path}")

    # Record build provenance: write the current git HEAD sha into
    # build/Nunba/BUILD_INFO.txt so a stale/reused build dir can be
    # detected (compare stored sha vs `git rev-parse HEAD`).  Without
    # this, the installer that ships out of build/ cannot be traced
    # to a specific source commit (see 2026-04-16 session: a Nunba.exe
    # built 24 minutes before a critical fix shipped and the stale
    # binary hid the fix for hours).
    try:
        import datetime as _bi_dt
        _head = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True, text=True, check=False,
        ).stdout.strip() or 'unknown'
        # Also stamp the HARTOS-side HEAD so bundle-drift between
        # Nunba and HARTOS source can be detected at runtime (see
        # 2026-04-25 incident: HARTOS commits 52fe902 + 76f99dee
        # landed but python-embed shipped pre-rebase HARTOS files,
        # silently violating the consent append-only invariant in
        # the installed .exe).  The local-sibling HARTOS path is the
        # canonical dev source per build.py:34, 432, 622.
        _hartos_dir = _local_hartos_path() if '_local_hartos_path' in dir() else \
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'HARTOS')
        _hartos_head = 'unknown'
        try:
            if os.path.isdir(_hartos_dir):
                _hartos_head = subprocess.run(
                    ['git', '-C', _hartos_dir, 'rev-parse', 'HEAD'],
                    capture_output=True, text=True, check=False,
                ).stdout.strip() or 'unknown'
        except Exception:
            pass
        _bi_path = os.path.join('build', 'Nunba', 'BUILD_INFO.txt')
        with open(_bi_path, 'w', encoding='utf-8') as _bi:
            _bi.write(f"BUILD_SHA={_head}\n")
            _bi.write(f"HARTOS_SHA={_hartos_head}\n")
            _bi.write(f"BUILD_TIME={_bi_dt.datetime.utcnow().isoformat(timespec='seconds')}Z\n")
            _bi.write(f"BUILD_PLATFORM={sys.platform}\n")
        print_info(f"Wrote {_bi_path} (nunba={_head[:12]} hartos={_hartos_head[:12]})")
    except Exception as _bi_err:
        print_warn(f"Could not write BUILD_INFO.txt: {_bi_err}")

    # -- Sync HARTOS source into python-embed --
    # The source python-embed/ is a snapshot that may contain stale HARTOS
    # files from a previous build. cx_Freeze copies modules via include_files
    # but the post-build copytree from python-embed/ can overwrite them.
    # This step ensures both the source python-embed/ AND the build output
    # always have the latest HARTOS files from the sibling source directory.
    _hartos_src = _find_local_hartos_backend()
    if _hartos_src:
        _embed_sp = os.path.join(embed_src, 'Lib', 'site-packages')
        _build_sp = os.path.join('build', 'Nunba', 'python-embed', 'Lib', 'site-packages')
        _synced = 0

        # Content-hash comparator — replaces the old size-only check.
        # Same-size-different-content was silently skipping fixes in
        # python-embed (2026-06-08: hevolvearmor/_loader.py fix
        # 7202c38 sat in HARTOS for 24h but never reached the install
        # because the loader file shape stayed the same byte count).
        # SHA-256 is overkill for "is this the same file?" but it costs
        # microseconds on 5-KB Python sources and is unambiguous.
        import hashlib as _hashlib_sync

        def _files_match(src_path, dst_path):
            try:
                _ss = os.path.getsize(src_path)
                _ds = os.path.getsize(dst_path)
            except OSError:
                return False
            if _ss != _ds:
                return False
            try:
                with open(src_path, 'rb') as _sf, open(dst_path, 'rb') as _df:
                    return (_hashlib_sync.sha256(_sf.read()).digest()
                            == _hashlib_sync.sha256(_df.read()).digest())
            except OSError:
                return False

        # Sync top-level HARTOS .py modules (hart_intelligence_entry.py, create_recipe.py, etc.)
        for _fname in os.listdir(_hartos_src):
            if _fname.endswith('.py') and not _fname.startswith(('setup', 'embedded_main', 'conftest')):
                _src_file = os.path.join(_hartos_src, _fname)
                for _dst_dir in [_embed_sp, _build_sp]:
                    if os.path.isdir(_dst_dir):
                        _dst_file = os.path.join(_dst_dir, _fname)
                        if os.path.exists(_dst_file):
                            # Content-hash compare so same-size-different-content edits propagate.
                            if not _files_match(_src_file, _dst_file):
                                shutil.copy2(_src_file, _dst_file)
                                _synced += 1
                        else:
                            shutil.copy2(_src_file, _dst_file)
                            _synced += 1

        # Sync HARTOS packages.  Keep this list in lockstep with the
        # set of Python-package dirs at the HARTOS repo root — every
        # dir that ships into python-embed/Lib/site-packages/ MUST be
        # synced here or a fix that lands inside it never reaches the
        # install.  Past misses: hevolvearmor (2026-06-08 __file__
        # loader fix sat in HARTOS for 24h while installs stayed
        # broken because the dir wasn't in this list).  See
        # tests/test_build_hartos_sync.py for the drift guard.
        #
        # Layout detection: HARTOS uses two layouts side-by-side.
        #   FLAT: HARTOS/{pkg}/__init__.py is the package itself
        #         (integrations, core, security follow this).
        #   NESTED: HARTOS/{pkg}/{pkg}/__init__.py — outer is the
        #         project wrapper (pyproject.toml, setup.py, tests/),
        #         inner is the Python package that ships.
        #         hevolvearmor follows this (it's a separate Rust+Py
        #         package vendored under HARTOS).  Pip-installing
        #         from HARTOS/hevolvearmor/ produces
        #         site-packages/hevolvearmor/ (the inner content
        #         only) — the sync must mirror that, not copy the
        #         outer wrapper into the install.
        for _pkg_name in [
                'integrations', 'core', 'security',
                'hevolvearmor',     # encrypted-module loader (__file__ fix lives here)
                'agent_ledger',     # task ledger ORM + APIs
                'hevolve_database', # canonical DB models (when present locally)
        ]:
            _pkg_outer = os.path.join(_hartos_src, _pkg_name)
            if not os.path.isdir(_pkg_outer):
                continue
            # Prefer FLAT (outer is the package itself); fall back to
            # NESTED (outer is a project wrapper around the package).
            if os.path.isfile(os.path.join(_pkg_outer, '__init__.py')):
                _pkg_src = _pkg_outer
            elif os.path.isfile(os.path.join(_pkg_outer, _pkg_name, '__init__.py')):
                _pkg_src = os.path.join(_pkg_outer, _pkg_name)
            else:
                print_warn(
                    f"HARTOS sync: {_pkg_name} present but neither "
                    f"FLAT nor NESTED layout matched — skipping; "
                    f"contents will not refresh.")
                continue
            if True:
                for _dst_dir in [_embed_sp, _build_sp]:
                    _pkg_dst = os.path.join(_dst_dir, _pkg_name)
                    if os.path.isdir(_pkg_dst):
                        # Walk source and copy changed files (content-hash compare).
                        for _root, _dirs, _files in os.walk(_pkg_src):
                            # Skip __pycache__ — not a source dir.
                            if '__pycache__' in _dirs:
                                _dirs.remove('__pycache__')
                            for _f in _files:
                                if _f.endswith('.py'):
                                    _rel = os.path.relpath(os.path.join(_root, _f), _pkg_src)
                                    _s = os.path.join(_root, _f)
                                    _d = os.path.join(_pkg_dst, _rel)
                                    if os.path.exists(_d):
                                        if not _files_match(_s, _d):
                                            os.makedirs(os.path.dirname(_d), exist_ok=True)
                                            shutil.copy2(_s, _d)
                                            _synced += 1
                                    else:
                                        # New file — copy it
                                        os.makedirs(os.path.dirname(_d), exist_ok=True)
                                        shutil.copy2(_s, _d)
                                        _synced += 1

        if _synced:
            print_info(f"Synced {_synced} HARTOS file(s) into python-embed (source -> build)")
        else:
            print_info("HARTOS files in python-embed are up to date")

        # ── Post-sync verification ───────────────────────────────────
        # Spot-check load-bearing files in the bundled python-embed.
        # The 2026-06-08 hevolvearmor __file__ regression sat in HARTOS
        # main for 24+ hours but never reached an installer because the
        # sync loop didn't include hevolvearmor/.  Now that it's
        # included, this post-sync check is the second line of defense:
        # if any bundled critical file fails its signature assertion,
        # the build fails loud BEFORE shipping a broken installer.
        # Extend ``_critical_signatures`` whenever a fix lands in a
        # file whose presence is load-bearing for the install's first
        # boot (loader hooks, bootstrap step ordering, gate hooks, …).
        _critical_signatures = [
            # path-relative-to-site-packages          : required substring
            ('hevolvearmor/_loader.py',
             "setdefault('__file__'"),
            # Add future critical-fix markers below as needed.  Each
            # entry costs one file read at build-time; keep the list
            # short and load-bearing.
        ]
        _check_root = os.path.join('build', 'Nunba', 'python-embed',
                                   'Lib', 'site-packages')
        _crit_fail = []
        for _rel_path, _marker in _critical_signatures:
            _full = os.path.join(_check_root, _rel_path.replace('/', os.sep))
            if not os.path.isfile(_full):
                _crit_fail.append(
                    f"{_rel_path}: file missing in bundled python-embed")
                continue
            try:
                with open(_full, encoding='utf-8') as _cf:
                    _content = _cf.read()
                if _marker not in _content:
                    _crit_fail.append(
                        f"{_rel_path}: required marker not found "
                        f"('{_marker[:40]}...').  Likely the sibling "
                        f"HARTOS source has the fix but the snapshot "
                        f"in python-embed is stale.  Inspect the "
                        f"sync loop above + the HARTOS-side file.")
            except OSError as _re:
                _crit_fail.append(f"{_rel_path}: read failed: {_re}")
        if _crit_fail:
            print_error("Critical bundle verification FAILED:")
            for _msg in _crit_fail:
                print_error(f"  - {_msg}")
            print_error("Refusing to ship; fix the sync gap and rerun.")
            return False
        print_info(
            f"Post-sync verification PASSED "
            f"({len(_critical_signatures)} critical file(s) match)")

    # Strip HevolveAI source from python-embed (proprietary — .pyc only)
    _compile_script = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', '..', 'HARTOS', 'scripts', 'compile_hevolveai.py')
    if os.path.isfile(_compile_script):
        _hv_sp = os.path.join('build', 'Nunba', 'python-embed', 'Lib', 'site-packages')
        _hv_dir = os.path.join(_hv_sp, 'hevolveai')
        if os.path.isdir(_hv_dir):
            print_info("Stripping HevolveAI source (proprietary)...")
            run_command([python_exe, _compile_script, '--strip-source',
                        '--output-dir', _hv_dir],
                       "Compiling HevolveAI .py to .pyc...")
        else:
            print_info("HevolveAI not in python-embed — skipping source strip")
    else:
        print_info("HARTOS compile script not found — HevolveAI source strip skipped")

    # ── Build-time patch for transformers __init__.py ──────────────────
    # transformers 5.x uses `import_structure[frozenset({})].update(...)`
    # which crashes under cx_Freeze because dict-key resolution for
    # `frozenset({})` doesn't match at frozen-module import time.
    # Previous approach: rewrite the file at runtime on every boot
    # (app.py:648) — caused Defender-scan contention, needed a sentinel
    # to be idempotent.  Proper fix: patch it ONCE during build so the
    # runtime never touches the file.
    def _patch_transformers_at_build():
        """Patch transformers/__init__.py atomically.  A mid-write ENOSPC
        on `open('w')` + `f.write` leaves the file truncated/zero-byte
        and bricks every future boot with ImportError.  Mitigation: write
        to `.tmp` then `os.replace` (atomic on both POSIX and Win32).
        The original bytes remain in-memory as `_src`; if replace fails
        we restore from memory before raising."""
        _bad_line = 'import_structure[frozenset({})].update(_import_structure)'
        _fixed_line = (
            'import_structure.setdefault(frozenset({}), {})'
            '.update(_import_structure)'
        )
        _patched_any = False
        for _sp_candidate in [
            os.path.join('build', 'Nunba', 'python-embed', 'Lib', 'site-packages'),
            os.path.join('python-embed', 'Lib', 'site-packages'),
        ]:
            _tf_init = os.path.join(_sp_candidate, 'transformers', '__init__.py')
            if not os.path.isfile(_tf_init):
                continue
            try:
                with open(_tf_init, encoding='utf-8') as _f:
                    _src = _f.read()
                if _bad_line not in _src:
                    continue  # already patched or not the vulnerable line
                _patched = _src.replace(_bad_line, _fixed_line)
                _tmp_path = _tf_init + '.nunba-patch.tmp'
                # Write tmp file with explicit fsync so the bytes hit
                # disk before os.replace — crash-safety across ENOSPC.
                try:
                    with open(_tmp_path, 'w', encoding='utf-8') as _tf:
                        _tf.write(_patched)
                        _tf.flush()
                        try:
                            os.fsync(_tf.fileno())
                        except OSError:
                            pass
                    os.replace(_tmp_path, _tf_init)
                    # Log pre/post hashes for build reproducibility
                    import hashlib as _hl
                    _pre_h = _hl.sha256(_src.encode('utf-8')).hexdigest()[:12]
                    _post_h = _hl.sha256(_patched.encode('utf-8')).hexdigest()[:12]
                    print_info(
                        f"Patched transformers __init__ at {_tf_init} "
                        f"(sha256 {_pre_h} -> {_post_h})",
                    )
                    _patched_any = True
                except OSError as _we:
                    # Write failed — try to clean up the tmp file.  The
                    # original _tf_init is still untouched (os.replace
                    # hadn't run yet), so the build remains recoverable.
                    try:
                        if os.path.isfile(_tmp_path):
                            os.remove(_tmp_path)
                    except OSError:
                        pass
                    print_info(
                        f"Could not atomically patch {_tf_init}: {_we} — "
                        "original untouched, boot will retry via runtime",
                    )
            except OSError as _pe:
                print_info(f"Could not read {_tf_init}: {_pe}")
        if not _patched_any:
            print_info(
                "transformers __init__ already patched (or not found) — "
                "no build-time change needed",
            )
    _patch_transformers_at_build()

    # Slim python-embed (remove pip, setuptools, tests, etc.)
    slim_python_embed()

    # ── Post-build: extract missing stdlib modules from python312.zip ──
    # cx_Freeze's lib/ often misses stdlib modules that GPU TTS backends
    # need at runtime (unittest, email.mime.application, fileinput, etc.).
    # Extract any .pyc from python312.zip that isn't already in lib/.
    _zip_path = os.path.join('build', 'Nunba', 'python-embed', 'python312.zip')
    _lib_dir = os.path.join('build', 'Nunba', 'lib')
    if os.path.isfile(_zip_path) and os.path.isdir(_lib_dir):
        import zipfile
        _extracted = 0
        with zipfile.ZipFile(_zip_path) as _zf:
            for _zname in _zf.namelist():
                if _zname.endswith('.pyc'):
                    _dst = os.path.join(_lib_dir, _zname)
                    if not os.path.exists(_dst):
                        os.makedirs(os.path.dirname(_dst), exist_ok=True)
                        with open(_dst, 'wb') as _f:
                            _f.write(_zf.read(_zname))
                        _extracted += 1
        if _extracted:
            print_info(f"Extracted {_extracted} missing stdlib .pyc from python312.zip to lib/")

    # ── Acceptance gate — HARD-FAIL by default (2026-04-19 restore) ─
    # Runs Nunba.exe --acceptance-test to verify Stage-A/Stage-B fixes
    # survived the freeze.  Three modes:
    #
    #   Default (STRICT): runs with 180s timeout; failure/timeout →
    #            returns False, installer packaging blocked.  This is
    #            the restored pre-regression behavior — a build that
    #            can't boot its own verify subprocess is NOT shippable.
    #            The 240s-cold-boot stall that motivated downgrading
    #            this to warn-only (see commit 5dec11da) has been
    #            fixed in the 2026-04-19 deferred-init refactor, so
    #            strict is safe again.
    #
    #   NUNBA_SKIP_ACCEPTANCE=1 or --skip-acceptance: entire block is
    #            bypassed (INFO log, no subprocess spawn).  Intended for
    #            rapid local iteration when the tester already knows
    #            the bundle boots.  `build.bat` prepends this flag by
    #            default for dev-loop ergonomics.  CI workflows must
    #            NOT set this — CI's whole job is to catch what local
    #            devs might skip.
    #
    #   NUNBA_WARN_ACCEPTANCE=1 or --warn-acceptance: downgrade failures
    #            to warnings (the old default).  Use only as a temporary
    #            escape hatch while debugging a flaky verify step —
    #            NOT a long-term mode, since it masks real regressions.
    _skip_acc = (
        os.environ.get('NUNBA_SKIP_ACCEPTANCE', '').strip().lower()
        in ('1', 'true', 'yes')
    )
    # Strict is now the DEFAULT.  Only flip to warn-only when the
    # operator explicitly opts in via --warn-acceptance / env.
    _warn_acc = (
        os.environ.get('NUNBA_WARN_ACCEPTANCE', '').strip().lower()
        in ('1', 'true', 'yes')
    )
    _strict_acc = not _warn_acc
    _built_exe = os.path.join('build', 'Nunba', 'Nunba.exe')
    if _skip_acc:
        print_info(
            "Acceptance test SKIPPED (NUNBA_SKIP_ACCEPTANCE set). "
            "Bundle at build/Nunba/Nunba.exe was NOT verified — do "
            "not ship without re-running with acceptance enabled."
        )
    elif os.path.isfile(_built_exe):
        print_header("Acceptance test — verifying built bundle (optional)")
        # Tee the subprocess stdout+stderr LIVE to
        # ~/Documents/Nunba/logs/build_acceptance.log so the operator
        # can `tail -f` it and see exactly which check is wedged even
        # when --acceptance-test itself emits nothing to its own log
        # (the langchain-fix infinite-loop symptom, 2026-04-19).
        _acc_log = _nunba_build_log_path('build_acceptance.log')
        print_info(f"Live log: {_acc_log}   (tail -f to watch progress)")
        _ac_ok = _tee_subprocess_to_log(
            [_built_exe, '--acceptance-test'],
            log_path=_acc_log,
            description="Running Nunba --acceptance-test (180s timeout)...",
            timeout_s=180,
        )
        if not _ac_ok:
            if _strict_acc:
                print_error(
                    "Acceptance test FAILED (strict mode — the default as "
                    "of 2026-04-19).  Installer packaging BLOCKED.  See "
                    f"{_acc_log} for the tee'd subprocess output.  To "
                    "unblock temporarily (NOT for CI), rerun with "
                    "--warn-acceptance or set NUNBA_WARN_ACCEPTANCE=1."
                )
                return False
            print_warn(
                "Acceptance test FAILED or TIMED OUT — continuing "
                "because NUNBA_WARN_ACCEPTANCE is set.  This masks a "
                "real boot regression; investigate before shipping."
            )
        else:
            print_info("Acceptance test PASSED")
    else:
        print_warn(
            f"Nunba.exe not found at {_built_exe} — acceptance test skipped. "
            "cx_Freeze build likely failed earlier."
        )

    if app_only:
        return True

    return _build_windows_installer(python_exe)


def _build_windows_installer(python_exe):
    """Build Windows installer with Inno Setup (assumes exe already built)"""
    # Verify exe exists
    exe_path = os.path.join('build', 'Nunba', 'Nunba.exe')
    if not os.path.exists(exe_path):
        print_error(f"Nunba.exe not found at {exe_path}. Run 'python build.py app' first.")
        return False

    # Ensure WebView2 bootstrapper is present (required for installer)
    if not ensure_webview2_bootstrapper():
        print_error("WebView2 bootstrapper required for installer")
        return False

    # Build installer with Inno Setup
    print_header("Creating installer with Inno Setup")

    # Find Inno Setup
    iscc_paths = [
        os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Inno Setup 6', 'ISCC.exe'),
        os.path.join(os.environ.get('ProgramFiles', ''), 'Inno Setup 6', 'ISCC.exe'),
        os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Inno Setup 5', 'ISCC.exe'),
    ]

    iscc = None
    for path in iscc_paths:
        if os.path.exists(path):
            iscc = path
            break

    if not iscc:
        print_error("Inno Setup Compiler (ISCC.exe) not found!")
        print_info("Please install Inno Setup from https://jrsoftware.org/isinfo.php")
        print_info("Then re-run: python build.py installer")
        return False

    print_info(f"Using Inno Setup: {iscc}")

    if not run_command([iscc, os.path.join('scripts', 'Nunba_Installer.iss')], "Compiling installer..."):
        print_error("Inno Setup compilation failed!")
        return False

    installer_path = os.path.join('Output', 'Nunba_Setup.exe')
    if not os.path.exists(installer_path):
        print_error(f"Installer was not created at {installer_path}")
        return False

    print_info(f"Installer created: {installer_path}")
    return True


def build_macos(python_exe, app_only=False, installer_only=False):
    """Build on macOS"""
    app_path = os.path.join('build', 'Nunba.app')

    if not installer_only:
        # Clean previous build before rebuilding
        if os.path.isdir(app_path):
            print_info("Removing previous build...")
            shutil.rmtree(app_path, ignore_errors=True)

        print_header("Building Nunba.app with cx_Freeze")

        # Run cx_Freeze
        if not run_command([python_exe, os.path.join('scripts', 'setup_freeze_mac.py'), 'build'],
                           "Running cx_Freeze..."):
            print_error("cx_Freeze build failed!")
            return False

        # Verify app was created
        if not os.path.isdir(app_path):
            print_error(f"Nunba.app was not created at {app_path}")
            return False

        # Make executable runnable
        exe_path = os.path.join(app_path, 'Contents', 'MacOS', 'Nunba')
        if os.path.exists(exe_path):
            os.chmod(exe_path, 0o755)

        # -- Copy tcl/tk scripts to Contents/Resources/share/ --
        # cx_Freeze puts tcl/tk in Contents/MacOS/share/ but _tkinter looks in
        # Contents/Resources/share/ on macOS.  Copy so tkinter finds init.tcl.
        _macos_share = os.path.join(app_path, 'Contents', 'MacOS', 'share')
        _resources_share = os.path.join(app_path, 'Contents', 'Resources', 'share')
        if os.path.isdir(_macos_share) and not os.path.isdir(_resources_share):
            shutil.copytree(_macos_share, _resources_share)
            print_info("Copied tcl/tk scripts to Contents/Resources/share/")

        # NOTE: lipo thinning of Nunba + lib/Python is handled by
        # setup_freeze_mac.py's post-build hook.  Running it again here
        # would cause double-lipo and stale sigs.

        # NOTE: .dylibs flattening and ad-hoc codesign are handled by
        # setup_freeze_mac.py's post-build hook.  Duplicating the sign here
        # (without --remove-signature first) leaves stale CDHashes on .so files
        # and dyld rejects them at load time with
        #   "code signature not valid for use in process: Trying to load an unsigned library"
        # Leave signing to setup_freeze_mac.py.

        print_info(f"Build successful: {app_path}")

        if app_only:
            return True

    # Build DMG installer
    print_header("Creating DMG installer")

    dmg_name = 'Nunba_Setup.dmg'
    os.makedirs('Output', exist_ok=True)

    # Remove old DMG
    output_dmg = os.path.join('Output', dmg_name)
    if os.path.exists(output_dmg):
        os.remove(output_dmg)

    # Try create-dmg first (if installed via brew)
    try:
        result = subprocess.run(['which', 'create-dmg'], capture_output=True, text=True)
        if result.returncode == 0:
            print_info("Using create-dmg...")
            cmd = [
                'create-dmg',
                # hdiutil internet-enable is blocked on CI runners; without this
                # flag create-dmg fails the DMG step there.
                '--no-internet-enable',
                '--volname', 'Nunba',
                '--window-pos', '200', '120',
                '--window-size', '600', '400',
                '--icon-size', '100',
                '--icon', 'Nunba.app', '150', '190',
                '--app-drop-link', '450', '190',
                '--hide-extension', 'Nunba.app',
                output_dmg,
                app_path
            ]
            if run_command(cmd, "Creating DMG with create-dmg...", check=False):
                if os.path.exists(output_dmg):
                    print_info(f"DMG created: {output_dmg}")
                    return True
    except Exception:
        pass

    # Fallback to hdiutil
    print_info("Using hdiutil...")
    dmg_temp = 'dmg_temp'
    if os.path.exists(dmg_temp):
        shutil.rmtree(dmg_temp)
    os.makedirs(dmg_temp)

    # Copy app to temp
    shutil.copytree(app_path, os.path.join(dmg_temp, 'Nunba.app'))

    # Create Applications symlink
    os.symlink('/Applications', os.path.join(dmg_temp, 'Applications'))

    # Create DMG
    cmd = [
        'hdiutil', 'create',
        '-volname', 'Nunba',
        '-srcfolder', dmg_temp,
        '-ov', '-format', 'UDZO',
        output_dmg
    ]

    success = run_command(cmd, "Creating DMG with hdiutil...")

    # Cleanup
    shutil.rmtree(dmg_temp, ignore_errors=True)

    if success and os.path.exists(output_dmg):
        print_info(f"DMG created: {output_dmg}")
        return True

    print_error("DMG creation failed!")
    return False


def sign_macos():
    """Sign and notarize macOS app (requires Apple Developer ID)"""
    print_header("Signing and Notarizing")

    app_path = os.path.join('build', 'Nunba.app')
    dmg_path = os.path.join('Output', 'Nunba_Setup.dmg')

    if not os.path.isdir(app_path):
        print_error("build/Nunba.app not found. Run 'python build.py app' first.")
        return False

    dev_id = os.environ.get('APPLE_DEVELOPER_ID')
    if not dev_id:
        print_warn("APPLE_DEVELOPER_ID not set. Skipping code signing.")
        print_info("To sign, set: export APPLE_DEVELOPER_ID='Developer ID Application: Your Name (TEAMID)'")
        return True

    print_info(f"Signing Nunba.app with: {dev_id}")

    # Create entitlements if missing
    entitlements = 'entitlements.plist'
    if not os.path.exists(entitlements):
        with open(entitlements, 'w') as f:
            f.write('''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>''')

    # Sign the app
    if not run_command(
        ['codesign', '--force', '--deep', '--sign', dev_id,
         '--options', 'runtime', '--entitlements', entitlements, app_path],
        "Signing app bundle...", check=False
    ):
        print_error("Code signing failed!")
        return False

    print_info("App signed successfully.")

    # Re-create DMG with the now-signed .app inside, then sign the DMG itself.
    # The previous DMG (from build.py full) contained the unsigned .app.
    print_info("Re-creating DMG with signed .app...")
    output_dmg = dmg_path
    if os.path.exists(output_dmg):
        os.remove(output_dmg)
    os.makedirs(os.path.dirname(output_dmg), exist_ok=True)
    _dmg_created = False
    try:
        result = subprocess.run(['which', 'create-dmg'], capture_output=True, text=True)
        if result.returncode == 0:
            cmd = [
                'create-dmg',
                # hdiutil internet-enable is blocked on CI runners; without this
                # flag create-dmg fails the DMG step there.
                '--no-internet-enable',
                '--volname', 'Nunba',
                '--window-pos', '200', '120',
                '--window-size', '600', '400',
                '--icon-size', '100',
                '--icon', 'Nunba.app', '150', '190',
                '--app-drop-link', '450', '190',
                '--hide-extension', 'Nunba.app',
                output_dmg,
                app_path
            ]
            if run_command(cmd, "Creating DMG with create-dmg...", check=False):
                _dmg_created = os.path.exists(output_dmg)
    except Exception:
        pass
    if not _dmg_created:
        # Fallback to hdiutil
        import tempfile
        _dmg_temp = tempfile.mkdtemp(prefix='nunba_dmg_')
        import shutil as _sh
        _sh.copytree(app_path, os.path.join(_dmg_temp, 'Nunba.app'))
        os.symlink('/Applications', os.path.join(_dmg_temp, 'Applications'))
        run_command(
            ['hdiutil', 'create', '-volname', 'Nunba', '-srcfolder', _dmg_temp,
             '-ov', '-format', 'UDZO', output_dmg],
            "Creating DMG with hdiutil...", check=False
        )
        _sh.rmtree(_dmg_temp, ignore_errors=True)
        _dmg_created = os.path.exists(output_dmg)

    # Sign DMG if present
    if os.path.exists(dmg_path):
        run_command(
            ['codesign', '--force', '--sign', dev_id, dmg_path],
            "Signing DMG...", check=False
        )

    # Notarize if credentials are available
    apple_id = os.environ.get('APPLE_ID')
    apple_pw = os.environ.get('APPLE_APP_PASSWORD')
    team_id = os.environ.get('APPLE_TEAM_ID')

    if apple_id and apple_pw and team_id and os.path.exists(dmg_path):
        print_info("Notarizing app...")
        if run_command(
            ['xcrun', 'notarytool', 'submit', dmg_path,
             '--apple-id', apple_id, '--password', apple_pw,
             '--team-id', team_id, '--wait'],
            "Submitting for notarization...", check=False
        ):
            run_command(
                ['xcrun', 'stapler', 'staple', dmg_path],
                "Stapling notarization ticket...", check=False
            )
            print_info("Notarization complete.")
        else:
            print_warn("Notarization failed.")
    else:
        print_info("Notarization credentials not set. Skipping.")

    return True


def build_linux(python_exe, app_only=False, installer_only=False):
    """Build on Linux (cx_Freeze + AppImage)

    Flow mirrors Windows: deps -> React build -> cx_Freeze -> package (AppImage).
    Uses setup_freeze_linux.py for the cx_Freeze step and build_appimage.sh for
    packaging into a self-contained AppImage.
    """
    if installer_only:
        # Skip cx_Freeze, jump straight to AppImage packaging
        return _build_linux_appimage(python_exe)

    # Clean previous build before rebuilding
    build_dir = os.path.join('build', 'Nunba')
    if os.path.exists(build_dir):
        print_info("Cleaning previous build (preserving python-embed if unchanged)...")
        for item in os.listdir(build_dir):
            if item in ['python-embed', 'python-embed.hash']:
                continue
            item_path = os.path.join(build_dir, item)
            try:
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path, ignore_errors=True)
                else:
                    os.remove(item_path)
            except Exception as e:
                print_warn(f"Failed to remove {item_path}: {e}")

    print_header("Building Nunba executable with cx_Freeze (Linux)")

    # Run cx_Freeze with the Linux-specific freeze script
    if not run_command([python_exe, os.path.join('scripts', 'setup_freeze_linux.py'), 'build'],
                       "Running cx_Freeze (Linux)..."):
        print_error("cx_Freeze build failed!")
        return False

    # Verify executable was created
    exe_path = os.path.join('build', 'Nunba', 'Nunba')
    if not os.path.exists(exe_path):
        print_error(f"Nunba executable was not created at {exe_path}")
        return False

    # Ensure executable permission
    os.chmod(exe_path, 0o755)
    print_info(f"Build successful: {exe_path}")

    # Strip HevolveAI source from python-embed (proprietary -- .pyc only)
    _compile_script = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', '..', 'HARTOS', 'scripts', 'compile_hevolveai.py')
    if os.path.isfile(_compile_script):
        _hv_sp = os.path.join('build', 'Nunba', 'python-embed', 'Lib', 'site-packages')
        # Also check Linux-style path
        if not os.path.isdir(_hv_sp):
            _pyver = f"python{sys.version_info.major}.{sys.version_info.minor}"
            _hv_sp = os.path.join('build', 'Nunba', 'python-embed', 'lib', _pyver, 'site-packages')
        _hv_dir = os.path.join(_hv_sp, 'hevolveai')
        if os.path.isdir(_hv_dir):
            print_info("Stripping HevolveAI source (proprietary)...")
            run_command([python_exe, _compile_script, '--strip-source',
                        '--output-dir', _hv_dir],
                       "Compiling HevolveAI .py -> .pyc...")
        else:
            print_info("HevolveAI not in python-embed -- skipping source strip")
    else:
        print_info("HARTOS compile script not found -- HevolveAI source strip skipped")

    # Slim python-embed
    slim_python_embed()

    if app_only:
        return True

    return _build_linux_appimage(python_exe)


def _build_linux_appimage(python_exe):
    """Package the cx_Freeze output into an AppImage.

    Calls build_appimage.sh which:
    1. Creates AppDir structure (usr/bin, usr/share/applications, icons)
    2. Copies cx_Freeze output into AppDir
    3. Generates AppRun launcher with LD_LIBRARY_PATH setup
    4. Runs appimagetool to produce a self-contained .AppImage
    """
    # Verify the cx_Freeze output exists
    exe_path = os.path.join('build', 'Nunba', 'Nunba')
    if not os.path.exists(exe_path):
        print_error(f"Nunba executable not found at {exe_path}. Run 'python build.py app' first.")
        return False

    print_header("Creating AppImage")

    appimage_script = os.path.join('scripts', 'build_appimage.sh')
    if not os.path.exists(appimage_script):
        print_error(f"AppImage build script not found: {appimage_script}")
        return False

    # Make the script executable
    os.chmod(appimage_script, 0o755)

    if not run_command(['bash', appimage_script, '--skip-freeze'],
                       "Packaging AppImage..."):
        print_error("AppImage packaging failed!")
        return False

    # Check if AppImage was created
    import glob as _glob
    appimages = _glob.glob(os.path.join('Output', 'Nunba-*.AppImage'))
    if appimages:
        latest = max(appimages, key=os.path.getmtime)
        print_info(f"AppImage created: {latest}")
        return True

    print_error("AppImage was not created in Output/")
    return False


def print_summary():
    """Print build summary"""
    print_header("BUILD COMPLETE")

    if IS_WINDOWS:
        exe_path = os.path.join('build', 'Nunba', 'Nunba.exe')
        installer_path = os.path.join('Output', 'Nunba_Setup.exe')

        if os.path.exists(exe_path):
            size = os.path.getsize(exe_path) // (1024 * 1024)
            print(f"  Executable: {exe_path}")
            print(f"  Size: ~{size} MB")

        if os.path.exists(installer_path):
            size = os.path.getsize(installer_path) // (1024 * 1024)
            print(f"  Installer:  {installer_path} ({size} MB)")

        print("=" * 60)
        print("\n  To test:    build\\Nunba\\Nunba.exe")
        print("  To install: Output\\Nunba_Setup.exe")

    elif IS_MACOS:
        app_path = os.path.join('build', 'Nunba.app')
        dmg_path = os.path.join('Output', 'Nunba_Setup.dmg')

        if os.path.isdir(app_path):
            # Get directory size
            total = 0
            for dirpath, dirnames, filenames in os.walk(app_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    total += os.path.getsize(fp)
            size = total // (1024 * 1024)
            print(f"  Application: {app_path} ({size} MB)")

        if os.path.exists(dmg_path):
            size = os.path.getsize(dmg_path) // (1024 * 1024)
            print(f"  Installer:   {dmg_path} ({size} MB)")

        print("=" * 60)
        print("\n  To test:    open build/Nunba.app")
        print("  To install: open Output/Nunba_Setup.dmg")

    elif IS_LINUX:
        exe_path = os.path.join('build', 'Nunba', 'Nunba')

        if os.path.exists(exe_path):
            size = os.path.getsize(exe_path) // (1024 * 1024)
            print(f"  Executable: {exe_path}")
            print(f"  Size: ~{size} MB")

        # Find the AppImage
        import glob as _glob
        appimages = _glob.glob(os.path.join('Output', 'Nunba-*.AppImage'))
        if appimages:
            latest = max(appimages, key=os.path.getmtime)
            size = os.path.getsize(latest) // (1024 * 1024)
            print(f"  AppImage:   {latest} ({size} MB)")

        print("=" * 60)
        print("\n  To test:    ./build/Nunba/Nunba")
        if appimages:
            print("  To install: ./deploy/linux/install.sh")
        print("\n  Requirements: GTK 3.0, WebKit2GTK 4.0")


def _acquire_build_lock():
    """Refuse to start if another build is already running.

    Two concurrent builds freeze into the SAME ``build/python-embed`` and
    ``build/exe.*`` trees, corrupt each other's pip/cx_Freeze writes, and
    produce NO installer (live failure 2026-06-11: a second
    ``build.py --skip-acceptance`` collided with an in-flight build; both
    exited with empty ``build/exe.*`` and no ``dist/*.exe``). The lock lives
    in the system temp dir (never committed, survives the ``build/`` clean
    step) and is released via atexit. A lock older than ``_MAX_BUILD_SECONDS``
    is treated as stale (a previous build died/was killed) and reclaimed.
    """
    import atexit
    import tempfile
    import time
    lock_path = os.path.join(tempfile.gettempdir(), 'nunba_build.lock')
    _MAX_BUILD_SECONDS = 3600  # builds are ~15-30 min; >1h => dead, reclaim
    if os.path.exists(lock_path):
        pid, started = '?', 0.0
        try:
            with open(lock_path) as f:
                _parts = f.read().strip().split('|')
            pid = _parts[0]
            started = float(_parts[1]) if len(_parts) > 1 else 0.0
        except Exception:
            pass
        age = time.time() - started
        alive = age < _MAX_BUILD_SECONDS
        try:
            import psutil
            alive = psutil.pid_exists(int(pid)) and age < _MAX_BUILD_SECONDS
        except Exception:
            pass  # fall back to age-based staleness
        if alive:
            print(f"\n[BUILD-LOCK] Another build is already running "
                  f"(PID {pid}, started {int(age)}s ago).", flush=True)
            print("  Two concurrent builds corrupt python-embed/build and "
                  "produce NO installer.", flush=True)
            print(f"  Wait for it to finish, or if it is dead remove "
                  f"{lock_path}", flush=True)
            sys.exit(2)
        print(f"[BUILD-LOCK] Reclaiming stale lock (PID {pid}, "
              f"age {int(age)}s).", flush=True)
    try:
        with open(lock_path, 'w') as f:
            f.write(f"{os.getpid()}|{time.time()}")
    except Exception as e:
        print(f"[BUILD-LOCK] Warning: could not write lock ({e}); "
              f"proceeding without lock.", flush=True)
        return

    def _release():
        # The read handle must be CLOSED before os.remove() runs.  Deleting a
        # file this same process still has open is fine on POSIX but raises
        # WinError 32 on Windows, and the `except` below swallowed it silently
        # — so on the primary build platform the lock was never released.
        # Observed 2026-08-04: build.py PID 34232 exited 0 after writing
        # Output/Nunba_Setup.exe and left `34232|...` behind in %TEMP%.
        #
        # It self-heals only because acquire reclaims a lock whose PID is dead;
        # but that check is `pid_exists(pid) and age < 3600`, and Windows
        # recycles PIDs, so a reused PID inside the hour makes the NEXT build
        # refuse to start with exit 2 for no real reason.
        # Guarded by tests/test_build_lock_release.py.
        try:
            with open(lock_path) as f:
                _owner = f.read().strip().split('|')[0]
            if _owner == str(os.getpid()):
                os.remove(lock_path)
        except Exception:
            pass
    atexit.register(_release)


def main():
    parser = argparse.ArgumentParser(
        description='Nunba Desktop App Build Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('mode', nargs='?', default='full',
                        choices=['full', 'app', 'installer', 'clean', 'sign'],
                        help='Build mode (default: full)')
    parser.add_argument('--platform', choices=['windows', 'macos', 'linux'],
                        help='Target platform (default: auto-detect)')
    parser.add_argument('--skip-deps', action='store_true',
                        help='Skip dependency installation')
    parser.add_argument('--skip-wizard', action='store_true',
                        help='Skip configuration wizard')
    parser.add_argument('--sentry-dsn', type=str, metavar='DSN',
                        help='Set Sentry DSN directly (non-interactive)')
    parser.add_argument('--skip-acceptance', action='store_true',
                        help='Skip the post-freeze acceptance-test subprocess '
                        'entirely.  Fastest for local dev iteration; build.bat '
                        'prepends this by default.  Do NOT use in CI.')
    parser.add_argument('--strict-acceptance', action='store_true',
                        help='[DEPRECATED — strict is now the DEFAULT as of '
                        '2026-04-19.]  Kept for backward compat with existing '
                        'invocations; has no additional effect.')
    parser.add_argument('--warn-acceptance', action='store_true',
                        help='Downgrade acceptance-test failures from HARD-FAIL '
                        'to WARN.  Temporary escape hatch while diagnosing a '
                        'flaky verify step; must NOT be used in CI or release '
                        'builds (it masks boot regressions).')

    args = parser.parse_args()

    # Plumb acceptance-gate flags to env vars so build_windows() can
    # read them without threading kwargs through every build function.
    # `--strict-acceptance` is deprecated (strict is now the default);
    # we keep the flag so existing invocations still parse but the
    # env var it used to set (NUNBA_STRICT_ACCEPTANCE) is no longer
    # read by build_windows().
    if args.skip_acceptance:
        os.environ['NUNBA_SKIP_ACCEPTANCE'] = '1'
    if args.warn_acceptance:
        os.environ['NUNBA_WARN_ACCEPTANCE'] = '1'
    if args.strict_acceptance:
        # No-op (strict is default) — log a one-line migration hint so
        # script callers know they can drop the flag.
        print_info(
            "--strict-acceptance is now a no-op (strict is the default "
            "as of 2026-04-19).  Safe to remove from invocations."
        )

    # Change to project directory (build.py lives in scripts/)
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_dir)

    # Refuse to start if another build is already running (concurrent builds
    # corrupt the shared python-embed/build trees and produce no installer).
    _acquire_build_lock()

    print(f"\nNunba Desktop App Build Script v{VERSION}", flush=True)
    print(f"Platform: {plat.system()} {plat.machine()}\n", flush=True)

    # ── Pre-flight resource check ────────────────────────────────────
    # A mid-build `pip install hart-backend` with [Errno 28] No space
    # left on device or `WinError 1455 paging file too small` leaves
    # python-embed partially populated, site-packages corrupt, and the
    # installer in a non-reproducible state.  Fail loud *before* we
    # start, not 20 minutes in after eight wheels downloaded.
    if args.mode != 'clean':
        import shutil as _shutil_pf
        import tempfile as _tf_pf
        _free_gb_cwd = _shutil_pf.disk_usage(project_dir).free / (1 << 30)
        _free_gb_tmp = _shutil_pf.disk_usage(_tf_pf.gettempdir()).free / (1 << 30)
        # Real cost = CUDA torch wheel (2.5GB) + python-embed tree (1.5GB)
        # + cx_Freeze tree (3GB) + signed installer artifact (1GB) ≈ 8GB.
        # Add 2GB headroom for pip-build-env-* and partial-extraction
        # crashes.  The previous 2.5GB threshold was a regression that
        # let installs fail halfway through (witnessed 2026-04-21,
        # FreeSpace=4.3GB during a partial build that left python-embed
        # corrupt and required full rebuild).
        _MIN_DISK_GB = 7.0
        if _free_gb_cwd < _MIN_DISK_GB:
            sys.exit(
                f"[PREFLIGHT] Refusing to build: CWD drive has only "
                f"{_free_gb_cwd:.1f}GB free (need {_MIN_DISK_GB}GB). "
                f"Clear %TEMP%\\pip-* and ~/.cache/pip then retry.",
            )
        if _free_gb_tmp < _MIN_DISK_GB:
            sys.exit(
                f"[PREFLIGHT] Refusing to build: %TEMP% drive has only "
                f"{_free_gb_tmp:.1f}GB free (need {_MIN_DISK_GB}GB). "
                f"pip uses it for build isolation (pip-build-env-*).",
            )
        # RAM check — WinError 1455 paging file too small is a commit-
        # limit issue, not disk.  Require 8GB available committed.
        try:
            import psutil as _psutil_pf
            _avail_gb = _psutil_pf.virtual_memory().available / (1 << 30)
            if _avail_gb < 4:
                print(
                    f"[PREFLIGHT] Warning: only {_avail_gb:.1f}GB RAM "
                    f"available; git clone --filter and torch wheel "
                    f"build may OOM.  Recommend closing apps.",
                    flush=True,
                )
        except ImportError:
            pass  # psutil not installed — skip soft check
        # Build dir in use — HARD fail, and fail NOW.
        #
        # cx_Freeze wipes build/<name>/ before writing.  If a Nunba is running
        # FROM that directory the OS holds its image + DLLs open, the wipe
        # fails, and the whole build dies on:
        #     error: the build_exe directory cannot be cleaned
        # 2026-08-03: that cost ~35 minutes — every dependency resolved, all
        # 17 hart-backend modules collected, THEN it died.  The condition was
        # knowable in the first second.
        #
        # Cross-platform by construction: psutil.exe() works on Windows, macOS
        # and Linux, and the path comparison is via Path, not separators.
        try:
            from pathlib import Path as _Path_bd

            import psutil as _psutil_bd
            _build_root = _Path_bd(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ) / 'build'
            _blockers = []
            for _p in _psutil_bd.process_iter(['pid']):
                try:
                    _exe = _p.exe()
                except (_psutil_bd.AccessDenied, _psutil_bd.NoSuchProcess,
                        OSError):
                    continue  # not ours / vanished — cannot be our blocker
                if not _exe:
                    continue
                try:
                    _Path_bd(_exe).relative_to(_build_root)
                except ValueError:
                    continue  # not under build/
                _blockers.append((_p.pid, _exe))
            if _blockers:
                _lines = '\n'.join(
                    f"    pid {_pid}  {_exe}" for _pid, _exe in _blockers
                )
                sys.exit(
                    "[PREFLIGHT] Refusing to build: a process is RUNNING FROM "
                    "the build output directory, so cx_Freeze cannot clean "
                    f"it:\n{_lines}\n"
                    "  Close that app (or stop the process) and re-run.  "
                    "Failing now instead of after the ~35-minute dependency "
                    "phase.",
                )
        except ImportError:
            pass  # psutil not installed — cannot check; cx_Freeze will report
        # Stale pip-build-env cleanup — prevents cumulative %TEMP% bloat
        try:
            import glob as _glob_pf
            _stale = _glob_pf.glob(
                os.path.join(_tf_pf.gettempdir(), 'pip-build-env-*'),
            ) + _glob_pf.glob(
                os.path.join(_tf_pf.gettempdir(), 'pip-ephem-wheel-cache-*'),
            )
            _freed = 0
            for _d in _stale:
                try:
                    _shutil_pf.rmtree(_d, ignore_errors=True)
                    _freed += 1
                except Exception:
                    pass
            if _freed:
                print(
                    f"[PREFLIGHT] Cleared {_freed} stale pip-build-env dirs",
                    flush=True,
                )
        except Exception:
            pass

    # Clean mode
    if args.mode == 'clean':
        clean_build()
        return 0

    # Sign mode (macOS only)
    if args.mode == 'sign':
        if not IS_MACOS:
            print_error("Signing is only supported on macOS")
            return 1
        return 0 if sign_macos() else 1

    # Get Python executable (from venv if available)
    python_exe = activate_venv()

    # Install dependencies
    if not args.skip_deps and args.mode != 'installer':
        install_dependencies(python_exe)

    # Stamp VERSION into runtime files (desktop/config.py, crash_reporter.py)
    stamp_version()

    # Build React landing-page
    if not args.skip_deps and args.mode != 'installer':
        if not build_react_landing_page():
            print_error("Cannot proceed without a React build.")
            return 1

    # Run setup wizard for crash reporting configuration
    if not args.skip_wizard and args.mode != 'installer':
        run_setup_wizard(python_exe, args.sentry_dsn)

    # Determine target platform
    target = args.platform
    if not target:
        if IS_WINDOWS:
            target = 'windows'
        elif IS_MACOS:
            target = 'macos'
        else:
            target = 'linux'

    # Build
    app_only = args.mode == 'app'
    installer_only = args.mode == 'installer'

    success = False
    if target == 'windows':
        if not IS_WINDOWS:
            print_error("Windows builds must be done on Windows")
            return 1
        success = build_windows(python_exe, app_only, installer_only)
    elif target == 'macos':
        if not IS_MACOS:
            print_error("macOS builds must be done on macOS")
            return 1
        success = build_macos(python_exe, app_only, installer_only)
    elif target == 'linux':
        if not IS_LINUX:
            print_error("Linux builds must be done on Linux")
            return 1
        success = build_linux(python_exe, app_only, installer_only)

    if success:
        print_summary()
        return 0
    else:
        print_error("Build failed!")
        return 1


if __name__ == '__main__':
    sys.exit(main())

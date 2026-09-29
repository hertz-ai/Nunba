"""The React environment setup works with and without Bash."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANDING_PAGE = ROOT / "landing-page"
SETUP_SCRIPT = LANDING_PAGE / "scripts" / "setup-env.cjs"


def _node():
    executable = shutil.which("node")
    assert executable, "Node is required to build the React frontend"
    return executable


def test_npm_lifecycle_uses_the_portable_launcher():
    package = json.loads((LANDING_PAGE / "package.json").read_text(encoding="utf-8"))
    assert package["scripts"]["setup-env"] == "node scripts/setup-env.cjs"
    assert package["scripts"]["prebuild"] == package["scripts"]["setup-env"]


def test_shell_entry_point_delegates_without_duplicating_setup_logic():
    shell = (LANDING_PAGE / "scripts" / "setup-env.sh").read_text(encoding="utf-8")
    assert "setup-env.cjs" in shell
    assert "--portable" in shell
    assert "openssl enc" not in shell
    assert "cp \"$ENV_EXAMPLE\"" not in shell


def test_portable_fallback_copies_example_without_bash(tmp_path):
    project = tmp_path / "landing-page"
    scripts = project / "scripts"
    scripts.mkdir(parents=True)
    shutil.copy2(SETUP_SCRIPT, scripts / SETUP_SCRIPT.name)
    (project / ".env.example").write_text("EXAMPLE_VALUE=works\n", encoding="utf-8")

    env = os.environ.copy()
    env["NUNBA_SETUP_ENV_FORCE_PORTABLE"] = "1"
    result = subprocess.run(
        [_node(), str(scripts / SETUP_SCRIPT.name)],
        cwd=project,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert (project / ".env.local").read_text(encoding="utf-8") == "EXAMPLE_VALUE=works\n"

    (project / ".env.example").write_text("EXAMPLE_VALUE=changed\n", encoding="utf-8")
    repeated = subprocess.run(
        [_node(), str(scripts / SETUP_SCRIPT.name)],
        cwd=project,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert repeated.returncode == 0, repeated.stderr
    assert (project / ".env.local").read_text(encoding="utf-8") == "EXAMPLE_VALUE=works\n"


def test_windows_resolver_finds_git_bash_outside_path(tmp_path):
    if os.name != "nt":
        return

    program_files = tmp_path / "Program Files"
    bash = program_files / "Git" / "bin" / "bash.exe"
    bash.parent.mkdir(parents=True)
    bash.touch()
    snippet = (
        "const setup=require(process.argv[1]);"
        "process.stdout.write(setup.resolveBash({ProgramFiles:process.argv[2],PATH:''}) || '')"
    )
    result = subprocess.run(
        [_node(), "-e", snippet, str(SETUP_SCRIPT), str(program_files)],
        capture_output=True,
        text=True,
        timeout=30,
        check=True,
    )

    assert os.path.normcase(os.path.abspath(result.stdout)) == os.path.normcase(str(bash.resolve()))


def test_launcher_falls_back_when_resolved_bash_cannot_run(tmp_path):
    project = tmp_path / "landing-page"
    scripts = project / "scripts"
    scripts.mkdir(parents=True)
    shutil.copy2(SETUP_SCRIPT, scripts / SETUP_SCRIPT.name)
    (scripts / "setup-env.sh").write_text("this is not Python\n", encoding="utf-8")
    (project / ".env.example").write_text("FALLBACK=works\n", encoding="utf-8")

    env = os.environ.copy()
    env.pop("NUNBA_SETUP_ENV_FORCE_PORTABLE", None)
    env["NUNBA_BASH"] = sys.executable
    result = subprocess.run(
        [_node(), str(scripts / SETUP_SCRIPT.name)],
        cwd=project,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert "using the portable setup" in result.stderr
    assert (project / ".env.local").read_text(encoding="utf-8") == "FALLBACK=works\n"

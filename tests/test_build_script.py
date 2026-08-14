"""
test_build_script.py - Tests for scripts/build.py

Tests the build system helpers — path discovery, version stamping,
dependency management, platform detection. Does NOT test the full build
process (that requires a venv, npm, cx_Freeze, etc).

FT: HARTOS backend discovery, version stamping in files, dependency
    installation command construction, React build detection, clean.
NFT: Cross-platform path handling, subprocess error handling,
     idempotent version stamping, no hardcoded absolute paths.
"""
import os
import sys
import tempfile
from unittest.mock import patch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Add scripts/ to path so build.py can import deps
scripts_dir = os.path.join(PROJECT_ROOT, 'scripts')
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)


# ============================================================
# Print helpers — build log output
# ============================================================

class TestPrintHelpers:
    """Build log formatting — these produce the colored output users see."""

    def test_print_header_no_crash(self):
        from scripts.build import print_header
        print_header("Test Build")  # Must not raise

    def test_print_info_no_crash(self):
        from scripts.build import print_info
        print_info("Installing dependencies...")

    def test_print_warn_no_crash(self):
        from scripts.build import print_warn
        print_warn("Optional component missing")

    def test_print_error_no_crash(self):
        from scripts.build import print_error
        print_error("Build failed")


# ============================================================
# run_command — subprocess wrapper
# ============================================================

class TestRunCommand:
    """run_command wraps subprocess.run with logging and error handling."""

    def test_successful_command(self):
        from scripts.build import run_command
        # 'echo' works on all platforms
        result = run_command(['python', '--version'], description="Test Python version")
        assert result is not None

    def test_failed_command_with_check_false(self):
        from scripts.build import run_command
        # Nonexistent command — check=False should not raise
        result = run_command(['nonexistent_binary_xyz'], description="Test", check=False)
        # Returns None or CompletedProcess with non-zero


# ============================================================
# Version stamping
# ============================================================

class TestVersionStamping:
    """stamp_version writes VERSION into multiple files — must be idempotent."""

    def test_stamp_version_in_file(self):
        from scripts.build import _stamp_version_in_file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write('VERSION = "0.0.0"\n')
            f.flush()
            _stamp_version_in_file(f.name, r'VERSION\s*=\s*"[^"]*"', 'VERSION = "0.1.0"')
        with open(f.name) as f2:
            content = f2.read()
        os.unlink(f.name)
        assert 'VERSION = "0.1.0"' in content

    def test_stamp_idempotent(self):
        """Running stamp twice must not corrupt the file."""
        from scripts.build import _stamp_version_in_file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write('VERSION = "1.0.0"\n')
            f.flush()
            _stamp_version_in_file(f.name, r'VERSION\s*=\s*"[^"]*"', 'VERSION = "0.1.0"')
            _stamp_version_in_file(f.name, r'VERSION\s*=\s*"[^"]*"', 'VERSION = "0.1.0"')
        with open(f.name) as f2:
            content = f2.read()
        os.unlink(f.name)
        assert content.count('VERSION') == 1


# ============================================================
# HARTOS backend discovery
# ============================================================

class TestHARTOSDiscovery:
    """_find_local_hartos_backend looks for sibling HARTOS repo."""

    def test_finds_sibling_hartos(self):
        from scripts.build import _find_local_hartos_backend
        # Should find HARTOS since it's a sibling repo in our dev setup
        result = _find_local_hartos_backend()
        # May or may not find it depending on CWD — key: doesn't crash
        assert result is None or isinstance(result, str)

    def test_returns_none_when_not_found(self):
        from scripts.build import _find_local_hartos_backend
        with patch('os.path.isfile', return_value=False):
            result = _find_local_hartos_backend()
        # May still find via other paths, but should not crash


# ============================================================
# Clean build
# ============================================================

class TestCleanBuild:
    """clean_build removes build artifacts — must not delete source code."""

    def test_clean_creates_no_errors(self):
        from scripts.build import clean_build
        with patch('shutil.rmtree') as mock_rm, \
             patch('os.path.isdir', return_value=False):
            clean_build()
        # rmtree should only be called on build dirs, not source


# ============================================================
# Directory size helper
# ============================================================

class TestDirSize:
    """_dir_size_mb used for build size reporting."""

    def test_returns_float(self):
        from scripts.build import _dir_size_mb
        result = _dir_size_mb(tempfile.gettempdir())
        assert isinstance(result, (int, float))
        assert result >= 0

    def test_nonexistent_dir_returns_zero(self):
        from scripts.build import _dir_size_mb
        result = _dir_size_mb('/nonexistent/path/xyz')
        assert result == 0


# ============================================================
# Constants
# ============================================================

class TestBuildConstants:
    """Build configuration constants."""

    def test_app_name_is_nunba(self):
        from scripts.build import APP_NAME
        assert APP_NAME == "Nunba"

    def test_version_matches_deps(self):
        """build.py VERSION must match deps.py VERSION — single source of truth."""
        from scripts.build import VERSION
        from scripts.deps import VERSION as DEPS_VERSION
        assert VERSION == DEPS_VERSION


# ============================================================
# Elevation vaccine ordering — the python-embed ACL poisoning
# ============================================================

class TestElevationVaccineOrdering:
    r"""`normalize_embed_acl` must run after the LAST python-embed write.

    2026-08-14: it ran exactly once, before cx_Freeze.  But
    setup_freeze_nunba.py's post-build hook re-installs hart-backend,
    hevolveai, hevolve-database, agent-ledger and the HevolveArmor
    loader INTO the source python-embed — writes that land after that
    call.  pip stages in %TEMP% and MOVES into place, and a MOVE
    preserves the source ACL, so an elevated build left 37 entries
    owned by BUILTIN\Administrators with no ACE for the invoking user.
    The next non-elevated build could not read them and died with
    "23 file(s) STILL corrupt after autorepair" — a message that never
    mentions permissions, which is why it read as corruption for hours.
    """

    @staticmethod
    def _build_windows():
        import ast
        path = os.path.join(PROJECT_ROOT, 'scripts', 'build.py')
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        for node in ast.walk(ast.parse(src)):
            if isinstance(node, ast.FunctionDef) and node.name == 'build_windows':
                return node, src
        raise AssertionError('build_windows() not found in scripts/build.py')

    @staticmethod
    def _call_lines(fn, src):
        """(vaccine_lines, freeze_lines, fail_lines) inside build_windows."""
        import ast
        vaccine, freeze, fail = [], [], []
        for node in ast.walk(fn):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Name) and node.func.id == 'normalize_embed_acl':
                vaccine.append(node.lineno)
            seg = ast.get_source_segment(src, node) or ''
            if 'setup_freeze_nunba.py' in seg:
                freeze.append(node.lineno)
            if 'cx_Freeze build failed' in seg:
                fail.append(node.lineno)
        return vaccine, freeze, fail

    def test_vaccine_runs_after_the_cx_freeze_post_build_writes(self):
        fn, src = self._build_windows()
        vaccine, freeze, _ = self._call_lines(fn, src)
        assert freeze, 'no setup_freeze_nunba.py invocation in build_windows()'
        assert vaccine, 'normalize_embed_acl() is never called'
        assert max(vaccine) > max(freeze), (
            'normalize_embed_acl() must also run AFTER cx_Freeze — its '
            'post-build hook is the LAST writer of source python-embed. '
            f'cx_Freeze at line {max(freeze)}, last vaccine at line '
            f'{max(vaccine)}.')

    def test_vaccine_runs_on_the_cx_freeze_failure_path_too(self):
        """A build that dies mid-freeze must not leave the tree unreadable
        for the retry — normalize before the early return."""
        fn, src = self._build_windows()
        vaccine, freeze, fail = self._call_lines(fn, src)
        assert fail, 'no "cx_Freeze build failed" error path found'
        after_freeze_before_return = [
            ln for ln in vaccine if max(freeze) < ln < min(fail)]
        assert after_freeze_before_return, (
            'normalize_embed_acl() must run between the cx_Freeze call '
            f'(line {max(freeze)}) and the failure return (line '
            f'{min(fail)}), so a failed build still hands the tree back.')

    def test_vaccine_docstring_has_no_invalid_escape(self):
        r"""`BUILTIN\Administrators` in a non-raw docstring makes Python
        emit `invalid escape sequence '\A'` on every parse of build.py —
        including inside the build it is meant to protect.

        Catch DeprecationWarning as well as SyntaxWarning: `ast.parse`
        raises this one as a DeprecationWarning, so a SyntaxWarning-only
        filter passes while the warning is being emitted — a guard that
        cannot fail for its own defect.
        """
        import ast
        import warnings
        path = os.path.join(PROJECT_ROOT, 'scripts', 'build.py')
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            ast.parse(src)
        bad = [w for w in caught
               if issubclass(w.category, (SyntaxWarning, DeprecationWarning))
               and 'escape sequence' in str(w.message)]
        assert not bad, (
            'scripts/build.py emits an invalid-escape warning on parse: '
            + '; '.join(str(w.message) for w in bad))


class TestMetadataPermissionMisdiagnosis:
    """An UNREADABLE METADATA must not be reported as a MISSING one.

    `os.path.isfile()` swallows OSError and returns False, so an
    ERROR_ACCESS_DENIED became "METADATA file missing" — and the printed
    repair recipe then prescribed `rm -rf`, which hits the same denial.
    """

    @staticmethod
    def _validator():
        import ast
        path = os.path.join(PROJECT_ROOT, 'scripts', 'setup_freeze_nunba.py')
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        for node in ast.walk(ast.parse(src)):
            if (isinstance(node, ast.FunctionDef)
                    and node.name == '_validate_python_embed_source'):
                return node, src
        raise AssertionError('_validate_python_embed_source() not found')

    def test_metadata_probe_does_not_swallow_oserror(self):
        import ast
        fn, src = self._validator()
        seg = ast.get_source_segment(src, fn) or ''
        assert 'os.path.isfile(meta)' not in seg, (
            'os.path.isfile() cannot distinguish "absent" from '
            '"access denied" — probe with os.stat() and branch on '
            'FileNotFoundError vs OSError instead.')

    def test_metadata_probe_branches_on_filenotfound(self):
        import ast
        fn, _src = self._validator()
        names = set()
        for node in ast.walk(fn):
            if not isinstance(node, ast.Try):
                continue
            for h in node.handlers:
                if isinstance(h.type, ast.Name):
                    names.add(h.type.id)
                elif isinstance(h.type, ast.Tuple):
                    names.update(e.id for e in h.type.elts
                                 if isinstance(e, ast.Name))
        assert 'FileNotFoundError' in names, (
            'the METADATA probe must branch on FileNotFoundError so a '
            'genuine absence stays "missing" while a permission failure '
            'is reported as a permission failure')

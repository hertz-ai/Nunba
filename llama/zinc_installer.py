"""
Zinc Installer — AMD RDNA3/RDNA4 GPU inference via Vulkan.

Zinc is a drop-in alternative to llama.cpp for AMD consumer GPUs
(RX 9070, Radeon AI PRO R9700) that lack ROCm support but have
excellent memory bandwidth via Vulkan.

Same GGUF models, same /v1/chat/completions API, same port management.
The rest of Nunba doesn't need to know which backend is running.

Requires: zig 0.15.2+, Vulkan dev libraries, glslc (Linux)
macOS: shader compilation skipped, Vulkan via MoltenVK
Windows: not supported (use llama.cpp with CUDA)

Source: https://github.com/zolotukhin/zinc
"""

import logging
import os
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger('ZincInstaller')

ZINC_REPO = 'https://github.com/zolotukhin/zinc.git'


class ZincInstaller:
    """Install and manage the zinc inference server for AMD GPUs."""

    def __init__(self, install_dir: str | None = None):
        home = Path.home()
        self.install_dir = Path(install_dir) if install_dir else home / '.nunba' / 'zinc'
        self.binary_path = self.install_dir / 'zig-out' / 'bin' / 'zinc'

    # ── Detection ────────────────────────────────────────────────

    @staticmethod
    def is_amd_gpu() -> bool:
        """Check if an AMD GPU is present (via rocm-smi or lspci)."""
        # rocm-smi (most reliable)
        try:
            _kw = dict(capture_output=True, text=True, timeout=3)
            if hasattr(subprocess, 'CREATE_NO_WINDOW'):
                _kw['creationflags'] = subprocess.CREATE_NO_WINDOW
            result = subprocess.run(['rocm-smi', '--showproductname'], **_kw)
            if result.returncode == 0 and result.stdout.strip():
                return True
        except Exception:
            pass

        # lspci fallback (Linux)
        if sys.platform.startswith('linux'):
            try:
                result = subprocess.run(
                    ['lspci'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    for line in result.stdout.splitlines():
                        if 'AMD' in line and ('VGA' in line or 'Display' in line):
                            return True
            except Exception:
                pass

        return False

    @staticmethod
    def get_amd_gpu_name() -> str | None:
        """Get AMD GPU name string."""
        try:
            _kw = dict(capture_output=True, text=True, timeout=3)
            if hasattr(subprocess, 'CREATE_NO_WINDOW'):
                _kw['creationflags'] = subprocess.CREATE_NO_WINDOW
            result = subprocess.run(['rocm-smi', '--showproductname'], **_kw)
            if result.returncode == 0:
                # Parse "GPU[0]: AMD Radeon RX 9070 XT" → "AMD Radeon RX 9070 XT"
                for line in result.stdout.splitlines():
                    if 'GPU' in line and ':' in line:
                        return line.split(':', 1)[1].strip()
                return result.stdout.strip()
        except Exception:
            pass
        return None

    # ── Dependencies ─────────────────────────────────────────────

    def check_dependencies(self) -> tuple[bool, list[str]]:
        """Check if zig, git, and Vulkan tools are available.

        Returns (all_ok, list_of_missing).
        """
        missing = []

        # Zig compiler
        try:
            _kw = dict(capture_output=True, text=True, timeout=5)
            if hasattr(subprocess, 'CREATE_NO_WINDOW'):
                _kw['creationflags'] = subprocess.CREATE_NO_WINDOW
            result = subprocess.run(['zig', 'version'], **_kw)
            if result.returncode != 0:
                missing.append('zig (https://ziglang.org/download/)')
        except FileNotFoundError:
            missing.append('zig (https://ziglang.org/download/)')

        # Git
        try:
            subprocess.run(['git', '--version'], capture_output=True, timeout=3)
        except FileNotFoundError:
            missing.append('git')

        # glslc (Vulkan shader compiler — Linux only, macOS skips shaders)
        if sys.platform.startswith('linux'):
            try:
                subprocess.run(['glslc', '--version'], capture_output=True, timeout=3)
            except FileNotFoundError:
                missing.append('glslc (apt install glslc or vulkan-tools)')

        return len(missing) == 0, missing

    # ── Install ──────────────────────────────────────────────────

    def is_installed(self) -> bool:
        """Check if zinc binary exists."""
        return self.binary_path.exists()

    def find_zinc_server(self) -> str | None:
        """Find zinc binary — installed or system-wide."""
        if self.binary_path.exists():
            return str(self.binary_path)

        # Check PATH
        import shutil
        system_zinc = shutil.which('zinc')
        if system_zinc:
            return system_zinc

        return None

    def install(self, progress_callback=None) -> bool:
        """Clone zinc repo and build from source.

        Returns True if successful.
        """
        deps_ok, missing = self.check_dependencies()
        if not deps_ok:
            msg = f"Missing: {', '.join(missing)}"
            logger.error(msg)
            if progress_callback:
                progress_callback(0, 0, msg)
            return False

        _kw = {}
        if hasattr(subprocess, 'CREATE_NO_WINDOW'):
            _kw['creationflags'] = subprocess.CREATE_NO_WINDOW

        # Clone if needed
        if not (self.install_dir / '.git').exists():
            if progress_callback:
                progress_callback(0, 100, 'Cloning zinc repository...')
            logger.info(f"Cloning zinc to {self.install_dir}")
            self.install_dir.parent.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.run(
                    ['git', 'clone', '--depth', '1', ZINC_REPO, str(self.install_dir)],
                    check=True, timeout=120, **_kw)
            except Exception as e:
                logger.error(f"Git clone failed: {e}")
                if progress_callback:
                    progress_callback(0, 0, f'Clone failed: {e}')
                return False
        else:
            # Pull latest
            try:
                subprocess.run(
                    ['git', 'pull'], cwd=str(self.install_dir),
                    capture_output=True, timeout=60, **_kw)
            except Exception:
                pass

        # Build
        if progress_callback:
            progress_callback(30, 100, 'Building zinc (this may take 5-10 minutes)...')
        logger.info("Building zinc...")
        try:
            result = subprocess.run(
                ['zig', 'build'], cwd=str(self.install_dir),
                capture_output=True, text=True, timeout=600, **_kw)
            if result.returncode != 0:
                logger.error(f"Build failed: {result.stderr[:500]}")
                if progress_callback:
                    progress_callback(0, 0, f'Build failed: {result.stderr[:200]}')
                return False
        except subprocess.TimeoutExpired:
            logger.error("Build timed out (10 min)")
            if progress_callback:
                progress_callback(0, 0, 'Build timed out')
            return False

        if self.binary_path.exists():
            logger.info(f"Zinc built successfully: {self.binary_path}")
            if progress_callback:
                progress_callback(100, 100, 'Zinc built successfully!')
            return True

        logger.error("Build completed but binary not found")
        return False

    # ── Server Management ────────────────────────────────────────
    # Zinc uses the same OpenAI-compatible API as llama.cpp:
    #   /v1/chat/completions, /v1/models, /health
    # So LlamaConfig's server management works unchanged.
    # These methods are only needed for standalone use.

    def build_server_command(self, model_path: str, port: int = 8080,
                             context_size: int = 8192, threads: int = 4) -> list[str]:
        """Build the zinc server command line.

        Args match llama-server's for consistency.
        """
        binary = self.find_zinc_server()
        if not binary:
            raise FileNotFoundError("Zinc binary not found")

        cmd = [binary, '-m', model_path, '-p', str(port)]
        return cmd

    def get_server_env(self) -> dict:
        """Environment variables for zinc server (RDNA4 optimization)."""
        env = os.environ.copy()
        # Required for RDNA4 cooperative matrix support
        env['RADV_PERFTEST'] = 'coop_matrix'
        return env

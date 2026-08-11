"""
llama_installer.py - Automatic Llama.cpp and Model Download/Installation

Handles automatic installation of Llama.cpp and downloading models from HuggingFace
during Nunba app first run or on-demand.

Based on the implementation from TrueFlow AIExplanationPanel.kt
"""
import json
import logging
import os
import platform
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path

logger = logging.getLogger('NunbaLlamaInstaller')

# Minimum llama.cpp build for the Qwen3.5 presets.
#
# Bumped 8148 → 9180 on 2026-05-23 to require the build that includes
# MTP (Multi-Token Prediction) support — PR #22673 by am17an, merged
# 2026-05-16 into llama.cpp master.  b9180 is the lowest tag verified
# post-merge in upstream benchmark comments (per Startup Fortune
# coverage of the PR).
#
# Why bump (and not gate behind a separate constant): every Qwen3.5
# preset materially benefits from MTP (~1.8-2.2x generation throughput
# per upstream report), the Qwen3.5 checkpoints already ship with the
# MTP head, and the existing update UX (app.py:3205 _on_update_llama)
# is the right surface to drive the upgrade.  Existing installs see
# "Update llama.cpp" prompt next time they touch model setup → click →
# LlamaInstaller.update_llama_cpp() hits GitHub Releases API → replaces
# the binary with latest.  After that, HEVOLVE_LLAMA_MTP_N=N (wired
# in commit 29d228db) actually takes effect — was silently rejected
# on b<9180 because --spec-type mtp didn't exist yet.
#
# Backward compat: any current installs on b8148+ but <9180 still run
# the same Qwen3.5 architecture; the model boots fine.  The version
# gate only changes which builds Nunba RECOMMENDS — boot succeeds
# either way.
MIN_LLAMACPP_BUILD_QWEN35 = 9180


class ModelPreset:
    """Model configuration presets"""
    def __init__(self, display_name: str, repo_id: str, file_name: str,
                 size_mb: int, description: str, has_vision: bool = False,
                 mmproj_file: str | None = None,
                 mmproj_source_file: str | None = None,
                 min_build: int | None = None):
        self.display_name = display_name
        self.repo_id = repo_id
        self.file_name = file_name
        self.size_mb = size_mb
        self.description = description
        self.has_vision = has_vision
        self.mmproj_file = mmproj_file          # Local unique name (e.g. mmproj-Qwen3.5-4B-F16.gguf)
        self.mmproj_source_file = mmproj_source_file or mmproj_file  # HF name (usually mmproj-F16.gguf)
        self.min_build = min_build


# Model presets from HuggingFace
# Qwen3.5 VL models are the default — 256K context, unified VLM (vision+text)
MODEL_PRESETS = [
    # Qwen3.5 models - default choice, 256K context, unified VLM (vision+text)
    # Requires llama.cpp build b8148+, NOT compatible with Ollama
    ModelPreset(
        "Qwen3.5-4B VL (Recommended)",
        "unsloth/Qwen3.5-4B-GGUF",
        "Qwen3.5-4B-UD-Q4_K_XL.gguf",
        2910,
        "256K context, vision+text, best quality (GPU ≥4GB VRAM)",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-4B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
    ModelPreset(
        "Qwen3.5-2B VL",
        "unsloth/Qwen3.5-2B-GGUF",
        "Qwen3.5-2B-UD-Q4_K_XL.gguf",
        1340,
        "256K context, vision+text, lightweight (low VRAM / CPU)",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-2B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
    # Older Qwen3-VL models
    ModelPreset(
        "Qwen3-VL-2B Instruct Q4_K_XL",
        "unsloth/Qwen3-VL-2B-Instruct-GGUF",
        "Qwen3-VL-2B-Instruct-UD-Q4_K_XL.gguf",
        1500,
        "Vision+text, good for code analysis with diagrams",
        has_vision=True,
        mmproj_file="mmproj-Qwen3-VL-2B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf"
    ),
    # Smallest Qwen3.5 — vision+text, ideal for continuous captioning
    ModelPreset(
        "Qwen3.5-0.8B VL (Caption)",
        "unsloth/Qwen3.5-0.8B-GGUF",
        "Qwen3.5-0.8B-UD-Q4_K_XL.gguf",
        550,
        "Smallest VLM, ~750MB with mmproj, ~1.9 FPS captioning, runs on anything",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-0.8B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
    ModelPreset(
        "Qwen3-2B Text-Only Q4_K_M",
        "unsloth/Qwen3-2B-Instruct-GGUF",
        "Qwen3-2B-Instruct-Q4_K_M.gguf",
        1100,
        "Text-only, fastest, no vision support",
        has_vision=False
    ),
    # Larger Qwen3.5 models — dynamically selected based on available VRAM
    # All use Unsloth 4-bit UD dynamic quant, Qwen3.5 architecture (256K context)
    # All support vision via mmproj (confirmed: unsloth.ai/docs/models/qwen3.5)
    ModelPreset(
        "Qwen3.5-9B UD-Q4_K_XL",
        "unsloth/Qwen3.5-9B-GGUF",
        "Qwen3.5-9B-UD-Q4_K_XL.gguf",
        6113,  # 5.97 GB
        "256K context, 9B params, vision+text, strong reasoning (llama.cpp only)",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-9B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
    ModelPreset(
        "Qwen3.5-27B UD-Q4_K_XL",
        "unsloth/Qwen3.5-27B-GGUF",
        "Qwen3.5-27B-UD-Q4_K_XL.gguf",
        18022,  # 17.6 GB
        "256K context, 27B params, vision+text, near-frontier quality (llama.cpp only)",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-27B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
    ModelPreset(
        "Qwen3.5-35B-A3B MoE UD-Q4_K_XL",
        "unsloth/Qwen3.5-35B-A3B-GGUF",
        "Qwen3.5-35B-A3B-UD-Q4_K_XL.gguf",
        22733,  # 22.2 GB
        "256K context, 35B MoE (active 3B), vision+text, fast inference (llama.cpp only)",
        has_vision=True,
        mmproj_file="mmproj-Qwen3.5-35B-A3B-F16.gguf",
        mmproj_source_file="mmproj-F16.gguf",
        min_build=MIN_LLAMACPP_BUILD_QWEN35
    ),
]


# Sibling project model directories to search before re-downloading.
# If a model already exists in a sibling project, Nunba reuses it.
SIBLING_MODEL_DIRS = [
    Path.home() / ".trueflow" / "models",
    Path.home() / ".ollama" / "models",
]

# HuggingFace Hub cache — nested structure: models--org--repo/snapshots/hash/file
_HF_CACHE_DIR = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub"


class LlamaInstaller:
    """Handles Llama.cpp installation and model downloading"""

    # Class-level dedupe set for find_llama_server INFO logs (see
    # find_llama_server below).  Shared across all LlamaInstaller
    # instances within the same Python process so the same path
    # only logs INFO once even when many health probes / status
    # endpoints / start-server call sites all resolve it.
    _logged_paths: set[str] = set()
    # path -> (mtime, build) — version-aware resolution probes every existing
    # candidate, and /api/llm/status polls; cache by mtime so a binary is
    # spawned with --version at most once until it changes on disk.
    _version_cache: dict[str, tuple[float, int]] = {}

    def __init__(self, install_dir: str | None = None, models_dir: str | None = None):
        """
        Initialize the installer

        Args:
            install_dir: Directory to install llama.cpp (defaults to ~/.nunba/llama.cpp)
            models_dir: Directory to store models (defaults to ~/.nunba/models)
        """
        home = Path.home()
        self.install_dir = Path(install_dir) if install_dir else home / ".nunba" / "llama.cpp"
        self.models_dir = Path(models_dir) if models_dir else home / ".nunba" / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.install_dir.parent.mkdir(parents=True, exist_ok=True)

        self.os_name = platform.system().lower()
        self.gpu_available = self._detect_gpu()
        self.binary_supports_gpu = False  # Will be set during installation

    @staticmethod
    def _no_window() -> tuple:
        """(startupinfo, creationflags) that suppress a console window on Windows.
        DRY: every subprocess in this module needs the same pair on win32.

        Delegates to the ONE canonical implementation,
        ``desktop.platform_utils.get_subprocess_flags()``.  This method used to
        build the STARTUPINFO itself — one of ELEVEN first-party copies found
        2026-08-11 — and, more pointedly, two spawns in THIS SAME FILE (the
        where/which probe and the --version probe) inlined the block again
        instead of calling this helper, despite the docstring above asking them
        to.  Both now call it.  See
        tests/test_hidden_subprocess_single_source.py.
        """
        try:
            from desktop.platform_utils import get_subprocess_flags
            flags = get_subprocess_flags()
            return flags.get('startupinfo'), flags.get('creationflags', 0)
        except Exception:
            # Cosmetic, never correctness — a bundling surprise must not stop
            # us from locating/probing llama-server.
            return None, 0

    @staticmethod
    def detect_backend(os_name: str | None = None) -> str:
        """Detect the best llama.cpp GPU BACKEND for the hardware this runs on —
        the SINGLE source of truth (ai_installer.detect_gpu delegates here, then
        adds VRAM). Static so callers need no installer instance / install-dir
        side effects. Returns:
          'cuda'   — NVIDIA. Windows gets the turnkey bundled-cudart CUDA build;
                     Linux has no CUDA prebuilt, so the asset picker uses Vulkan
                     (which runs on NVIDIA too) — see _select_release_assets.
          'vulkan' — AMD or Intel-Arc discrete GPU. Vulkan is the UNIVERSAL GPU
                     backend: no vendor runtime (no ROCm/oneAPI), runs on any
                     modern GPU — the portable "just works" path for non-NVIDIA.
          'metal'  — Apple Silicon / Metal-capable Mac.
          'none'   — no usable GPU → CPU build.
        """
        os_name = (os_name or platform.system()).lower()
        try:
            if "darwin" in os_name:
                return "metal"
            if "windows" not in os_name and "linux" not in os_name:
                return "none"

            si, cf = LlamaInstaller._no_window()

            # 1. NVIDIA first — fastest, and Windows ships a turnkey CUDA build.
            try:
                result = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                    capture_output=True, text=True, timeout=3,
                    startupinfo=si, creationflags=cf)
                if result.returncode == 0 and result.stdout.strip():
                    logger.debug(f"NVIDIA GPU detected: {result.stdout.strip()}")
                    return "cuda"
            except Exception:
                pass

            # 2. AMD via rocm-smi → Vulkan (portable; no ROCm runtime required).
            try:
                result = subprocess.run(
                    ["rocm-smi", "--showproductname"],
                    capture_output=True, text=True, timeout=3,
                    startupinfo=si, creationflags=cf)
                if result.returncode == 0 and result.stdout.strip():
                    logger.debug(f"AMD GPU detected (rocm-smi) → vulkan")
                    return "vulkan"
            except Exception:
                pass

            # 3. Linux: lspci for an AMD or Intel-Arc display controller.
            if "linux" in os_name:
                try:
                    result = subprocess.run(
                        ['lspci'], capture_output=True, text=True, timeout=5,
                        startupinfo=si, creationflags=cf)
                    if result.returncode == 0:
                        for line in result.stdout.splitlines():
                            up = line.upper()
                            if not ('VGA' in up or 'DISPLAY' in up or '3D' in up):
                                continue
                            if any(x in up for x in ('AMD', 'ATI', 'RADEON')):
                                logger.debug("AMD GPU detected (lspci) → vulkan")
                                return "vulkan"
                            # Intel DISCRETE (Arc/DG2); weak iGPUs stay on CPU.
                            if 'INTEL' in up and any(x in up for x in ('ARC', 'DG2', 'BATTLEMAGE')):
                                logger.debug("Intel Arc detected (lspci) → vulkan")
                                return "vulkan"
                except Exception:
                    pass

            # 4. Windows: wmic for an AMD Radeon / Intel-Arc discrete GPU.
            if "windows" in os_name:
                try:
                    result = subprocess.run(
                        ["wmic", "path", "win32_VideoController", "get", "name"],
                        capture_output=True, text=True, timeout=5,
                        startupinfo=si, creationflags=cf)
                    if result.returncode == 0:
                        up = result.stdout.upper()
                        if 'RADEON' in up or ('AMD' in up and 'GRAPHICS' in up):
                            logger.debug("AMD GPU detected (wmic) → vulkan")
                            return "vulkan"
                        if 'ARC' in up:  # Intel Arc discrete
                            logger.debug("Intel Arc detected (wmic) → vulkan")
                            return "vulkan"
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"GPU detection failed: {e}")

        return "none"

    def _detect_gpu(self) -> str:
        """Instance shim → detect_backend(self.os_name) (back-compat for the
        __init__ caller; the real logic lives in the static detect_backend)."""
        return self.detect_backend(self.os_name)

    def find_llama_server(self, check_system_first: bool = True,
                          min_build: int | None = None) -> str | None:
        """
        Find llama-server executable

        Args:
            check_system_first: If True, check system/user installations before Nunba installation
            min_build: When given, prefer the first candidate (in search order)
                whose build satisfies it. Without this, a stale system binary
                (e.g. trueflow b8200) shadows a freshly-upgraded Nunba-managed
                one forever: update_llama_cpp downloads to install_dir, but
                first-existing resolution never reaches it — the #124 upgrade
                became a no-op and the upgrade card re-surfaced every boot.
                Falls back to the first existing candidate when none satisfies
                (model still loads on lower builds; perf features degrade).

        Returns:
            Path to llama-server executable or None if not found
        """
        home = Path.home()
        exe_name = "llama-server.exe" if "windows" in self.os_name else "llama-server"

        # System/user installation paths (checked first if user already has llama.cpp)
        system_paths = [
            # TrueFlow sibling project (often has latest build)
            Path(home) / ".trueflow" / "llama.cpp" / "build" / "bin" / "Release" / exe_name,
            Path(home) / ".trueflow" / "llama.cpp" / "build" / "bin" / exe_name,
            # Common Unix installation locations
            Path("/usr/local/bin") / exe_name,
            Path("/usr/bin") / exe_name,
            Path(home) / ".local" / "bin" / exe_name,
            # Homebrew (macOS)
            Path("/opt/homebrew/bin") / exe_name,
            Path(home) / "llama.cpp" / "build" / "bin" / "Release" / exe_name,
            Path(home) / "llama.cpp" / "build" / "bin" / exe_name,
        ]
        # Windows-specific paths
        if "windows" in self.os_name:
            system_paths.extend([
                Path("C:/llama.cpp/build/bin/Release") / exe_name,
                Path("C:/llama.cpp/build/bin") / exe_name,
                Path("C:/Program Files/llama.cpp") / exe_name,
            ])

        # Nunba-managed installation paths
        nunba_paths = [
            self.install_dir / "build" / "bin" / "Release" / exe_name,
            self.install_dir / "build" / "bin" / exe_name,
            self.install_dir / exe_name,
        ]

        # Define search order based on preference
        if check_system_first:
            # Check system installations first, then Nunba installation
            search_paths = system_paths + nunba_paths
        else:
            # Check Nunba installation first, then system
            search_paths = nunba_paths + system_paths

        _existing = [p for p in search_paths if p.exists()]
        chosen = _existing[0] if _existing else None
        if min_build is not None and _existing:
            # Version-aware pass: first candidate (in search order) whose
            # build satisfies min_build wins; none satisfying -> keep the
            # first existing (warn-and-proceed semantics unchanged).
            # get_version() is mtime-cached, so polling callers don't spawn
            # a subprocess per candidate per call.
            for p in _existing:
                v = self.get_version(str(p))
                if v is not None and v >= min_build:
                    if p != _existing[0]:
                        _key = f"verpick:{p}"
                        if _key not in LlamaInstaller._logged_paths:
                            LlamaInstaller._logged_paths.add(_key)
                            logger.info(
                                f"Version-aware resolve: {p} satisfies "
                                f"b{min_build}+ — preferred over "
                                f"{_existing[0]}")
                    chosen = p
                    break

        if chosen is not None:
            path = chosen
            # Log INFO on the FIRST successful resolve per (class, path)
            # so boot-time visibility is preserved.  Subsequent calls
            # for the same path log at DEBUG to avoid spamming the
            # langchain.log every 5-7s when health probes / status
            # endpoints poll.  Class-level set keeps the dedupe
            # alive across LlamaInstaller() instances (the constructor
            # is called from many sites in HARTOS+Nunba).
            _path_str = str(path)
            if _path_str not in LlamaInstaller._logged_paths:
                LlamaInstaller._logged_paths.add(_path_str)
                logger.info(f"Found llama-server at: {_path_str}")
            else:
                logger.debug(f"Found llama-server at: {_path_str}")
            # Update GPU support detection from the found binary's location
            bin_dir = path.parent
            # GPU support = ANY ggml backend lib (cuda/vulkan/hip/rocm/metal), not
            # CUDA alone — a Vulkan build (AMD/Intel/NVIDIA) is GPU-capable too.
            self.binary_supports_gpu = self._binary_has_gpu_support(bin_dir, self.os_name)
            return str(path)

        # Try to find in PATH (system-wide installations)
        try:
            cmd = "where" if "windows" in self.os_name else "which"
            si, cf = self._no_window()
            result = subprocess.run(
                [cmd, "llama-server"],
                capture_output=True, text=True,
                timeout=5,  # unbounded subprocess can hang indefinitely on a
                            # contended box; 5 s is generous for where/which
                startupinfo=si, creationflags=cf)
            if result.returncode == 0 and result.stdout.strip():
                path = result.stdout.strip().split('\n')[0]
                logger.info(f"Found llama-server in PATH: {path}")
                return path
        except Exception:
            pass

        return None

    def is_system_installation(self, llama_path: str) -> bool:
        """
        Check if the llama-server path is a system/user installation (not Nunba-managed)

        Args:
            llama_path: Path to llama-server executable

        Returns:
            True if this is a system/user installation, False if Nunba-managed
        """
        llama_path_obj = Path(llama_path)
        return not str(llama_path_obj).startswith(str(self.install_dir))

    # ── Serving-binary record — ONE writer: note_serving_binary() ─────
    # The spawn path resolves version-aware (min_build of the chosen preset)
    # and may switch away from the first-existing candidate.  Every other
    # caller re-resolved first-existing and could therefore report a
    # DIFFERENT binary than the one actually serving — e.g. a stale trueflow
    # b8200 measured while the Nunba-managed b10330 serves.  That single
    # split caused two live defects: check_version_for_model warned "too old"
    # and set need_gpu_build (re-downloading llama.cpp every boot), and
    # update_llama_cpp could not observe its own download.  Recording the
    # resolved path once, at the spawn site, gives every reader one authority.
    #
    # Three distinct questions, three distinct answers — do not merge them:
    #   what is serving?          -> _serving_binary (this record)
    #   best available for X?     -> find_llama_server(min_build=X)
    #   the copy I manage/update? -> find_llama_server(check_system_first=False)
    _serving_binary: str | None = None

    @classmethod
    def note_serving_binary(cls, path: str | None) -> None:
        """Record the binary Nunba resolved and launched.

        Called from the spawn site only, once version-aware switching has
        settled.  Class-level so the record survives the many short-lived
        LlamaInstaller() instances constructed across Nunba + HARTOS.
        """
        cls._serving_binary = str(path) if path else None

    def get_version(self, llama_server_path: str | None = None) -> int | None:
        """
        Get the llama.cpp build number (e.g., 8192).

        Runs `llama-server --version` and parses the build number.

        Args:
            llama_server_path: Path to llama-server executable (auto-detected if None)

        Returns:
            Build number as int, or None if unknown
        """
        import re

        # Default to the binary that is actually serving (recorded at spawn).
        # Falling straight through to find_llama_server() reports whichever
        # copy happens to be first-existing, which is not necessarily the one
        # running — see note_serving_binary() above.
        server_path = (llama_server_path
                       or LlamaInstaller._serving_binary
                       or self.find_llama_server())
        if not server_path:
            return None

        # mtime-keyed cache — skip the subprocess unless the binary changed.
        try:
            _mtime = os.path.getmtime(server_path)
        except OSError:
            _mtime = None
        if _mtime is not None:
            _hit = LlamaInstaller._version_cache.get(server_path)
            if _hit is not None and _hit[0] == _mtime:
                return _hit[1]

        try:
            startupinfo, creationflags = LlamaInstaller._no_window()

            # Set cwd to binary dir so DLLs (mtmd.dll, ggml-cuda.dll) are found
            bin_dir = str(Path(server_path).parent)
            env = os.environ.copy()
            env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")

            result = subprocess.run(
                [server_path, "--version"],
                capture_output=True, text=True, timeout=10,
                cwd=bin_dir, env=env,
                startupinfo=startupinfo, creationflags=creationflags
            )
            output = (result.stdout + result.stderr).strip()

            # Try "version: NNNN" first (pre-built releases), then "bNNNN"
            # (source builds, git tags)
            match = (re.search(r'version:\s*(\d{4,})', output)
                     or re.search(r'b(\d{4,})', output))
            if match:
                build = int(match.group(1))
                if _mtime is not None:
                    # Cache only successes — a transient spawn failure must
                    # not pin None until the binary changes.
                    LlamaInstaller._version_cache[server_path] = (_mtime, build)
                return build
        except (subprocess.TimeoutExpired, OSError) as e:
            logger.debug(f"Version detection failed: {e}")

        return None

    def check_version_for_model(self, preset: 'ModelPreset',
                                llama_server_path: str | None = None) -> tuple:
        """
        Check if installed llama.cpp version supports the given model preset.

        Args:
            preset: ModelPreset to check compatibility for
            llama_server_path: Path to llama-server (auto-detected if None)

        Returns:
            (is_compatible, current_version, required_version)
        """
        required = preset.min_build
        if required is None:
            return (True, None, None)

        # No explicit path -> resolve version-aware, so this reports the
        # binary that _do_start_server would actually pick. Otherwise a stale
        # system binary shadows a satisfying Nunba-managed one and the status
        # endpoint nags "upgrade available" forever after a successful upgrade.
        server_path = llama_server_path or self.find_llama_server(min_build=required)
        current = self.get_version(server_path)

        if current is None:
            logger.warning(
                f"Cannot determine llama.cpp version. "
                f"Model {preset.display_name} requires build b{required}+."
            )
            return (True, None, required)

        is_ok = current >= required
        if not is_ok:
            logger.warning(
                f"llama.cpp build b{current} is too old for {preset.display_name}. "
                f"Required: b{required}+."
            )
        return (is_ok, current, required)

    def update_llama_cpp(self,
                         progress_callback: Callable[[str], None] | None = None) -> bool:
        """
        Update llama.cpp to the latest pre-built release from GitHub.

        Reuses try_download_prebuilt() after clearing the existing build.

        Args:
            progress_callback: Optional callback for status messages

        Returns:
            True if update successful, False otherwise
        """
        import re

        def report(msg: str):
            logger.info(msg)
            if progress_callback:
                progress_callback(msg)

        # Measure the copy THIS method replaces (install_dir), not whatever
        # first-existing resolution finds.  try_download_prebuilt() writes into
        # install_dir, so reporting a system/trueflow binary here made the
        # upgrade blind to its own download: old and new both read b8200 and
        # "Updated: bX -> bY" could never show progress, which is what kept
        # re-queueing the upgrade forever.
        _managed = self.find_llama_server(check_system_first=False)
        old_version = self.get_version(_managed) if _managed else None
        report(f"Current build: b{old_version}" if old_version else "Current build: unknown")

        try:
            # Check latest release version before downloading
            report("Checking latest release...")
            api_url = "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest"
            req = urllib.request.Request(api_url, headers={"User-Agent": "Nunba/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                release = json.loads(resp.read().decode())

            tag = release.get("tag_name", "")
            tag_match = re.search(r'b?(\d{4,})', tag)
            new_build = int(tag_match.group(1)) if tag_match else None

            if old_version and new_build and old_version >= new_build:
                report(f"Already up to date (b{old_version})")
                return True

            report(f"Downloading {tag}...")

            # Preserve the current build until the new one is confirmed. A
            # failed download must NOT strand the box with no llama-server —
            # apply_pending_llama_upgrade runs this UNATTENDED at boot, so a
            # delete-then-download would brick the local LLM on a mid-download
            # failure (API reachable, but the asset 404s / connection drops).
            # Move-aside → download → commit-or-roll-back.
            bin_dir = self.install_dir / "build" / "bin" / "Release"
            backup_dir = bin_dir.parent / "Release.bak"
            if backup_dir.exists():
                shutil.rmtree(backup_dir, ignore_errors=True)
            if bin_dir.exists():
                bin_dir.rename(backup_dir)

            # Reuse existing download infrastructure
            success = self.try_download_prebuilt()

            if not success and backup_dir.exists():
                report("Download failed — restoring previous build")
                if bin_dir.exists():
                    shutil.rmtree(bin_dir, ignore_errors=True)
                backup_dir.rename(bin_dir)
            elif backup_dir.exists():
                shutil.rmtree(backup_dir, ignore_errors=True)

            if success:
                # Re-resolve: the managed copy may not have existed before the
                # download, so the pre-download path can be stale/None.
                _new_managed = self.find_llama_server(check_system_first=False)
                new_version = (self.get_version(_new_managed)
                               if _new_managed else None)
                if old_version and new_version:
                    report(f"Updated: b{old_version} \u2192 b{new_version}")
                else:
                    report(f"Updated to b{new_version}" if new_version else "Update complete")
            else:
                report("Update failed — download error")

            return success

        except Exception as e:
            logger.error(f"Update failed: {e}")
            report(f"Update failed: {e}")
            return False

    def is_installed(self) -> bool:
        """Check if llama.cpp is already installed"""
        return self.find_llama_server() is not None

    def download_file_with_progress(
        self,
        url: str,
        dest_path: Path,
        progress_callback: Callable[[int, int], None] | None = None
    ) -> None:
        """
        Download a file with progress tracking and integrity validation.

        Args:
            url: URL to download from
            dest_path: Destination file path
            progress_callback: Optional callback(downloaded_bytes, total_bytes)

        Raises:
            RuntimeError: If downloaded file size doesn't match expected size
        """
        logger.info(f"Downloading from {url} to {dest_path}")

        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Nunba/1.0')

        with urllib.request.urlopen(req, timeout=30) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            downloaded = 0
            block_size = 1024 * 1024  # 1MB blocks

            with open(dest_path, 'wb') as f:
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    f.write(buffer)
                    downloaded += len(buffer)
                    if progress_callback and total_size > 0:
                        progress_callback(downloaded, total_size)

        # Verify download integrity
        actual_size = dest_path.stat().st_size
        if total_size > 0 and actual_size != total_size:
            dest_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"Download incomplete: got {actual_size} bytes, "
                f"expected {total_size} bytes. Deleted corrupted file."
            )

        logger.info(f"Download complete: {dest_path} ({actual_size} bytes)")

    @staticmethod
    def _binary_has_gpu_support(bin_dir: Path, os_name: str) -> bool:
        """True if the llama.cpp build in bin_dir ships a GPU backend library
        (ggml-cuda / ggml-vulkan / ggml-hip / ggml-rocm / ggml-metal). macOS
        links Metal into the binary, so a macOS build is always GPU-capable.
        Used to decide whether a CPU-only binary on a GPU box must be re-pulled."""
        if "darwin" in os_name:
            return True
        for stem in ("ggml-cuda", "ggml-vulkan", "ggml-hip", "ggml-rocm", "ggml-metal"):
            if list(bin_dir.glob(stem + "*.dll")) or list(bin_dir.glob(stem + "*.so")):
                return True
        return False

    def _select_release_assets(self, asset_map: dict, tag_name: str) -> tuple:
        """Pick the llama.cpp release assets for THIS OS + detected GPU backend.

        Returns ``(asset_names, accel)`` — the ordered archives to download (main
        build + any companion cudart) and the acceleration actually chosen
        ('cuda' | 'vulkan' | 'metal' | 'cpu').

        Corrections over the legacy inline logic this replaces:
          * OS-correct extension — ``.zip`` on Windows, ``.tar.gz`` on Linux/macOS.
            The old code hardcoded ``.zip`` everywhere, so every Linux/macOS
            prebuilt download 404'd into a slow build-from-source.
          * Vulkan is the UNIVERSAL GPU fallback — AMD/Intel always use it, and
            NVIDIA falls back to it where no CUDA asset exists for the platform
            (Linux ships NO ``ubuntu-cuda`` prebuilt at all).
          * CUDA version resolved DYNAMICALLY from the assets (12.4 / 13.3 / …),
            preferring the LOWEST (widest GPU-driver compatibility), instead of a
            hardcoded guess that rots when upstream bumps the toolkit.
        """
        gpu = self.gpu_available

        if "windows" in self.os_name:
            cpu = f"llama-{tag_name}-bin-win-cpu-x64.zip"
            vulkan = f"llama-{tag_name}-bin-win-vulkan-x64.zip"
            if gpu == "cuda":
                cuda_assets = sorted(
                    (n for n in asset_map
                     if re.match(rf"^llama-{re.escape(tag_name)}-bin-win-cuda-[\d.]+-x64\.zip$", n)),
                    key=lambda n: tuple(int(x) for x in n.split("cuda-")[1].split("-x64")[0].split(".")))
                if cuda_assets:
                    main = cuda_assets[0]  # lowest CUDA version = widest driver compat
                    out = [main]
                    ver = main.split("cuda-")[1].split("-x64")[0]
                    cudart = f"cudart-llama-bin-win-cuda-{ver}-x64.zip"
                    if cudart in asset_map:
                        out.append(cudart)  # bundled CUDA runtime → turnkey, no toolkit
                    return out, "cuda"
                if vulkan in asset_map:
                    return [vulkan], "vulkan"  # NVIDIA but no CUDA asset → Vulkan
            elif gpu == "vulkan":
                if vulkan in asset_map:
                    return [vulkan], "vulkan"
            return ([cpu], "cpu") if cpu in asset_map else ([], "cpu")

        if "darwin" in self.os_name:
            arch = platform.machine().lower()
            primary = (f"llama-{tag_name}-bin-macos-"
                       f"{'arm64' if arch in ('arm64', 'aarch64') else 'x64'}.tar.gz")
            if primary in asset_map:
                return [primary], "metal"
            alt = f"llama-{tag_name}-bin-macos-arm64.tar.gz"  # x86 → arm64 via Rosetta 2
            if alt in asset_map:
                return [alt], "metal"
            return [], "cpu"

        # Linux — there is NO ubuntu-cuda prebuilt; Vulkan covers every GPU vendor.
        cpu = f"llama-{tag_name}-bin-ubuntu-x64.tar.gz"
        vulkan = f"llama-{tag_name}-bin-ubuntu-vulkan-x64.tar.gz"
        if gpu in ("cuda", "vulkan") and vulkan in asset_map:
            return [vulkan], "vulkan"
        return ([cpu], "cpu") if cpu in asset_map else ([], "cpu")

    @staticmethod
    def _extract_release_archive(archive_path: Path, bin_dir: Path) -> int:
        """Extract a llama.cpp release archive into bin_dir, flattening a single
        top-level directory. Handles BOTH layouts — Windows ``.zip`` and
        Linux/macOS ``.tar.gz`` — because the old zip-only extractor silently
        failed on every Linux/macOS download. Returns the number of files written."""
        import stat as _stat
        name_l = archive_path.name.lower()
        count = 0

        def _flatten_prefix(names: list) -> str:
            for n in names:
                if "/" in n and not n.endswith("/"):
                    return n.split("/")[0] + "/"
            return ""

        def _write(base: str, data: bytes, executable: bool):
            nonlocal count
            if not base:
                return
            dest = bin_dir / base
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(str(dest), 'wb') as dst:
                dst.write(data)
            if sys.platform != "win32" and executable:
                dest.chmod(dest.stat().st_mode | _stat.S_IEXEC)
            count += 1

        if name_l.endswith(".zip"):
            import zipfile
            with zipfile.ZipFile(str(archive_path), 'r') as zf:
                names = [n for n in zf.namelist() if not n.endswith("/")]
                prefix = _flatten_prefix(names)
                for n in names:
                    base = n[len(prefix):] if prefix and n.startswith(prefix) else n
                    with zf.open(n) as src:
                        _write(base, src.read(), not base.lower().endswith(".dll"))
        elif name_l.endswith((".tar.gz", ".tgz", ".tar")):
            import tarfile
            mode = "r:" if name_l.endswith(".tar") else "r:gz"
            with tarfile.open(str(archive_path), mode) as tf:
                files = [m for m in tf.getmembers() if m.isfile()]
                prefix = _flatten_prefix([m.name for m in files])
                for m in files:
                    base = m.name[len(prefix):] if prefix and m.name.startswith(prefix) else m.name
                    src = tf.extractfile(m)
                    if src is None:
                        continue
                    is_lib = base.lower().endswith((".so", ".dylib", ".metal", ".metallib"))
                    _write(base, src.read(), bool(m.mode & 0o111) or not is_lib)
        else:
            logger.error(f"Unsupported archive type: {archive_path.name}")
            archive_path.unlink(missing_ok=True)
            return 0

        archive_path.unlink(missing_ok=True)
        return count

    def try_download_prebuilt(self) -> bool:
        """
        Download the prebuilt llama.cpp build matching THIS OS + detected GPU
        backend from GitHub releases. Returns True on success.

        The OS/GPU → asset mapping lives in _select_release_assets (testable in
        isolation); extraction handles both .zip (Windows) and .tar.gz
        (Linux/macOS) via _extract_release_archive.
        """
        try:
            logger.info("Checking for prebuilt binaries...")

            # Fetch latest release info
            release_url = "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest"
            req = urllib.request.Request(release_url)
            req.add_header('User-Agent', 'Nunba/1.0')

            with urllib.request.urlopen(req, timeout=10) as response:
                release_data = json.loads(response.read().decode())

            tag_name = release_data.get('tag_name')
            if not tag_name:
                return False

            logger.info(f"Latest release: {tag_name}")

            asset_map = {a['name']: a for a in release_data.get('assets', [])}

            # Pick the archives for this OS + GPU backend (correct extension,
            # Vulkan-universal GPU fallback, dynamic CUDA version, cudart runtime).
            assets, accel = self._select_release_assets(asset_map, tag_name)
            if not assets:
                logger.warning(
                    f"No compatible {self.os_name}/{self.gpu_available} asset in "
                    f"release {tag_name}")
                return False
            logger.info(f"Selected {accel} build: {', '.join(assets)}")

            # Create install directory and bin dir
            self.install_dir.mkdir(parents=True, exist_ok=True)
            bin_dir = self.install_dir / "build" / "bin" / "Release"
            bin_dir.mkdir(parents=True, exist_ok=True)

            # Download + extract each archive directly into bin_dir
            total_files = 0
            for asset_name in assets:
                download_url = asset_map[asset_name].get('browser_download_url')
                if not download_url:
                    continue

                logger.info(f"Downloading: {asset_name}")
                archive_path = self.install_dir / asset_name
                self.download_file_with_progress(download_url, archive_path)

                logger.info(f"Extracting: {asset_name}")
                count = self._extract_release_archive(archive_path, bin_dir)
                total_files += count
                logger.info(f"  Extracted {count} files")

            if total_files == 0:
                logger.error("No files extracted from release")
                return False

            # GPU flag follows the acceleration the picker actually chose.
            self.binary_supports_gpu = accel in ("cuda", "vulkan", "metal")
            logger.info(
                f"Installed {accel} llama.cpp ({total_files} files, "
                f"GPU={'yes' if self.binary_supports_gpu else 'no'})")
            return True

        except Exception as e:
            logger.error(f"Prebuilt download failed: {e}")
            return False

    def build_from_source(self) -> bool:
        """
        Build llama.cpp from source (fallback if prebuilt not available)

        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Building llama.cpp from source...")

            # Windows: suppress console windows
            _cf = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0

            # Check for git
            try:
                subprocess.run(["git", "--version"], check=True, capture_output=True, creationflags=_cf)
            except Exception:
                logger.error("Git not found. Please install git to build from source.")
                return False

            # Check for cmake
            try:
                subprocess.run(["cmake", "--version"], check=True, capture_output=True, creationflags=_cf)
            except Exception:
                logger.error("CMake not found. Please install CMake to build from source.")
                return False

            # Clone repository
            if self.install_dir.exists():
                shutil.rmtree(self.install_dir)
            self.install_dir.parent.mkdir(parents=True, exist_ok=True)

            logger.info("Cloning llama.cpp repository...")
            subprocess.run(
                ["git", "clone", "--depth", "1",
                 "https://github.com/ggml-org/llama.cpp",
                 str(self.install_dir)],
                check=True, creationflags=_cf
            )

            # Create build directory
            build_dir = self.install_dir / "build"
            build_dir.mkdir(exist_ok=True)

            # Configure with CMake
            logger.info("Configuring build (CMake)...")
            # Enable the GGML backend for the detected GPU. cuda needs the CUDA
            # toolkit; vulkan needs the Vulkan SDK — both best-effort (this
            # build-from-source path is the LAST resort when no prebuilt matched);
            # cmake fails loudly if the SDK is absent and the caller degrades.
            gpu = self.gpu_available
            cmake_args = [
                "cmake", "..",
                "-DBUILD_SHARED_LIBS=OFF",
                f"-DGGML_CUDA={'ON' if gpu == 'cuda' else 'OFF'}",
                f"-DGGML_VULKAN={'ON' if gpu == 'vulkan' else 'OFF'}",
                "-DLLAMA_CURL=OFF",
                "-DLLAMA_BUILD_SERVER=ON"
            ]

            # Hidden + bounded: a build-from-source is the longest-running spawn
            # in the app, and on Windows it would otherwise pop a console over
            # the frameless UI for the whole duration.  30 min covers a cold
            # CUDA build on a laptop; past that something is wedged and the
            # caller should hear about it rather than hang forever.
            _si, _cf = self._no_window()
            subprocess.run(cmake_args, cwd=build_dir, check=True,
                           startupinfo=_si, creationflags=_cf, timeout=1800)

            # Build
            logger.info("Building llama.cpp (this takes a few minutes)...")
            subprocess.run(
                ["cmake", "--build", ".", "--config", "Release", "-j"],
                cwd=build_dir,
                check=True,
                startupinfo=_si, creationflags=_cf, timeout=1800
            )

            logger.info(f"llama.cpp installed successfully to: {self.install_dir}")
            return True

        except Exception as e:
            logger.error(f"Build from source failed: {e}")
            return False

    def install_llama_cpp(self, progress_callback: Callable[[str], None] | None = None) -> bool:
        """
        Install llama.cpp (try prebuilt first, then build from source)

        Args:
            progress_callback: Optional callback to report progress status messages

        Returns:
            True if successful, False otherwise
        """
        if self.is_installed():
            server_path = self.find_llama_server()
            logger.info(f"llama.cpp is already installed at {server_path}")
            # Detect GPU support across ALL backends (cuda/vulkan/hip/rocm/metal).
            self.binary_supports_gpu = False
            if server_path:
                bin_dir = Path(server_path).parent
                self.binary_supports_gpu = self._binary_has_gpu_support(bin_dir, self.os_name)
                if self.binary_supports_gpu:
                    logger.info("Existing binary has GPU support")
                elif self.gpu_available != "none":
                    # A GPU is present but the installed binary is CPU-only — pull the
                    # matching accelerated build (Vulkan for AMD/Intel, CUDA for
                    # NVIDIA). THIS is the "install the GPU version as it sees fit for
                    # the hardware" self-heal: an old CPU-only install on a GPU box.
                    logger.info(
                        f"GPU available ({self.gpu_available}) but binary is CPU-only "
                        f"— downloading the accelerated build")
                    if progress_callback:
                        progress_callback(f"Upgrading to {self.gpu_available}-enabled build...")
                    if self.try_download_prebuilt():
                        if progress_callback:
                            progress_callback(
                                "GPU build installed!" if self.binary_supports_gpu
                                else "Installed (CPU-only)")
                        return True
                    logger.warning("GPU build download failed, continuing with CPU-only binary")
                else:
                    logger.info("Existing binary is CPU-only (no GPU detected)")
            if progress_callback:
                progress_callback("llama.cpp is already installed")
            return True

        if progress_callback:
            progress_callback("Installing llama.cpp...")

        # Try prebuilt first
        if progress_callback:
            progress_callback("Downloading prebuilt binaries...")

        if self.try_download_prebuilt():
            if progress_callback:
                if self.binary_supports_gpu:
                    progress_callback("llama.cpp installed successfully with GPU support!")
                else:
                    progress_callback("llama.cpp installed successfully (CPU-only)!")
            return True

        # Fall back to building from source
        if progress_callback:
            progress_callback("Prebuilt not available, building from source...")

        if self.build_from_source():
            if progress_callback:
                progress_callback("llama.cpp built successfully!")
            # Assume built from source respects GPU setting
            self.binary_supports_gpu = self.gpu_available != "none"
            return True

        if progress_callback:
            progress_callback("Failed to install llama.cpp")
        return False

    def _find_file_in_dirs(self, file_name: str, min_size: int = 1000) -> Path | None:
        """
        Search for a file in Nunba's models dir, sibling dirs, and HuggingFace Hub cache.

        Search order:
          1. ~/.nunba/models/              (Nunba's own)
          2. ~/.trueflow/models/           (sibling project)
          3. ~/.ollama/models/             (Ollama)
          4. ~/.cache/huggingface/hub/     (HF Hub — models--org--repo/snapshots/hash/file)

        Args:
            file_name: File name to search for
            min_size: Minimum valid file size in bytes (detects corruption)

        Returns:
            Path to the file if found and valid, None otherwise
        """
        # Check Nunba's own models dir first
        local_path = self.models_dir / file_name
        if local_path.exists() and local_path.stat().st_size >= min_size:
            return local_path

        # Check sibling project model directories
        for sibling_dir in SIBLING_MODEL_DIRS:
            if not sibling_dir.exists():
                continue
            sibling_path = sibling_dir / file_name
            if sibling_path.exists() and sibling_path.stat().st_size >= min_size:
                logger.info(f"Found {file_name} in sibling project: {sibling_dir}")
                return sibling_path

        # Check HuggingFace Hub cache (models--org--repo/snapshots/hash/file)
        if _HF_CACHE_DIR.exists():
            try:
                for model_dir in _HF_CACHE_DIR.iterdir():
                    if not model_dir.name.startswith("models--"):
                        continue
                    snapshots_dir = model_dir / "snapshots"
                    if not snapshots_dir.exists():
                        continue
                    for snap_hash in snapshots_dir.iterdir():
                        candidate = snap_hash / file_name
                        if candidate.exists() and candidate.stat().st_size >= min_size:
                            logger.info(f"Found {file_name} in HuggingFace cache: {candidate}")
                            return candidate
            except (PermissionError, OSError) as e:
                logger.debug(f"HF cache scan skipped: {e}")

        return None

    def _find_mmproj_in_dirs(self, preset: ModelPreset) -> Path | None:
        """
        Search for mmproj file, handling model-specific naming variants.
        TrueFlow renames mmproj-F16.gguf to mmproj-{ModelName}-F16.gguf.

        Args:
            preset: Model preset to find mmproj for

        Returns:
            Path to mmproj file if found, None otherwise
        """
        if not preset.mmproj_file:
            return None

        # Search for preset.mmproj_file directly (already model-specific, e.g. mmproj-Qwen3.5-4B-F16.gguf)
        result = self._find_file_in_dirs(preset.mmproj_file)
        if result:
            return result

        # If preset uses a generic name (mmproj-F16.gguf), try model-specific variant
        if preset.mmproj_file == (preset.mmproj_source_file or preset.mmproj_file):
            base = preset.file_name.split("-Instruct")[0].split("-Thinking")[0].split("-UD-")[0]
            base = base.replace('.gguf', '')
            variant_name = preset.mmproj_file.replace("mmproj-", f"mmproj-{base}-")
            if variant_name != preset.mmproj_file:
                result = self._find_file_in_dirs(variant_name)
                if result:
                    logger.info(f"Found model-specific mmproj variant: {variant_name}")
                    return result

        return None

    def is_model_downloaded(self, preset: ModelPreset) -> bool:
        """Check if a model (and its mmproj if needed) is fully downloaded"""
        if not self._find_file_in_dirs(preset.file_name, min_size=100_000_000):
            return False

        # Check mmproj for vision models
        if preset.has_vision and preset.mmproj_file:
            if not self._find_mmproj_in_dirs(preset):
                return False

        return True

    def download_model(
        self,
        preset: ModelPreset,
        progress_callback: Callable[[int, int, str], None] | None = None
    ) -> bool:
        """
        Download a model from HuggingFace

        Args:
            preset: ModelPreset to download
            progress_callback: Optional callback(downloaded_mb, total_mb, status_message)

        Returns:
            True if successful, False otherwise
        """
        try:
            model_path = self.models_dir / preset.file_name

            # Download main model file
            if not model_path.exists():
                model_url = f"https://huggingface.co/{preset.repo_id}/resolve/main/{preset.file_name}"
                logger.info(f"Downloading model: {preset.display_name}")

                def model_progress(downloaded, total):
                    if progress_callback:
                        downloaded_mb = downloaded // (1024 * 1024)
                        total_mb = total // (1024 * 1024)
                        progress_callback(
                            downloaded_mb, total_mb,
                            f"Downloading model... {downloaded_mb}MB / {total_mb}MB")

                self.download_file_with_progress(model_url, model_path, model_progress)

            # Download mmproj for vision models
            if preset.has_vision and preset.mmproj_file:
                # mmproj_file = unique local name (e.g. mmproj-Qwen3.5-4B-F16.gguf)
                # mmproj_source_file = HF name (e.g. mmproj-F16.gguf)
                mmproj_path = self.models_dir / preset.mmproj_file
                if not mmproj_path.exists() and not self._find_mmproj_in_dirs(preset):
                    hf_name = preset.mmproj_source_file or preset.mmproj_file
                    mmproj_url = f"https://huggingface.co/{preset.repo_id}/resolve/main/{hf_name}"
                    logger.info(f"Downloading vision projector: {hf_name} -> {preset.mmproj_file}")

                    def mmproj_progress(downloaded, total):
                        if progress_callback:
                            downloaded_mb = downloaded // (1024 * 1024)
                            total_mb = total // (1024 * 1024)
                            progress_callback(
                                downloaded_mb, total_mb,
                                f"Downloading vision projector... {downloaded_mb}MB / {total_mb}MB")

                    self.download_file_with_progress(mmproj_url, mmproj_path, mmproj_progress)

            logger.info(f"Model downloaded successfully: {preset.display_name}")
            if progress_callback:
                progress_callback(preset.size_mb, preset.size_mb, "Download complete!")
            return True

        except Exception as e:
            logger.error(f"Model download failed: {e}")
            if progress_callback:
                progress_callback(0, 0, f"Download failed: {str(e)}")
            return False

    def get_model_path(self, preset: ModelPreset) -> str | None:
        """Get the full path to a downloaded model.

        Lookup order:
          1. Canonical ``ModelCatalog`` entry by display name — if
             HARTOS has the model registered as installed with a
             ``local_path``, use that.  Catches the case where a
             prior install/import recorded the model in the catalog
             but at a path the legacy filename-walk doesn't search.
          2. Legacy filename walk across Nunba + sibling project
             dirs (~/.nunba, ~/.trueflow, ~/.ollama, HF cache).
             Preserves cross-tool reuse — the catalog doesn't scan
             those dirs itself.

        Completeness validation (applied to BOTH lookup paths):
          - Size ≥ 90% of ``preset.size_mb`` — catches partial
            downloads of large models that the legacy 100 MB floor
            silently accepted (e.g. 4B model at 1.5 GB out of 2.91 GB).
            10% tolerance allows for preset.size_mb estimate drift —
            actual GGUF size vs the registered preset-size sometimes
            varies by 4-7% across quant revisions (live measurement
            2026-05-01: 2776 MB actual vs 2910 MB preset = 95.4%).
          - GGUF magic header (``b'GGUF'`` at offset 0) — catches
            truncated/corrupt files at any size.

        Returns the absolute path string, or None if the model is
        genuinely not on disk anywhere OR is on disk but incomplete.
        """
        # Compute completeness threshold from the preset's expected
        # size, with a 10% tolerance for preset estimate drift and a
        # 100 MB floor for legacy presets that didn't set size_mb.
        expected_bytes = int((preset.size_mb or 100) * 1024 * 1024)
        min_bytes = max(100_000_000, int(expected_bytes * 0.90))

        # 1. Canonical catalog lookup first — single source of truth
        # for "is this model installed?".  Avoids the redundant
        # re-download that hits when filename casing/quant variants
        # don't match the legacy walker (root-cause logged 2026-05-01:
        # wizard re-downloaded Qwen3.5-4B-UD-Q4_K_XL.gguf even though
        # it was already registered + on disk).
        try:
            from models.catalog import ModelType, get_catalog
            catalog = get_catalog()
            entries = catalog.get_models(model_type=ModelType.LLM)
            for entry in entries:
                if entry.display_name != preset.display_name:
                    continue
                local_path = getattr(entry, 'local_path', '') or ''
                if not local_path:
                    continue
                from pathlib import Path as _P
                p = _P(local_path)
                if self._is_gguf_complete(p, min_bytes):
                    return str(p)
        except Exception as e:
            # Catalog unreachable / not yet populated — fall through
            # to legacy walker.  Don't block model lookup on catalog
            # availability.
            logger.debug(f"Catalog lookup skipped, falling back to filename walk: {e}")

        # 2. Legacy filename walk — Nunba + sibling project dirs
        result = self._find_file_in_dirs(preset.file_name, min_size=min_bytes)
        if result and self._is_gguf_complete(result, min_bytes):
            return str(result)
        return None

    @staticmethod
    def _is_gguf_complete(path, min_bytes: int) -> bool:
        """Return True iff `path` exists, is at least `min_bytes`, AND
        starts with the GGUF magic header.

        Combined size + magic check — size catches partial downloads,
        magic catches corruption/wrong-format files.  Cheap (single
        4-byte read).
        """
        try:
            if not path.is_file():
                return False
            if path.stat().st_size < min_bytes:
                return False
            with open(path, 'rb') as fh:
                magic = fh.read(4)
            return magic == b'GGUF'
        except Exception:
            return False

    def get_mmproj_path(self, preset: ModelPreset) -> str | None:
        """Get the full path to a downloaded mmproj file (searches Nunba + sibling dirs)"""
        if preset.has_vision and preset.mmproj_file:
            result = self._find_mmproj_in_dirs(preset)
            return str(result) if result else None
        return None


def install_on_first_run(
    default_model_index: int = 0,
    progress_callback: Callable[[str], None] | None = None
) -> tuple[bool, str | None]:
    """
    Automatically install llama.cpp and default model on first run

    Args:
        default_model_index: Index of model to download from MODEL_PRESETS (default: 0 = recommended)
        progress_callback: Optional callback to report progress

    Returns:
        Tuple of (success: bool, model_path: Optional[str])
    """
    installer = LlamaInstaller()

    # Install llama.cpp
    if not installer.install_llama_cpp(progress_callback):
        return False, None

    # Provision the GPU runtime faster-whisper STT needs, at the SAME first-run
    # moment as the llama.cpp binary — so GPU speech-to-text installs alongside
    # the GPU LLM rather than silently falling back to CPU int8 (not realtime).
    # faster-whisper runs on CTranslate2 (cuBLAS/cuDNN), independent of torch.
    # Best-effort + idempotent: no-ops on CPU boxes and when already installed.
    try:
        from tts.package_installer import (
            has_nvidia_gpu, is_cuda_ctranslate2, install_gpu_ctranslate2,
        )
        if has_nvidia_gpu() and not is_cuda_ctranslate2():
            if progress_callback:
                progress_callback("Installing CUDA runtime for GPU speech-to-text...")
            install_gpu_ctranslate2(progress_cb=progress_callback)
    except Exception as _ct2_err:
        logger.debug(f"GPU ctranslate2 first-run install skipped: {_ct2_err}")

    # Download default model
    if default_model_index < len(MODEL_PRESETS):
        preset = MODEL_PRESETS[default_model_index]

        if progress_callback:
            progress_callback(f"Downloading default model: {preset.display_name}")

        def download_progress(downloaded_mb, total_mb, status):
            if progress_callback:
                progress_callback(status)

        if installer.download_model(preset, download_progress):
            model_path = installer.get_model_path(preset)
            return True, model_path

    return False, None


if __name__ == "__main__":
    # Test installation
    logging.basicConfig(level=logging.INFO)

    def progress(msg):
        print(f"[Progress] {msg}")

    success, model_path = install_on_first_run(progress_callback=progress)
    if success:
        print(f"Installation successful! Model at: {model_path}")
    else:
        print("Installation failed")

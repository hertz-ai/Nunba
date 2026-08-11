"""
ai_installer.py - Unified AI Components Installer for Nunba

Handles installation of all AI components during setup:
- Llama.cpp binary (for local LLM inference)
- LLM model (default: Qwen3.5-4B VL for vision+text)
- Piper TTS voice (for CPU text-to-speech)
- VibeVoice model (optional, for GPU text-to-speech)

Cross-platform support: Windows, macOS, Linux
"""
import argparse
import logging
import platform
import sys
from collections.abc import Callable
from pathlib import Path

logger = logging.getLogger('NunbaAIInstaller')

# Platform detection
IS_WINDOWS = sys.platform == 'win32'
IS_MACOS = sys.platform == 'darwin'
IS_LINUX = sys.platform.startswith('linux')


def get_platform_name() -> str:
    """Get human-readable platform name"""
    if IS_WINDOWS:
        return "Windows"
    elif IS_MACOS:
        return f"macOS ({platform.machine()})"
    elif IS_LINUX:
        return f"Linux ({platform.machine()})"
    return platform.system()


# The llama.cpp CUDA prebuilt binaries are compiled with CUDA 12, which needs an
# NVIDIA driver >= 527.41 on Windows / >= 525.60 on Linux.  An older driver (e.g.
# the 940MX's 2018 417.35 = CUDA 10) CANNOT load a CUDA-12 build — the GPU is
# real, the DRIVER is the blocker.  We detect this so we can (a) keep inference on
# CPU and (b) GUIDE the user to update their driver, instead of silently ignoring
# a usable GPU or crashing trying to load CUDA on an ancient driver.
_CUDA12_MIN_DRIVER_WIN = 527.41
_NVIDIA_DRIVER_URL = "https://www.nvidia.com/Download/index.aspx"


def _win_nvidia_driver_number(driver_version):
    """Decode a Win32 NVIDIA driver string ('25.21.14.1735') to the real driver
    number (417.35) — the last 5 digits are 'XXXYY' -> XXX.YY.  None if unparseable."""
    import re
    digits = re.sub(r"\D", "", driver_version or "")
    if len(digits) < 5:
        return None
    last5 = digits[-5:]
    try:
        return float(f"{last5[:3]}.{last5[3:]}")
    except ValueError:
        return None


def _gpu_driver_guidance(gpu_name, driver_desc, cuda_desc):
    return (f"{gpu_name or 'Your NVIDIA GPU'} is detected, but its driver "
            f"({driver_desc}) supports only {cuda_desc} — too old for GPU "
            f"acceleration (a CUDA 12 driver is required). Running on CPU for now. "
            f"Update your NVIDIA driver to enable GPU acceleration: {_NVIDIA_DRIVER_URL}")


def _nvidia_cuda_readiness(gpu_name):
    """Is the installed NVIDIA driver new enough to LOAD a CUDA-12 llama.cpp build?

    Returns (ok: bool, driver_str: str|None, guidance: str|None).  Prefers
    nvidia-smi (Linux/HART OS + any box that has it, which reports the max CUDA
    directly); falls back to decoding the Windows WMI driver version.  When it
    genuinely cannot tell, returns (False, None, None) — conservative (stay on
    CPU) but WITHOUT nagging the user about an unknown.
    """
    import subprocess
    # nvidia-smi: authoritative "CUDA Version: X.Y" (the max the driver supports).
    try:
        cf = getattr(subprocess, "CREATE_NO_WINDOW", 0) if IS_WINDOWS else 0
        out = subprocess.run(["nvidia-smi"], capture_output=True, text=True,
                             timeout=6, creationflags=cf)
        if out.returncode == 0 and out.stdout:
            import re
            mc = re.search(r"CUDA Version:\s*([0-9]+)\.([0-9]+)", out.stdout)
            md = re.search(r"Driver Version:\s*([0-9.]+)", out.stdout)
            drv = md.group(1) if md else None
            if mc:
                ok = int(mc.group(1)) >= 12
                g = None if ok else _gpu_driver_guidance(
                    gpu_name, drv or "installed", f"CUDA {mc.group(1)}.{mc.group(2)}")
                return ok, drv, g
    except Exception:
        pass
    # Windows fallback: decode the WMI driver version → driver number → CUDA era.
    if IS_WINDOWS:
        try:
            cf = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            ps = subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "(Get-CimInstance Win32_VideoController | "
                 "Where-Object {$_.Name -match 'NVIDIA'} | "
                 "Select-Object -First 1).DriverVersion"],
                capture_output=True, text=True, timeout=8, creationflags=cf)
            drvnum = _win_nvidia_driver_number((ps.stdout or "").strip())
            if drvnum:
                ok = drvnum >= _CUDA12_MIN_DRIVER_WIN
                g = None if ok else _gpu_driver_guidance(
                    gpu_name, f"{drvnum:.2f}",
                    "CUDA 10/11" if drvnum >= 411 else "an old CUDA")
                return ok, f"{drvnum:.2f}", g
        except Exception:
            pass
    return False, None, None


def _win_gpu_vram_gb_from_registry() -> float:
    """Best-effort TRUE VRAM (GB) for the largest display adapter via the
    Windows registry HardwareInformation.qwMemorySize — a 64-bit value that,
    unlike WMI Win32_VideoController.AdapterRAM, does NOT wrap at 4 GB.

    Returns the largest adapter memory found, or 0.0 when unavailable.  Pure
    read, never raises.  Used only as a FLOOR by the WMI fallback below when
    AdapterRAM under-reports (nvidia-smi absent + >=4 GB card = M2 bug).
    """
    if not IS_WINDOWS:
        return 0.0
    try:
        import winreg
    except Exception:
        return 0.0
    best_bytes = 0
    roots = (
        r"SYSTEM\CurrentControlSet\Control\Video",
        r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}",
    )
    for root in roots:
        try:
            base = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, root)
        except OSError:
            continue
        try:
            i = 0
            while True:
                try:
                    sub = winreg.EnumKey(base, i)
                except OSError:
                    break
                i += 1
                for leaf in (sub + r"\0000", sub):
                    try:
                        k = winreg.OpenKey(base, leaf)
                    except OSError:
                        continue
                    try:
                        for val_name in ("HardwareInformation.qwMemorySize",
                                         "HardwareInformation.MemorySize"):
                            try:
                                v, _t = winreg.QueryValueEx(k, val_name)
                            except OSError:
                                continue
                            if isinstance(v, bytes):
                                v = int.from_bytes(v, "little") if v else 0
                            try:
                                v = int(v)
                            except (TypeError, ValueError):
                                v = 0
                            if v > best_bytes:
                                best_bytes = v
                    finally:
                        k.Close()
        finally:
            base.Close()
    return round(best_bytes / (1024 ** 3), 1) if best_bytes else 0.0


def detect_gpu() -> dict:
    """
    Detect GPU availability + type for THIS machine.

    Backend detection is DELEGATED to the canonical llama_installer detector
    (DRY — one place knows NVIDIA→cuda / AMD·Intel→vulkan / Apple→metal); this
    wrapper adds the VRAM + GPU name the TTS hardware-tiering reads.

    Returns: {available: bool, type: 'cuda'|'vulkan'|'metal'|'none',
              name: str|None, vram_gb: float}

    NOTE: the GPU-TTS engines + faster-whisper CUDA runtime are torch/CTranslate2
    CUDA-only; their install steps self-gate on an ACTUAL NVIDIA GPU
    (has_nvidia_gpu()), so a 'vulkan' AMD box reports available=True for accurate
    status yet never pulls CUDA wheels — and vram_gb stays 0 there, keeping it on
    the CPU TTS tier (correct: those engines can't use a non-NVIDIA GPU anyway).
    """
    result = {"available": False, "type": "none", "name": None, "vram_gb": 0}

    try:
        from llama_installer import LlamaInstaller
        backend = LlamaInstaller.detect_backend()
    except Exception as e:
        logger.debug(f"GPU backend detection failed: {e}")
        backend = "none"

    if backend == "metal":
        result["available"] = True
        result["type"] = backend
        result["name"] = "Apple Silicon (Metal)" if platform.machine() == "arm64" else "Metal"
        return result

    if backend == "cuda":
        result["available"] = True
        result["type"] = backend
        # Pull the exact NVIDIA name + VRAM — drives model sizing + TTS tiering.
        try:
            import subprocess
            # ONE source for the hide flags (was an inline copy — see
            # tests/test_hidden_subprocess_single_source.py).
            from desktop.platform_utils import get_subprocess_flags
            _flags = get_subprocess_flags()
            si = _flags.get('startupinfo')
            cf = _flags.get('creationflags', 0)
            check = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                capture_output=True, text=True, timeout=5,
                startupinfo=si, creationflags=cf)
            if check.returncode == 0 and check.stdout.strip():
                parts = check.stdout.strip().split(",")
                result["name"] = parts[0].strip()
                if len(parts) > 1:
                    vram_str = parts[1].strip()  # e.g. "8192 MiB"
                    if "MiB" in vram_str:
                        result["vram_gb"] = int(vram_str.replace("MiB", "").strip()) / 1024
                    elif "GiB" in vram_str:
                        result["vram_gb"] = float(vram_str.replace("GiB", "").strip())
        except Exception as e:
            logger.debug(f"CUDA VRAM probe failed: {e}")

    # ── WMI fallback (Windows) ──────────────────────────────────────────
    # nvidia-smi ships with the CUDA/driver package and is OFTEN ABSENT on
    # consumer laptops (or the driver is too old to install it) — so the
    # backend detector above returns "none"/no-VRAM even though a real NVIDIA
    # GPU is present (the 940MX case: detect said no-GPU, everything fell to
    # CPU).  Win32_VideoController always enumerates the physical adapters, so
    # use it to (a) find an NVIDIA/AMD/Intel GPU the CUDA probe missed and
    # (b) fill VRAM from AdapterRAM when nvidia-smi didn't.  AdapterRAM is a
    # 32-bit value that UNDER-reports cards >4 GB (wraps), so treat it as a
    # FLOOR, never letting it shrink a good nvidia-smi reading.
    if IS_WINDOWS and (not result["available"] or not result["vram_gb"]):
        try:
            import subprocess as _sp
            _cf = _sp.CREATE_NO_WINDOW if IS_WINDOWS else 0
            ps = _sp.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-CimInstance Win32_VideoController | "
                 "Select-Object Name,AdapterRAM | ConvertTo-Json -Compress"],
                capture_output=True, text=True, timeout=8, creationflags=_cf)
            if ps.returncode == 0 and ps.stdout.strip():
                import json as _json
                data = _json.loads(ps.stdout)
                if isinstance(data, dict):
                    data = [data]
                # Prefer a discrete NVIDIA/AMD GPU over the Intel iGPU.
                def _rank(g):
                    n = (g.get("Name") or "").lower()
                    return (2 if ("nvidia" in n or "geforce" in n or "rtx" in n
                                  or "quadro" in n) else
                            1 if ("amd" in n or "radeon" in n) else 0)
                best = max(data, key=_rank) if data else None
                if best:
                    n = (best.get("Name") or "").lower()
                    is_nv = ("nvidia" in n or "geforce" in n or "rtx" in n
                             or "quadro" in n)
                    if not result["name"]:
                        result["name"] = best.get("Name")
                    if not result["type"] or result["type"] == "none":
                        result["type"] = "cuda" if is_nv else "vulkan"
                    result["available"] = True
                    ram = best.get("AdapterRAM") or 0
                    wmi_vram = round(ram / (1024 ** 3), 1) if ram and ram > 0 else 0
                    # AdapterRAM is a 32-bit field that wraps (or reports a
                    # negative) for >=4 GB cards, zeroing a real discrete GPU.
                    # Fall back to the 64-bit registry qwMemorySize so a
                    # >=4 GB card isn't forced to CPU by a wrapped reading (M2).
                    if wmi_vram < 4.0:
                        reg_vram = _win_gpu_vram_gb_from_registry()
                        if reg_vram > wmi_vram:
                            wmi_vram = reg_vram
                    if wmi_vram and wmi_vram > result["vram_gb"]:
                        result["vram_gb"] = wmi_vram
                    logger.info("detect_gpu WMI fallback: %s, vram=%.1fGB (nvidia-smi absent)",
                                result["name"], result["vram_gb"])
        except Exception as e:
            logger.debug(f"WMI GPU probe failed: {e}")

    if not result["available"] and backend not in ("none",):
        # backend said GPU but we couldn't name it — still report it present.
        result["available"] = True
        result["type"] = backend
        result["name"] = result["name"] or "GPU"

    # ── Driver adequacy + user guidance (detect-and-guide, not silent-upgrade) ──
    # A real NVIDIA GPU on a too-old driver can't load a CUDA-12 llama.cpp build,
    # so we flag it: inference stays on CPU and `gpu_guidance` tells the user how
    # to unlock the GPU (update the driver).  metal / vulkan / no-GPU never hit
    # the CUDA-driver gate, so they default to ok.
    result["driver_cuda_ok"] = True
    result["driver_version"] = None
    result["gpu_guidance"] = None
    if result["available"] and result["type"] == "cuda":
        ok, drv, guidance = _nvidia_cuda_readiness(result["name"])
        result["driver_cuda_ok"] = ok
        result["driver_version"] = drv
        result["gpu_guidance"] = guidance
        if not ok:
            result["inference"] = "cpu"   # GPU real, driver too old → CPU
            if guidance:
                logger.info("GPU present but driver too old for CUDA — %s", guidance)

    if result["type"] == "vulkan" and not result["name"]:
        result["name"] = "AMD/Intel GPU (Vulkan)"
    return result


class AIInstaller:
    """
    Unified installer for all Nunba AI components.

    Handles:
    - Llama.cpp binary installation
    - LLM model downloading
    - TTS voice/model installation
    """

    def __init__(self,
                 base_dir: str | None = None,
                 progress_callback: Callable[[str, int], None] | None = None):
        """
        Initialize AI installer.

        Args:
            base_dir: Base directory for AI components (default: ~/.nunba)
            progress_callback: Optional callback(status_message, percent_complete)
        """
        self.base_dir = Path(base_dir) if base_dir else Path.home() / ".nunba"
        self.base_dir.mkdir(parents=True, exist_ok=True)

        self.progress_callback = progress_callback
        self.gpu_info = detect_gpu()

        # Component directories
        self.llama_dir = self.base_dir / "llama.cpp"
        self.models_dir = self.base_dir / "models"
        self.tts_dir = self.base_dir / "tts"
        self.piper_dir = self.tts_dir / "piper"
        self.vibevoice_dir = self.tts_dir / "vibevoice"
        self.tts_models_dir = self.base_dir / "models" / "tts"

    def _select_model_for_compute(self):
        """Pick the largest LLM preset that actually fits THIS machine.

        Replaces the old hardcoded ``MODEL_PRESETS[0]`` (the 4B, "GPU >=4GB
        VRAM") which dead-ended as "no compatible model found" on low-VRAM /
        CPU boxes (the 940MX / 8GB case).  Sizes by VRAM when a usable GPU is
        present, else by CPU capability — and NEVER returns nothing: the
        smallest preset (0.8B, "runs on anything") is the floor.
        """
        from llama_installer import MODEL_PRESETS  # local import (same as install_all)
        try:
            import psutil
            ram_gb = psutil.virtual_memory().total / (1024 ** 3)
            cores = psutil.cpu_count(logical=False) or psutil.cpu_count() or 2
        except Exception:
            ram_gb, cores = 8.0, 2
        vram = float(self.gpu_info.get("vram_gb", 0) or 0)
        driver_ok = self.gpu_info.get("driver_cuda_ok", True)
        # Treat the GPU as usable for INFERENCE only when it has >=4GB VRAM AND a
        # CUDA-12-capable driver.  A too-old driver (e.g. the 940MX's 2018 417.35)
        # can't load a CUDA build at all, so inference stays on CPU regardless of
        # VRAM (detect_gpu already surfaced the "update your driver" guidance).
        has_gpu = bool(self.gpu_info.get("available")) and vram >= 4.0 and driver_ok

        by_size = sorted(MODEL_PRESETS, key=lambda p: p.size_mb)  # 0.8B -> 35B

        def _find(frag):
            for p in by_size:
                if frag in p.display_name:
                    return p
            return None

        if has_gpu:
            # Largest preset whose weights fit VRAM with ~1.5GB KV/context head.
            budget_mb = max(0.0, vram - 1.5) * 1024
            chosen = by_size[0]
            for p in by_size:
                if p.size_mb <= budget_mb:
                    chosen = p
            why = f"GPU {vram:.1f}GB VRAM"
        else:
            # No usable GPU -> CPU.  A big model may FIT RAM yet be unusably slow
            # on a weak CPU, so size by CAPABILITY: small/old box -> 0.8B.
            if cores <= 4 or ram_gb < 12:
                chosen = _find("0.8B") or by_size[0]
            elif ram_gb < 24:
                chosen = _find("2B VL") or _find("2B") or by_size[0]
            else:
                chosen = _find("4B") or by_size[-1]
            if vram and not driver_ok:
                gpu_note = (f"; GPU {vram:.1f}GB present but its driver is too old "
                            f"for CUDA — update the driver to use it")
            elif vram:
                gpu_note = f"; GPU {vram:.1f}GB present but <4GB, inference stays on CPU"
            else:
                gpu_note = ""
            why = f"CPU ({cores} cores, {ram_gb:.0f}GB RAM){gpu_note}"

        logger.info("Selected LLM preset '%s' (%.0fMB) for compute: %s",
                    chosen.display_name, chosen.size_mb, why)
        return chosen

    def _report_progress(self, message: str, percent: int = 0):
        """Report progress to callback and logger"""
        logger.info(f"[{percent}%] {message}")
        if self.progress_callback:
            self.progress_callback(message, percent)
        else:
            print(f"  [{percent:3d}%] {message}")

    def install_llama(self,
                      force_reinstall: bool = False,
                      skip_model: bool = False) -> tuple[bool, str]:
        """
        Install llama.cpp binary and default model.

        Args:
            force_reinstall: Force reinstall even if already present
            skip_model: Skip model download (binary only)

        Returns:
            Tuple of (success, message)
        """
        try:
            from llama_config import initialize_llama_on_first_run
            from llama_installer import MODEL_PRESETS, LlamaInstaller

            self._report_progress("Checking llama.cpp installation...", 5)

            installer = LlamaInstaller(
                install_dir=str(self.llama_dir),
                models_dir=str(self.models_dir)
            )

            # Check if already installed
            existing = installer.find_llama_server()
            if existing and not force_reinstall:
                self._report_progress(f"Llama.cpp already installed: {existing}", 10)
            else:
                self._report_progress("Downloading llama.cpp binary...", 15)

                # install_llama_cpp takes a STATUS-MESSAGE callback
                # (Callable[[str], None]), NOT (downloaded, total).  The old
                # `installer.download_and_install(...)` referenced a method that
                # does NOT exist on LlamaInstaller, so the LLM binary install
                # ALWAYS failed ("no attribute 'download_and_install'") — which
                # is why auto-setup never produced a llama-server / model.
                success = installer.install_llama_cpp(
                    lambda m: self._report_progress(str(m), 30))
                if not success:
                    return False, "Failed to install llama.cpp binary"

                self._report_progress("Llama.cpp binary installed", 40)

            # Download model
            if not skip_model:
                self._report_progress("Checking LLM model...", 45)

                # Compute-aware pick (was hardcoded MODEL_PRESETS[0] = the 4B,
                # which needs GPU >=4GB VRAM and dead-ended as "no compatible
                # model" on low-VRAM / CPU boxes).  Picks the largest preset that
                # fits THIS machine; floor is the 0.8B ("runs on anything").
                default_model = self._select_model_for_compute()
                model_path = self.models_dir / default_model.file_name

                if model_path.exists() and not force_reinstall:
                    self._report_progress(f"Model already exists: {default_model.display_name}", 50)
                else:
                    self._report_progress(f"Downloading model: {default_model.display_name}...", 50)

                    def model_progress(dl_mb, total_mb, status=""):
                        # download_model reports MB (not bytes) + a status string
                        # (Callable[[int, int, str]]).  The old 2-arg callback +
                        # (repo_id, file_name, cb) call had the wrong signature.
                        pct = 50 + (int(dl_mb / total_mb * 30) if total_mb else 0)
                        self._report_progress(
                            f"Downloading {default_model.display_name}: "
                            f"{dl_mb}MB / {total_mb}MB", pct)

                    # download_model takes (preset, callback) and fetches the
                    # vision mmproj for the preset ITSELF — no separate call.
                    success = installer.download_model(default_model, model_progress)

                    if not success:
                        return False, f"Failed to download model: {default_model.display_name}"

                # Qwen3.5-0.8B caption / draft model — dedicated llama-server
                # on port 8081 used by VisionService (live frame captioning,
                # 1s/frame) and as the speculative draft for the main 4B.
                # Non-fatal: if this fails, vision falls back to MiniCPM /
                # mobilevlm / clip via lightweight_backend; draft-first chat
                # just uses the main 4B standalone.
                try:
                    from llama_installer import MODEL_PRESETS as _MP
                    _p08 = next((p for p in _MP if "0.8B" in p.display_name), None)
                    # Skip if the 0.8B IS the main model just downloaded above.
                    if _p08 and _p08.display_name != default_model.display_name:
                        _qwen08b_path = self.models_dir / _p08.file_name
                        if _qwen08b_path.exists() and not force_reinstall:
                            self._report_progress(
                                "Qwen3.5-0.8B (vision + draft) already present", 83)
                        else:
                            self._report_progress(
                                "Downloading Qwen3.5-0.8B (vision + draft, ~750MB)...", 83)
                            # download_model(preset) — fetches weights + mmproj.
                            if not installer.download_model(_p08):
                                logger.warning(
                                    "Qwen3.5-0.8B download failed — vision will fall "
                                    "back to MiniCPM; draft-first chat uses the main model")
                except Exception as _qe:
                    logger.warning(f"Qwen3.5-0.8B step non-fatal error: {_qe}")

            self._report_progress("Llama.cpp installation complete", 85)
            return True, "Llama.cpp and model installed successfully"

        except ImportError as e:
            return False, f"Llama installer module not available: {e}"
        except Exception as e:
            logger.error(f"Llama installation failed: {e}")
            return False, str(e)

    def install_tts(self,
                    force_reinstall: bool = False,
                    include_vibevoice: bool = None) -> tuple[bool, str]:
        """
        Install TTS components — pip packages + model weights for this hardware tier.
        Nothing should need downloading after installation.

        Hardware tiers:
          Potato (no GPU):  Piper voice (CPU ONNX, ~20MB)
          Medium (4-8GB):   Indic Parler + Chatterbox Turbo + CosyVoice3
          High-end (16+GB): Same as medium (all engines fit comfortably)

        Installs BOTH pip packages (into python-embed) AND model weights.
        """
        results = []
        self.tts_models_dir.mkdir(parents=True, exist_ok=True)

        has_gpu = self.gpu_info.get("available", False)
        vram = self.gpu_info.get("vram_gb", 0)

        # Step 0: Upgrade to CUDA torch if GPU available but torch is CPU-only
        if has_gpu:
            try:
                from tts.package_installer import install_gpu_torch
                self._report_progress("Checking PyTorch CUDA support...", 85)
                cuda_ok, cuda_msg = install_gpu_torch(
                    progress_cb=lambda msg: self._report_progress(msg, 85))
                results.append(("CUDA PyTorch", cuda_ok, cuda_msg))
            except Exception as e:
                logger.warning(f"CUDA torch check skipped: {e}")

            # Step 0b: Install the CUDA runtime faster-whisper (CTranslate2)
            # needs for GPU STT.  Separate from torch — faster-whisper runs on
            # CTranslate2, which dlopens cuBLAS/cuDNN, not torch.  Best-effort:
            # never blocks setup; on failure STT stays on CPU int8.
            try:
                from tts.package_installer import install_gpu_ctranslate2
                self._report_progress("Checking speech-to-text GPU support...", 85)
                ct2_ok, ct2_msg = install_gpu_ctranslate2(
                    progress_cb=lambda msg: self._report_progress(msg, 85))
                results.append(("CUDA ctranslate2 (STT)", ct2_ok, ct2_msg))
            except Exception as e:
                logger.warning(f"CUDA ctranslate2 check skipped: {e}")

        # 1. Piper voice — always pre-download (CPU fallback, ~20MB)
        self._report_progress("Setting up Piper TTS voice (CPU fallback)...", 86)
        p_ok, p_msg = self._install_piper_voice(force_reinstall)
        results.append(("Piper TTS", p_ok, p_msg))

        # 2. Indic Parler TTS — pip packages + model weights (works on CPU too)
        self._report_progress("Setting up Indic Parler TTS (21 languages)...", 87)
        ip_ok, ip_msg = self._install_backend_full('indic_parler', force_reinstall, 87)
        results.append(("Indic Parler TTS", ip_ok, ip_msg))

        # 3. Chatterbox Turbo — English with [laugh]/[chuckle], needs 6GB VRAM
        if has_gpu and vram >= 6:
            self._report_progress("Setting up Chatterbox Turbo (English)...", 90)
            cb_ok, cb_msg = self._install_backend_full('chatterbox_turbo', force_reinstall, 90)
            results.append(("Chatterbox Turbo", cb_ok, cb_msg))

        # 4. CosyVoice3 — 9 international languages, needs 4GB VRAM
        if has_gpu and vram >= 4:
            self._report_progress("Setting up CosyVoice3 (international)...", 93)
            cv_ok, cv_msg = self._install_backend_full('cosyvoice3', force_reinstall, 93)
            results.append(("CosyVoice3", cv_ok, cv_msg))

        # F5-TTS skipped — voice cloning is niche, downloads lazily on first use

        all_success = all(r[1] for r in results)
        messages = [f"{r[0]}: {r[2]}" for r in results]
        return all_success, "; ".join(messages)

    def _install_backend_full(self, backend: str, force_reinstall: bool,
                               percent: int) -> tuple[bool, str]:
        """Install pip packages + model weights for a TTS backend."""
        try:
            from tts.package_installer import install_backend_full
            ok, msg = install_backend_full(
                backend,
                progress_cb=lambda m: self._report_progress(m, percent),
            )
            return ok, msg
        except Exception as e:
            logger.warning(f"Backend {backend} full install failed: {e}")
            # Fall back to model-weights-only install
            return self._install_model_weights_only(backend, force_reinstall)

    def _install_model_weights_only(self, backend: str,
                                     force_reinstall: bool = False) -> tuple[bool, str]:
        """Fallback: download model weights only (when package_installer unavailable)."""
        try:
            from tts.package_installer import _download_model_weights
            return _download_model_weights(
                backend,
                progress_cb=lambda m: self._report_progress(m, 90),
            )
        except Exception as e:
            logger.warning(f"Model weight download failed for {backend}: {e}")
            return True, f"Will download on first use ({e})"

    def _install_piper_voice(self, force_reinstall: bool = False) -> tuple[bool, str]:
        """Pre-download default Piper voice (CPU fallback, ~20MB)."""
        try:
            from tts.piper_tts import DEFAULT_VOICE, PiperTTS
            tts = PiperTTS()
            if tts.is_voice_installed(DEFAULT_VOICE) and not force_reinstall:
                return True, "Already downloaded"
            self._report_progress(f"Downloading Piper voice: {DEFAULT_VOICE}...", 86)
            ok = tts.download_voice(DEFAULT_VOICE)
            return ok, "Voice downloaded" if ok else "Download failed (will retry on first use)"
        except Exception as e:
            logger.warning(f"Piper voice pre-download failed: {e}")
            return True, f"Will download on first use ({e})"


    def install_all(self,
                    skip_llama: bool = False,
                    skip_tts: bool = False,
                    skip_vibevoice: bool = False,
                    force_reinstall: bool = False,
                    skip_endpoint_scan: bool = False) -> tuple[bool, dict]:
        """
        Install all AI components — auto-downloads models based on hardware.

        LLM: Scans for existing endpoints first, then installs llama.cpp + model.
        TTS: Installs Indic Parler (all), Chatterbox/CosyVoice3/F5 (if GPU fits).
        STT: Pre-downloads faster-whisper model (CTranslate2, auto-selects by hardware).

        Args:
            skip_llama: Skip llama.cpp installation
            skip_tts: Skip TTS installation
            skip_vibevoice: Ignored (kept for backward compatibility)
            force_reinstall: Force reinstall all components
            skip_endpoint_scan: Skip scanning for existing endpoints

        Returns:
            Tuple of (overall_success, results_dict)
        """
        self._report_progress(f"Starting AI components installation on {get_platform_name()}", 0)
        self._report_progress(f"GPU: {self.gpu_info['name'] or 'Not detected'}", 2)

        # Detect-and-guide: if a real GPU is present but its driver is too old for
        # a CUDA build, surface the "update your driver" guidance to the user (we
        # run on CPU meanwhile — never a silent driver replacement).
        _gpu_guidance = self.gpu_info.get("gpu_guidance")
        if _gpu_guidance:
            self._report_progress(_gpu_guidance, 3)

        results = {
            "platform": get_platform_name(),
            "gpu": self.gpu_info,
            "gpu_guidance": _gpu_guidance,
            "components": {},
            "external_llm": None
        }

        # First, scan for existing LLM endpoints (unless skipped or force_reinstall)
        if not skip_llama and not force_reinstall and not skip_endpoint_scan:
            self._report_progress("Scanning for existing AI endpoints...", 5)
            try:
                from llama_config import LlamaConfig, scan_existing_llm_endpoints, scan_openai_compatible_ports

                existing = scan_existing_llm_endpoints()
                if not existing:
                    existing = scan_openai_compatible_ports()

                if existing:
                    self._report_progress(f"Found existing AI: {existing['name']}", 10)
                    results["external_llm"] = existing
                    results["components"]["llama"] = {
                        "success": True,
                        "message": f"Using existing LLM: {existing['name']} at {existing['base_url']}",
                        "skipped": True
                    }

                    # Save to config
                    config = LlamaConfig()
                    config.config["external_llm_endpoint"] = existing
                    config.config["use_external_llm"] = True
                    config._save_config()

                    skip_llama = True  # Skip llama installation
                    self._report_progress(f"Will use {existing['name']} for AI chat", 45)
            except Exception as e:
                logger.debug(f"Endpoint scan failed: {e}")
                # Continue with normal installation

        # Install llama.cpp (if no existing endpoint found)
        if not skip_llama:
            success, msg = self.install_llama(force_reinstall)
            results["components"]["llama"] = {"success": success, "message": msg}

        # Install TTS engines (auto-selects based on hardware)
        if not skip_tts:
            success, msg = self.install_tts(force_reinstall)
            results["components"]["tts"] = {"success": success, "message": msg}

        # Pre-warm STT model (faster-whisper base, CPU int8)
        self._report_progress("Checking STT (faster-whisper)...", 90)
        try:
            from integrations.service_tools.whisper_tool import _get_faster_whisper_model
            self._report_progress("Pre-downloading STT model: base", 92)
            _get_faster_whisper_model("base")
            results["components"]["stt"] = {
                "success": True,
                "message": "faster-whisper base ready",
            }
        except ImportError:
            self._report_progress("faster-whisper not installed — STT will use fallback", 95)
            results["components"]["stt"] = {
                "success": True,
                "message": "STT: faster-whisper not installed, will use fallback on first use",
            }
        except Exception as e:
            logger.warning(f"STT pre-download failed (will auto-download on first use): {e}")
            results["components"]["stt"] = {
                "success": True,
                "message": f"STT model will auto-download on first use ({e})",
            }

        self._report_progress("AI components installation complete!", 100)

        # Overall success
        overall = all(
            c.get("success", True)
            for c in results["components"].values()
        )

        return overall, results

    def get_status(self) -> dict:
        """
        Get status of all AI components.

        Returns:
            Dict with component statuses
        """
        status = {
            "platform": get_platform_name(),
            "gpu": self.gpu_info,
            "components": {
                "llama": {"installed": False, "path": None, "model": None},
                "tts": {"installed": False, "engines": [], "languages": 0},
                "stt": {"installed": False, "engine": None},
            }
        }

        # Check llama.cpp
        try:
            from llama_installer import LlamaInstaller
            installer = LlamaInstaller(str(self.llama_dir), str(self.models_dir))
            server = installer.find_llama_server()
            if server:
                status["components"]["llama"]["installed"] = True
                status["components"]["llama"]["path"] = server
                if self.models_dir.exists():
                    models = list(self.models_dir.glob("*.gguf"))
                    if models:
                        status["components"]["llama"]["model"] = models[0].name
        except Exception as e:
            logger.debug(f"Llama status check failed: {e}")

        # Check TTS engines
        try:
            from tts.tts_engine import ENGINE_CAPABILITIES
            engines = []
            all_langs = set()
            for backend, cap in ENGINE_CAPABILITIES.items():
                engines.append({
                    "name": cap["name"],
                    "languages": len(cap.get("languages", set())),
                    "vram_gb": cap.get("vram_gb", 0),
                })
                all_langs.update(cap.get("languages", set()))
            status["components"]["tts"]["installed"] = True
            status["components"]["tts"]["engines"] = engines
            status["components"]["tts"]["languages"] = len(all_langs)
        except Exception as e:
            logger.debug(f"TTS status check failed: {e}")

        # Check STT (faster-whisper)
        try:
            import faster_whisper  # noqa: F401
            status["components"]["stt"]["installed"] = True
            status["components"]["stt"]["engine"] = "faster-whisper"
        except ImportError:
            try:
                import sherpa_onnx  # noqa: F401
                status["components"]["stt"]["installed"] = True
                status["components"]["stt"]["engine"] = "sherpa-onnx"
            except ImportError:
                pass

        return status


def install_ai_components(progress_callback: Callable | None = None,
                          skip_vibevoice: bool = False) -> bool:
    """
    Convenience function to install all AI components.

    Args:
        progress_callback: Optional progress callback(message, percent)
        skip_vibevoice: Skip VibeVoice installation

    Returns:
        True if all components installed successfully
    """
    installer = AIInstaller(progress_callback=progress_callback)
    success, results = installer.install_all(skip_vibevoice=skip_vibevoice)
    return success


def main():
    """Command-line interface for AI installer"""
    parser = argparse.ArgumentParser(
        description="Nunba AI Components Installer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ai_installer.py              Install all AI components
  python ai_installer.py --status     Show installation status
  python ai_installer.py --llama-only Install only llama.cpp + model
  python ai_installer.py --tts-only   Install only TTS components
  python ai_installer.py --force      Force reinstall all components
"""
    )

    parser.add_argument("--status", action="store_true",
                        help="Show installation status and exit")
    parser.add_argument("--llama-only", action="store_true",
                        help="Install only llama.cpp and model")
    parser.add_argument("--tts-only", action="store_true",
                        help="Install only TTS components")
    parser.add_argument("--skip-vibevoice", action="store_true",
                        help="Skip VibeVoice (GPU TTS) installation")
    parser.add_argument("--skip-model", action="store_true",
                        help="Skip LLM model download (binary only)")
    parser.add_argument("--force", action="store_true",
                        help="Force reinstall even if already installed")
    parser.add_argument("--quiet", action="store_true",
                        help="Minimal output")

    args = parser.parse_args()

    # Setup logging
    if not args.quiet:
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s"
        )

    installer = AIInstaller()

    # Status check
    if args.status:
        print("\n" + "=" * 60)
        print("  Nunba AI Components Status")
        print("=" * 60)

        status = installer.get_status()
        print(f"\n  Platform: {status['platform']}")
        print(f"  GPU: {status['gpu']['name'] or 'Not detected'}")

        print("\n  Components:")
        for name, info in status["components"].items():
            installed = "YES" if info["installed"] else "NO"
            details = ""
            if info.get("path"):
                details = f" ({info['path']})"
            elif info.get("voice"):
                details = f" ({info['voice']})"
            elif info.get("model"):
                details = f" ({info['model']})"
            print(f"    - {name}: {installed}{details}")

        print("\n" + "=" * 60)
        return 0

    # Installation
    print("\n" + "=" * 60)
    print("  Nunba AI Components Installer")
    print("  Cross-platform AI setup for offline capabilities")
    print("=" * 60 + "\n")

    skip_llama = args.tts_only
    skip_tts = args.llama_only

    success, results = installer.install_all(
        skip_llama=skip_llama,
        skip_tts=skip_tts,
        skip_vibevoice=args.skip_vibevoice,
        force_reinstall=args.force
    )

    # Print results
    print("\n" + "=" * 60)
    if success:
        print("  Installation Complete!")
    else:
        print("  Installation completed with some issues")
    print("=" * 60)

    for component, info in results.get("components", {}).items():
        status = "OK" if info["success"] else "FAILED"
        print(f"  {component}: {status} - {info['message']}")

    print("=" * 60 + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

"""Auto-install the RIGHT llama.cpp build for the hardware — variant-picker matrix.

Guards LlamaInstaller._select_release_assets (the OS+GPU → release-asset mapping)
and the supporting detector/extractor, which together implement "Nunba transitively
auto-installs the GPU/CPU llama.cpp build as it sees fit for the hardware it runs
on". The bugs these tests lock down (all real, all fixed in the same change):

  * AMD/Intel GPUs were silently demoted to the CPU build — they now get the
    universal **Vulkan** build llama.cpp ships.
  * Linux/macOS prebuilt downloads 404'd: the code asked for ``.zip`` but llama.cpp
    ships ``.tar.gz`` there (and there is NO ``ubuntu-cuda`` asset at all).
  * The zip-only extractor could not unpack the Linux/macOS ``.tar.gz`` archives.

Pure logic — no network, no GPU, no real download (the asset map is mocked to the
exact ggml-org/llama.cpp release shape).
"""
import io
import tarfile
import zipfile

import pytest

try:                                              # package vs path import, both used
    from llama.llama_installer import LlamaInstaller
except ImportError:                               # pragma: no cover
    from llama_installer import LlamaInstaller

TAG = "b9999"
# The REAL llama.cpp release asset shape (mirrors ggml-org/llama.cpp b9775).
_ASSET_NAMES = [
    "cudart-llama-bin-win-cuda-12.4-x64.zip",
    "cudart-llama-bin-win-cuda-13.3-x64.zip",
    f"llama-{TAG}-bin-macos-arm64.tar.gz",
    f"llama-{TAG}-bin-macos-x64.tar.gz",
    f"llama-{TAG}-bin-ubuntu-rocm-7.2-x64.tar.gz",
    f"llama-{TAG}-bin-ubuntu-vulkan-x64.tar.gz",
    f"llama-{TAG}-bin-ubuntu-x64.tar.gz",
    f"llama-{TAG}-bin-win-cpu-x64.zip",
    f"llama-{TAG}-bin-win-cuda-12.4-x64.zip",
    f"llama-{TAG}-bin-win-cuda-13.3-x64.zip",
    f"llama-{TAG}-bin-win-hip-radeon-x64.zip",
    f"llama-{TAG}-bin-win-vulkan-x64.zip",
]
ASSETS = {n: {"name": n, "browser_download_url": "http://x/" + n} for n in _ASSET_NAMES}


@pytest.fixture
def picker(tmp_path, monkeypatch):
    """Factory for a LlamaInstaller with hardware detection STUBBED — so the picker
    matrix is fast + hardware-independent (we set gpu_available explicitly)."""
    monkeypatch.setattr(LlamaInstaller, "detect_backend",
                        staticmethod(lambda os_name=None: "none"))

    def _make(os_name, gpu):
        inst = LlamaInstaller(install_dir=str(tmp_path / "l"), models_dir=str(tmp_path / "m"))
        inst.os_name = os_name
        inst.gpu_available = gpu
        return inst

    return _make


@pytest.mark.parametrize("os_name,gpu,expect_main,accel", [
    # Windows — .zip; NVIDIA gets CUDA (lowest version = widest driver compat).
    ("windows", "cuda",   f"llama-{TAG}-bin-win-cuda-12.4-x64.zip", "cuda"),
    ("windows", "vulkan", f"llama-{TAG}-bin-win-vulkan-x64.zip",    "vulkan"),
    ("windows", "none",   f"llama-{TAG}-bin-win-cpu-x64.zip",       "cpu"),
    # Linux — NO ubuntu-cuda asset; .tar.gz; Vulkan covers nvidia+amd+intel.
    ("linux", "cuda",   f"llama-{TAG}-bin-ubuntu-vulkan-x64.tar.gz", "vulkan"),
    ("linux", "vulkan", f"llama-{TAG}-bin-ubuntu-vulkan-x64.tar.gz", "vulkan"),
    ("linux", "none",   f"llama-{TAG}-bin-ubuntu-x64.tar.gz",        "cpu"),
])
def test_variant_picker(picker, os_name, gpu, expect_main, accel):
    inst = picker(os_name, gpu)
    assets, got_accel = inst._select_release_assets(dict(ASSETS), TAG)
    assert got_accel == accel
    assert assets, "picker must choose at least one asset"
    assert assets[0] == expect_main
    for a in assets:                              # every pick must really exist
        assert a in ASSETS


def test_windows_cuda_bundles_matching_cudart(picker):
    inst = picker("windows", "cuda")
    assets, accel = inst._select_release_assets(dict(ASSETS), TAG)
    assert accel == "cuda"
    # The bundled CUDA runtime for the SAME version comes along (turnkey, no toolkit).
    assert "cudart-llama-bin-win-cuda-12.4-x64.zip" in assets


def test_linux_macos_pick_targz_never_zip(picker):
    # The legacy bug: Linux/macOS assets are .tar.gz, but the old code asked for
    # .zip and 404'd into build-from-source. Every Linux/macOS pick is a real .tar.gz.
    for os_name, gpu in (("linux", "vulkan"), ("linux", "none"), ("darwin", "metal")):
        inst = picker(os_name, gpu)
        assets, _ = inst._select_release_assets(dict(ASSETS), TAG)
        assert assets, f"{os_name}/{gpu} picked nothing"
        for a in assets:
            assert a.endswith(".tar.gz"), f"{os_name}/{gpu} picked non-tar.gz {a}"


def test_amd_intel_get_gpu_not_cpu(picker):
    # THE "GPU as it sees fit" guarantee: a Vulkan-class GPU is never silently
    # demoted to the CPU build while a vulkan asset exists.
    for os_name in ("windows", "linux"):
        inst = picker(os_name, "vulkan")
        assets, accel = inst._select_release_assets(dict(ASSETS), TAG)
        assert accel == "vulkan"
        assert any("vulkan" in a for a in assets)


def test_degrades_to_cpu_when_no_gpu_asset(picker):
    # If a release lacks the GPU asset, degrade to CPU rather than fail outright.
    no_vulkan = {k: v for k, v in ASSETS.items() if "vulkan" not in k}
    inst = picker("linux", "vulkan")
    assets, accel = inst._select_release_assets(no_vulkan, TAG)
    assert accel == "cpu"
    assert assets[0] == f"llama-{TAG}-bin-ubuntu-x64.tar.gz"


# ── The detector — backend per vendor, with subprocess mocked (no real GPU) ──

def _raise(*a, **k):
    raise FileNotFoundError("tool not present")


def test_detect_backend_metal_on_darwin():
    assert LlamaInstaller.detect_backend("darwin") == "metal"


def test_detect_backend_none_when_no_gpu_tools(monkeypatch):
    import subprocess
    monkeypatch.setattr(subprocess, "run", _raise)
    assert LlamaInstaller.detect_backend("linux") == "none"
    assert LlamaInstaller.detect_backend("windows") == "none"


def test_detect_backend_cuda_when_nvidia_smi_succeeds(monkeypatch):
    import subprocess

    class _R:
        returncode = 0
        stdout = "NVIDIA GeForce RTX 4090\n"

    monkeypatch.setattr(subprocess, "run", lambda *a, **k: _R())
    # nvidia-smi is probed first → cuda wins before any AMD/Intel fallback.
    assert LlamaInstaller.detect_backend("windows") == "cuda"
    assert LlamaInstaller.detect_backend("linux") == "cuda"


# ── The archive extractor — handles BOTH .zip (Windows) and .tar.gz (Linux/macOS) ──

def test_extract_release_archive_zip_and_targz(tmp_path):
    # .zip with a single top-level dir → flattened into bin_dir.
    zbin = tmp_path / "zbin"
    zbin.mkdir()
    zp = tmp_path / "rel.zip"
    with zipfile.ZipFile(zp, "w") as z:
        z.writestr(f"llama-{TAG}/llama-server.exe", b"BIN")
        z.writestr(f"llama-{TAG}/ggml.dll", b"LIB")
    n = LlamaInstaller._extract_release_archive(zp, zbin)
    assert n == 2
    assert (zbin / "llama-server.exe").exists()     # flattened (top dir stripped)
    assert (zbin / "ggml.dll").exists()
    assert not zp.exists()                          # archive cleaned up

    # .tar.gz (Linux/macOS shape) → also flattened + extracted.
    tbin = tmp_path / "tbin"
    tbin.mkdir()
    tp = tmp_path / "rel.tar.gz"
    with tarfile.open(tp, "w:gz") as t:
        data = b"BIN"
        info = tarfile.TarInfo(f"llama-{TAG}/llama-server")
        info.size = len(data)
        info.mode = 0o755
        t.addfile(info, io.BytesIO(data))
    n2 = LlamaInstaller._extract_release_archive(tp, tbin)
    assert n2 == 1
    assert (tbin / "llama-server").exists()
    assert not tp.exists()

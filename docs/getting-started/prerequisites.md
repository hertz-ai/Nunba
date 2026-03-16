# Prerequisites

Install these tools before setting up Nunba.

## Required Software

### 1. Python 3.10+

Nunba's backend is a Flask server. Python 3.10 or later is required.

=== "Windows"

    Download from [python.org](https://www.python.org/downloads/).

    During installation:

    - **Check** "Add Python to PATH"
    - **Check** "Install pip"
    - Choose "Customize installation" → enable "pip" and "py launcher"

    Verify:
    ```bash
    python --version   # Should print 3.10.x or higher
    pip --version
    ```

=== "macOS"

    ```bash
    brew install python@3.12
    ```

=== "Linux (Ubuntu/Debian)"

    ```bash
    sudo apt update && sudo apt install python3.12 python3.12-venv python3-pip
    ```

### 2. Node.js 18+

The React frontend requires Node.js 18 or later.

Download from [nodejs.org](https://nodejs.org/) (LTS recommended).

Verify:
```bash
node --version   # Should print v18.x.x or higher
npm --version    # Should print 9.x.x or higher
```

### 3. Git

Required to clone the repository.

=== "Windows"

    Download from [git-scm.com](https://git-scm.com/download/win).

    During installation, select "Git from the command line and also from 3rd-party software".

=== "macOS"

    ```bash
    xcode-select --install
    ```

=== "Linux"

    ```bash
    sudo apt install git
    ```

### 4. OpenSSL (for encrypted environment files)

Used to decrypt production environment variables during build.

=== "Windows"

    Git for Windows bundles OpenSSL. If you installed Git, you already have it.

    Verify in Git Bash:
    ```bash
    openssl version
    ```

    If not available, install via [Chocolatey](https://chocolatey.org/):
    ```bash
    choco install openssl
    ```

=== "macOS / Linux"

    OpenSSL is pre-installed on most systems:
    ```bash
    openssl version
    ```

## Optional Software

### 5. NVIDIA GPU Drivers + CUDA (for GPU-accelerated LLM)

If you have an NVIDIA GPU, install CUDA for faster llama.cpp inference.

1. Download NVIDIA drivers from [nvidia.com/drivers](https://www.nvidia.com/Download/index.aspx)
2. Install CUDA Toolkit from [developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads)

Verify:
```bash
nvidia-smi          # Should show your GPU
nvcc --version      # Should show CUDA version
```

Without CUDA, llama.cpp falls back to CPU inference (slower but functional).

### 6. Visual C++ Build Tools (for building native Python packages)

Some Python packages (e.g., `pyaudio`, `whisper`) require C++ compilation.

Download "Build Tools for Visual Studio" from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

Select the "Desktop development with C++" workload.

### 7. Inno Setup (for creating the Windows installer)

Only needed if you want to build a distributable `.exe` installer.

Download from [jrsoftware.org](https://jrsoftware.org/isinfo.php).

## Disk Space Requirements

| Component | Size |
|-----------|------|
| Repository clone | ~500 MB |
| Python dependencies | ~1.5 GB |
| Node dependencies | ~500 MB |
| llama.cpp + 1 model | 1.5–3 GB |
| Built desktop app | ~800 MB |
| **Total (everything)** | **~5–7 GB** |

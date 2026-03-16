# Building the Desktop App

Nunba can be packaged as a standalone Windows desktop application using cx_Freeze. The app runs as a system tray application with a PyWebView window.

## Prerequisites

```bash
pip install cx_Freeze pywebview pyautogui pystray pillow
```

## Build Steps

### Step 1: Build the React Frontend

```bash
cd landing-page
npm run build
```

This creates `landing-page/build/` with optimized static files.

### Step 2: Build the Executable

```bash
# From project root
python setup_freeze.py build
```

Output: `build/HevolveAiAgentCompanion/`

This directory contains:

- `HevolveAiAgentCompanion.exe` — the main executable
- `lib/` — Python standard library + dependencies
- `landing-page/build/` — bundled React app
- `python-embed/` — embedded Python runtime
- All required DLLs

### Step 3: Test the Build

```bash
build\HevolveAiAgentCompanion\HevolveAiAgentCompanion.exe
```

Verify:

- System tray icon appears
- WebView window opens with the React app
- Chat works (if llama.cpp is set up)

## What `setup_freeze.py` Does

1. **Icon generation** — converts `Product_Hevolve_Logo.png` to `app.ico`
2. **Windows manifest** — sets UAC execution level
3. **Dependency detection** — packages all Python dependencies
4. **DLL bundling** — includes Visual C++ runtime, OpenSSL, SQLite
5. **Post-build copy** — `shutil.copytree` for dot-prefixed directories (`.libs/`)

!!! warning "cx_Freeze and dot-prefixed directories"
    cx_Freeze's `include_files` doesn't reliably copy directories starting with `.` (like `sklearn/.libs/`). The build script uses `shutil.copytree` in a post-build step to handle this.

## Command-Line Options

The built executable supports these flags:

```bash
HevolveAiAgentCompanion.exe --background     # Start minimized to tray
HevolveAiAgentCompanion.exe --width 1024     # Custom window width
HevolveAiAgentCompanion.exe --height 768     # Custom window height
HevolveAiAgentCompanion.exe --setup-ai       # Launch AI setup wizard
```

## First Launch Behavior

On first launch, the built app will:

1. Create `~/Documents/Nunba/` directory structure
2. Initialize the SQLite database
3. (If `auto_start_server` is true) Download and start llama.cpp
4. Open the WebView window at `http://localhost:5000`

## Log Files

Application logs are stored in:

```
~/Documents/Nunba/logs/
├── gui_app.log    # Desktop app logs (PyWebView, startup)
└── server.log     # Flask backend logs (API, chat)
```

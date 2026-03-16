# Desktop App Troubleshooting

Common issues when building or running the Nunba desktop application.

## Build Issues

### `error: Microsoft Visual C++ 14.0 or greater is required`

Install Visual C++ Build Tools from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

Select the "Desktop development with C++" workload.

### `ModuleNotFoundError` during build

A Python package is missing from the build environment:

```bash
pip install <missing-package>
python setup_freeze.py build   # retry
```

### Icon conversion fails

If `Product_Hevolve_Logo.png` can't be converted to `.ico`:

1. Manually convert the PNG to ICO using an online converter
2. Save as `app.ico` in the project root
3. Rebuild

### Build output too large (> 1 GB)

Check for unnecessary packages in the virtual environment:

```bash
pip list | wc -l   # Should be ~30-40 packages
```

Common bloat:
- `torch` (2+ GB) — not needed for the desktop app
- `tensorflow` — not needed
- Remove with `pip uninstall <package>`

## Runtime Issues

### App starts but shows a white/blank window

1. Check if Flask is running: Open `http://localhost:5000` in a browser
2. Check logs: `~/Documents/Nunba/logs/gui_app.log`
3. Common cause: WebView2 runtime not installed
    - Download from [developer.microsoft.com/en-us/microsoft-edge/webview2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### App crashes silently (Exit Code 1)

Usually caused by DLL conflicts with conda/anaconda:

1. Check if conda is in your PATH:
   ```bash
   where python   # Should show ONLY the Nunba Python
   ```
2. If conda appears, either:
   - Remove conda from PATH for the current session
   - Or use the Inno Setup installer (it isolates the Python environment)

The app has built-in PATH isolation (`_isolate_frozen_imports()` in `app.py`), but some conda configurations still cause conflicts.

### System tray icon doesn't appear

- Check if another Nunba instance is already running
- Right-click the taskbar → "Taskbar settings" → ensure system tray shows hidden icons

### `PermissionError: [Errno 13]` on startup

Run as Administrator, or change the install directory to a user-writable location.

### Database locked after crash

If Nunba crashes, the SQLite database may remain locked:

```bash
# Find and kill any remaining Python processes
taskkill /F /IM python.exe
taskkill /F /IM HevolveAiAgentCompanion.exe

# Restart
HevolveAiAgentCompanion.exe
```

### Port 5000 already in use

Another application is using port 5000:

```bash
netstat -ano | findstr ":5000"
taskkill /F /PID <pid-from-above>
```

## Performance Issues

### Slow startup (> 10 seconds)

1. First launch is always slower (database creation, model download)
2. Antivirus scanning can slow down `.exe` startup — add an exclusion for the install directory
3. Disable unnecessary startup services

### High memory usage

- llama.cpp with a 2B model uses ~2-4 GB RAM
- The React WebView uses ~200-400 MB
- Flask backend: ~100 MB
- **Total: ~3-5 GB** is normal with AI enabled

To reduce memory:
- Use a smaller model (Gemma-3-1B: ~1.5 GB total)
- Disable GPU layers to use less VRAM: set `use_gpu: false` in `~/.nunba/llama_config.json`

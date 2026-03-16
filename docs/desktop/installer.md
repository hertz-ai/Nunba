# Installer Creation

Create a distributable Windows installer for Nunba.

## Option A: Inno Setup (Recommended)

Inno Setup creates a compressed `.exe` installer (~200 MB vs 800 MB uncompressed).

### Prerequisites

Download and install [Inno Setup](https://jrsoftware.org/isinfo.php).

### Steps

1. Build the executable first (see [Building from Source](build.md))
2. Open Inno Setup Compiler
3. Load `HevolveAI_installer.iss` from the project root
4. Click "Compile" (or press F9)
5. The installer is created in the `Output/` directory

### What the Installer Does

- Installs to `C:\Program Files\HevolveAI\Nunba\`
- Creates desktop and start menu shortcuts
- Adds "Launch Nunba" checkbox (checked by default)
- Registers autostart in the Windows registry
- Bundles the AI setup wizard (runs on first launch)

## Option B: MSI Installer

cx_Freeze can also create an MSI installer:

```bash
python setup_freeze.py bdist_msi
```

Output: `dist/HevolveAiAgentCompanion-1.0.0-win64.msi`

!!! note
    The MSI is larger than the Inno Setup installer because it doesn't use LZMA compression. Prefer Inno Setup for distribution.

## Distribution Checklist

Before distributing:

- [ ] React frontend built (`npm run build`)
- [ ] Environment secrets encrypted (`.env.production.enc` up to date)
- [ ] All Python dependencies included
- [ ] Tested on a clean Windows machine
- [ ] llama.cpp auto-installer verified
- [ ] System tray icon works
- [ ] First-run wizard completes successfully

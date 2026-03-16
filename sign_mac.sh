#!/bin/bash
# ============================================================
#  Nunba Mac Signing Script
#  Cleans all non-signable files and signs the app bundle
#  Usage: ./sign_mac.sh [path/to/App.app] [path/to/entitlements.plist]
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-/Applications/Nunba.app}"
ENTITLEMENTS="${2:-$SCRIPT_DIR/entitlements.plist}"

echo "==> Signing: $APP"
echo "==> Entitlements: $ENTITLEMENTS"

echo ""
echo "[1/6] Removing non-signable files..."

# NOTE: Do NOT delete .pyc files - cx_Freeze frozen stdlib needs them
# Only remove __pycache__ dirs outside lib/ (source-level caches)
find "$APP/Contents/MacOS" -maxdepth 2 -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove hidden dot-folders and files
find "$APP" -type d -name ".*" -exec rm -rf {} + 2>/dev/null || true
find "$APP" -name ".hash" -delete 2>/dev/null || true
find "$APP" -name ".DS_Store" -delete 2>/dev/null || true

# Remove text/doc files
find "$APP" -name "*.txt" -delete
find "$APP" -name "*.md" -delete
find "$APP" -name "*.rst" -delete
find "$APP" -name "*.svg" -delete
# NOTE: Do NOT blanket-delete .json — many are runtime config (model_catalog.json, etc.)
# Only delete source map manifests
find "$APP" -name "*.json" -path "*/node_modules/*" -delete 2>/dev/null || true
find "$APP" -name "*.map" -delete
find "$APP" -name "LICENSE*" -delete
find "$APP" -name "COPYING*" -delete
find "$APP" -name "README*" -delete
find "$APP" -name "CHANGES*" -delete
find "$APP" -name "CHANGELOG*" -delete
find "$APP" -name "AUTHORS*" -delete
find "$APP" -name "NOTICE*" -delete
# NOTE: Do NOT blanket-delete .cfg/.ini/.toml — packages need METADATA, entry_points.txt, etc.
# Only delete known non-essential config files
find "$APP" -name "setup.cfg" -delete 2>/dev/null || true

# Remove web assets from MacOS folder
find "$APP/Contents/MacOS" -name "*.html" -delete
find "$APP/Contents/MacOS" -name "*.css" -delete
find "$APP/Contents/MacOS" -name "*.js" -not -path "*/Contents/Resources/*" -delete 2>/dev/null || true

# Remove image files from MacOS folder (not signable, belong in Resources)
find "$APP/Contents/MacOS" -name "*.png" -delete
find "$APP/Contents/MacOS" -name "*.jpg" -delete
find "$APP/Contents/MacOS" -name "*.jpeg" -delete
find "$APP/Contents/MacOS" -name "*.gif" -delete
find "$APP/Contents/MacOS" -name "*.ico" -delete
find "$APP/Contents/MacOS" -name "*.bmp" -delete
find "$APP/Contents/MacOS" -name "*.tiff" -delete
find "$APP/Contents/MacOS" -name "*.webp" -delete

# Remove landing-page (web assets are pre-built to static/, not needed in signed bundle)
rm -rf "$APP/Contents/MacOS/landing-page" 2>/dev/null || true

# Remove cx_Freeze frozen modules dat file
find "$APP" -name "library.dat" -delete 2>/dev/null || true

# Remove unsignable shell/bat scripts (e.g. ctypes/macholib)
find "$APP" -name "*.bat" -delete
find "$APP" -name "fetch_macholib" -delete
find "$APP" -path "*/macholib/fetch_*" -delete

# Test directories (never needed at runtime, contain unsignable data files)
find "$APP" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find "$APP" -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
find "$APP" -type d -name "testing" -exec rm -rf {} + 2>/dev/null || true

# Binary data files (not signable)
find "$APP" -name "*.bz2" -delete 2>/dev/null || true
find "$APP" -name "*.gz" -delete 2>/dev/null || true
find "$APP" -name "*.zip" -not -name "library.zip" -delete 2>/dev/null || true
find "$APP" -name "*.pkl" -delete 2>/dev/null || true
find "$APP" -name "*.pickle" -delete 2>/dev/null || true
find "$APP" -name "*.npy" -delete 2>/dev/null || true
find "$APP" -name "*.npz" -delete 2>/dev/null || true
find "$APP" -name "*.h5" -delete 2>/dev/null || true
find "$APP" -name "*.proto" -delete 2>/dev/null || true

# Hidden dot files
find "$APP" -name ".*" -type f -delete 2>/dev/null || true

# share/ directory (Tcl/Tk scripts — not signable)
rm -rf "$APP/Contents/MacOS/share" 2>/dev/null || true

# Specific problematic .pyc files (cause signing issues)
find "$APP" -path "*/jwt/*.pyc" -delete 2>/dev/null || true
find "$APP" -path "*/encodings/*.pyc" -delete 2>/dev/null || true
find "$APP" -path "*/encodings/__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$APP" -path "*/encodings/mac_*.pyc" -delete 2>/dev/null || true

# cx_Freeze frozen license + langchain config
rm -f "$APP/Contents/MacOS/frozen_application_license.txt" 2>/dev/null || true
find "$APP" -name "langchain_config.json" -delete 2>/dev/null || true

# Move misplaced icns to Resources
if [ -f "$APP/Contents/MacOS/app.icns" ]; then
    mkdir -p "$APP/Contents/Resources"
    mv "$APP/Contents/MacOS/app.icns" "$APP/Contents/Resources/"
    echo "    Moved app.icns to Contents/Resources/"
fi

# Remove loose .py files from MacOS root (not in lib/)
find "$APP/Contents/MacOS" -maxdepth 1 -name "*.py" -delete

echo "[2/6] Signing dylibs..."
find "$APP" -name "*.dylib" -exec codesign --force --sign - {} \;

echo "[3/6] Signing .so extensions..."
find "$APP" -name "*.so" -exec codesign --force --sign - {} \;

echo "[4/6] Signing static archives..."
find "$APP" -name "*.a" -exec codesign --force --sign - {} \;

echo "[5/6] Signing app bundle..."
codesign --force --sign - \
    --entitlements "$ENTITLEMENTS" \
    --options runtime \
    "$APP"

echo "[6/6] Verifying..."
VERIFY=$(codesign --verify --deep --strict "$APP" 2>&1)
if [ -z "$VERIFY" ]; then
    echo ""
    echo "============================================================"
    echo "  SIGNING SUCCESSFUL"
    echo "============================================================"
    xattr -rd com.apple.quarantine "$APP" 2>/dev/null || true
    echo "  Quarantine removed. App is ready to launch."
    echo "  Run: open \"$APP\""
else
    echo ""
    echo "Still failing on:"
    echo "$VERIFY"
    echo ""
    echo "Run this to find remaining blockers:"
    echo "  codesign --force --sign - --entitlements \"$ENTITLEMENTS\" --options runtime \"$APP\" 2>&1 | grep subcomponent"
fi

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
# package.json/package-lock.json are required for Node module resolution;
# deleting them left every package in node_modules without a package.json,
# which also means the *.js exclusion below MUST cover node_modules too —
# without it, this line combined with the old unscoped *.js delete below
# silently gutted real runtime files (e.g. ipaddr.js/lib/ipaddr.js), since it
# only survived via Node's index.js resolution fallback. Found 2026-09-25.
find "$APP" -name "*.json" -path "*/node_modules/*" -not -name "package.json" -not -name "package-lock.json" -delete 2>/dev/null || true
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

# Remove web assets from MacOS folder (landing-page build output only —
# excluding node_modules is required, otherwise this deletes real runtime
# .js files out of every Node dependency, e.g. the whatsapp gateway's deps)
find "$APP/Contents/MacOS" -name "*.html" -not -path "*/node_modules/*" -delete
find "$APP/Contents/MacOS" -name "*.css" -not -path "*/node_modules/*" -delete
find "$APP/Contents/MacOS" -name "*.js" -not -path "*/Contents/Resources/*" -not -path "*/node_modules/*" -delete 2>/dev/null || true

# Remove image files from MacOS folder (not signable, belong in Resources)
find "$APP/Contents/MacOS" -name "*.png" -delete
find "$APP/Contents/MacOS" -name "*.jpg" -delete
find "$APP/Contents/MacOS" -name "*.jpeg" -delete
find "$APP/Contents/MacOS" -name "*.gif" -delete
find "$APP/Contents/MacOS" -name "*.ico" -delete
find "$APP/Contents/MacOS" -name "*.bmp" -delete
find "$APP/Contents/MacOS" -name "*.tiff" -delete
find "$APP/Contents/MacOS" -name "*.webp" -delete

# landing-page/build is NOT disposable: main.py/app.py serve the React
# frontend directly from Contents/MacOS/landing-page/build at runtime
# (LANDING_PAGE_BUILD_DIR). Deleting the whole landing-page directory makes
# every route 404, including "/" — the app's entire UI. Found 2026-09-25.

# library.dat is NOT disposable: cx_Freeze's zipimporter uses it to locate
# __startup__ inside library.zip. Deleting it makes the frozen app fail at
# launch with "ModuleNotFoundError: No module named '__startup__'".
# This line used to delete it (wrongly, to dodge a signing complaint that
# individual file pre-signing actually fixes — see the final signing step).
# Found + reverted 2026-09-25.

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

# These used to delete jwt/encodings .pyc files to dodge a codesign "code
# object is not signed" complaint. encodings/*.pyc has NO .py source fallback
# in a frozen build — deleting it crashes Python at startup with
# "Fatal Python error: init_fs_encoding ... can't find encoding" before a
# single line of app code runs. The complaint they were dodging is fixed
# properly by pre-signing every file individually before the final bundle
# sign (see the final signing step) — deleting runtime files is not needed.
# Found + reverted 2026-09-25.

# cx_Freeze frozen license + langchain config
rm -f "$APP/Contents/MacOS/frozen_application_license.txt" 2>/dev/null || true
find "$APP" -name "langchain_config.json" -delete 2>/dev/null || true

# Move misplaced icns to Resources
if [ -f "$APP/Contents/MacOS/app.icns" ]; then
    mkdir -p "$APP/Contents/Resources"
    mv "$APP/Contents/MacOS/app.icns" "$APP/Contents/Resources/"
    echo "    Moved app.icns to Contents/Resources/"
fi

# main.py at Contents/MacOS root is NOT disposable: app.py loads it at
# runtime via importlib.util.spec_from_file_location(main_path) — deleting
# it makes flask_app never get set, so the desktop UI is stuck forever on
# the boot placeholder ("Loading tools... try again in a moment") even
# though the backend model is healthy. Found 2026-09-25.

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

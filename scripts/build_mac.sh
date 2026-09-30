#!/bin/bash
# ============================================================
#  Nunba Desktop App - Build Script (macOS)
#  Delegates to build.py for all build logic.
# ============================================================
#  Usage:
#    ./build_mac.sh              - Full build (app + dmg + sign)
#    ./build_mac.sh app          - Build .app bundle only
#    ./build_mac.sh installer    - Build DMG only (requires existing build)
#    ./build_mac.sh clean        - Clean build artifacts
#    ./build_mac.sh sign         - Sign built app (build/Nunba.app)
#    ./build_mac.sh sign-installed - Sign /Applications/Nunba.app
#    ./build_mac.sh --skip-deps  - Skip dependency installation
# ============================================================

set -e
cd "$(dirname "$0")/.."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_APP="$PROJECT_DIR/build/Nunba.app"
INSTALLED_APP="/Applications/Nunba.app"
ENTITLEMENTS="$PROJECT_DIR/entitlements.plist"

# ---- Find Python ----
if [ -f ".venv/bin/python" ]; then
    PYTHON_EXE=".venv/bin/python"
elif [ -f "venv/bin/python" ]; then
    PYTHON_EXE="venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_EXE="python3"
else
    echo "ERROR: Python not found"
    exit 1
fi

# ============================================================
#  sign_app <path> - Signs a .app bundle for ad-hoc local use
# ============================================================
sign_app() {
    local APP="$1"

    if [ ! -d "$APP" ]; then
        echo "ERROR: App not found at $APP"
        exit 1
    fi

    if [ ! -f "$ENTITLEMENTS" ]; then
        echo "ERROR: entitlements.plist not found at $ENTITLEMENTS"
        exit 1
    fi

    echo ""
    echo "==> Signing: $APP"
    echo "==> Entitlements: $ENTITLEMENTS"
    echo ""

    echo "[1/5] Removing non-signable files..."

    # NOTE: Do NOT delete .pyc files - cx_Freeze frozen stdlib needs them
    # Only remove __pycache__ dirs outside lib/ (source-level caches)
    find "$APP/Contents/MacOS" -maxdepth 2 -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

    # Hidden dot-folders
    find "$APP" -type d -name ".*" -exec rm -rf {} + 2>/dev/null || true
    find "$APP" -name ".DS_Store" -delete 2>/dev/null || true

    # Runtime logs the app wrote into its own build tree.
    # build/ is where Nunba gets RUN during development, so its chatter lands
    # inside the very directory we package. Measured on the Windows tree
    # 2026-08-13: 59 MB shipped to every user, all under
    # hevolveai/server/logs — 79 wamp_publisher_* files back to 2025-11 plus
    # four 10 MB rotations of one runaway day. Nothing reads them.
    # By FILE pattern only: opentelemetry/proto/logs and
    # opentelemetry/proto/collector/logs are real Python packages, so deleting
    # directories named "logs" would break the import.
    find "$APP" -name "*.log" -delete 2>/dev/null || true
    find "$APP" -name "*.log.[0-9]*" -delete 2>/dev/null || true

    # Text/doc files (not signable)
    find "$APP" -name "*.txt" -delete
    find "$APP" -name "*.md" -delete
    find "$APP" -name "*.rst" -delete
    find "$APP" -name "*.svg" -delete
    # NOTE: Do NOT blanket-delete .json — many are runtime config (model_catalog.json, etc.)
    # package.json/package-lock.json are required for Node module resolution;
    # deleting them left every package in node_modules without a package.json,
    # which combined with the old unscoped *.js delete below silently gutted
    # real runtime files (e.g. ipaddr.js/lib/ipaddr.js). Found 2026-09-25.
    find "$APP" -name "*.json" -path "*/node_modules/*" -not -name "package.json" -not -name "package-lock.json" -delete 2>/dev/null || true
    find "$APP" -name "*.map" -delete
    # NOTE: Do NOT blanket-delete .cfg/.ini/.toml — packages need METADATA, entry_points.txt, etc.
    # Only delete known non-essential config files
    find "$APP" -name "setup.cfg" -delete 2>/dev/null || true
    find "$APP" -name "LICENSE*" -delete
    find "$APP" -name "COPYING*" -delete
    find "$APP" -name "README*" -delete
    find "$APP" -name "CHANGES*" -delete
    find "$APP" -name "CHANGELOG*" -delete
    find "$APP" -name "AUTHORS*" -delete
    find "$APP" -name "NOTICE*" -delete

    # Images in MacOS folder (not signable outside Resources)
    find "$APP/Contents/MacOS" -name "*.png" -delete
    find "$APP/Contents/MacOS" -name "*.jpg" -delete
    find "$APP/Contents/MacOS" -name "*.jpeg" -delete
    find "$APP/Contents/MacOS" -name "*.gif" -delete
    find "$APP/Contents/MacOS" -name "*.ico" -delete
    find "$APP/Contents/MacOS" -name "*.bmp" -delete
    find "$APP/Contents/MacOS" -name "*.tiff" -delete
    find "$APP/Contents/MacOS" -name "*.webp" -delete

    # Web assets (landing-page build output only — must exclude node_modules,
    # otherwise this deletes real runtime files from Node dependencies)
    find "$APP/Contents/MacOS" -name "*.html" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$APP/Contents/MacOS" -name "*.css" -not -path "*/node_modules/*" -delete 2>/dev/null || true

    # landing-page/build is NOT disposable: main.py/app.py serve the React
    # frontend directly from Contents/MacOS/landing-page/build at runtime.
    # Deleting it makes every route 404, including "/". Found 2026-09-25.

    # library.dat is NOT disposable: cx_Freeze's zipimporter uses it to locate
    # __startup__ inside library.zip. Deleting it breaks launch with
    # "ModuleNotFoundError: No module named '__startup__'". Found 2026-09-25.

    # Shell/bat scripts (e.g. ctypes/macholib)
    find "$APP" -name "*.bat" -delete
    find "$APP" -name "fetch_macholib" -delete
    find "$APP" -path "*/macholib/fetch_*" -delete

    # Test directories (never needed at runtime, contain unsignable data files)
    find "$APP" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
    find "$APP" -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
    find "$APP" -type d -name "testing" -exec rm -rf {} + 2>/dev/null || true

    # Binary data files (not signable)
    find "$APP" -name "*.bz2" -delete
    find "$APP" -name "*.gz" -delete
    find "$APP" -name "*.zip" -not -name "library.zip" -delete
    find "$APP" -name "*.pkl" -delete
    find "$APP" -name "*.pickle" -delete
    find "$APP" -name "*.gpickle" -delete
    find "$APP" -name "*.npy" -delete
    find "$APP" -name "*.npz" -delete
    find "$APP" -name "*.h5" -delete
    find "$APP" -name "*.hdf5" -delete
    find "$APP" -name "*.bfbs" -delete
    find "$APP" -name "*.fbs" -delete
    find "$APP" -name "*.proto" -delete

    # Hidden dot files (not just dirs)
    find "$APP" -name ".*" -type f -delete 2>/dev/null || true
    # share/ directory (Tcl/Tk scripts — not signable)
    rm -rf "$APP/Contents/MacOS/share" 2>/dev/null || true
    # wandb vendor directory
    rm -rf "$APP/Contents/MacOS/lib/wandb/vendor" 2>/dev/null || true
    # cx_Freeze license file
    rm -f "$APP/Contents/MacOS/frozen_application_license.txt" 2>/dev/null || true
    find "$APP" -name "langchain_config.json" -delete 2>/dev/null || true
    # These used to delete jwt/encodings .pyc files to dodge a codesign "code
    # object is not signed" complaint. encodings/*.pyc has NO .py fallback in
    # a frozen build — deleting it crashes Python at startup with
    # "Fatal Python error: init_fs_encoding ... can't find encoding" before
    # any app code runs. Pre-signing every file individually before the final
    # bundle sign fixes the original complaint without deleting anything.
    # Found + reverted 2026-09-25.

    # main.py at Contents/MacOS root is NOT disposable: app.py loads it at
    # runtime via importlib.util.spec_from_file_location(main_path) —
    # deleting it makes flask_app never get set, so the desktop UI is stuck
    # forever on the boot placeholder. Found 2026-09-25.

    # Move misplaced .icns to Resources
    if [ -f "$APP/Contents/MacOS/app.icns" ]; then
        mkdir -p "$APP/Contents/Resources"
        mv "$APP/Contents/MacOS/app.icns" "$APP/Contents/Resources/"
        echo "    Moved app.icns -> Contents/Resources/"
    fi

    echo "[2/5] Signing dylibs..."
    find "$APP" -name "*.dylib" -exec codesign --force --sign - {} \;

    echo "[3/5] Signing .so extensions..."
    find "$APP" -name "*.so" -exec codesign --force --sign - {} \;

    echo "[4/5] Signing static archives..."
    find "$APP" -name "*.a" -exec codesign --force --sign - {} \;

    echo "[5/5] Signing app bundle (top-level only)..."
    sudo codesign --force --sign - \
        --entitlements "$ENTITLEMENTS" \
        "$APP"

    echo "Verifying..."
    VERIFY=$(codesign --verify --deep --strict "$APP" 2>&1)
    if [ -z "$VERIFY" ]; then
        echo ""
        echo "============================================================"
        echo "  SIGNING SUCCESSFUL: $APP"
        echo "============================================================"
        xattr -rd com.apple.quarantine "$APP" 2>/dev/null || true
        echo "  Quarantine cleared. Ready to launch."
    else
        echo ""
        echo "SIGNING FAILED. Remaining blockers:"
        echo "$VERIFY"
        echo ""
        echo "Run to debug:"
        echo "  codesign --force --sign - --entitlements \"$ENTITLEMENTS\" --options runtime \"$APP\" 2>&1 | grep subcomponent"
        exit 1
    fi
}

# ---- Handle sign commands directly ----
case "$1" in
    sign)
        sign_app "$BUILD_APP"
        exit 0
        ;;
    sign-installed)
        sign_app "$INSTALLED_APP"
        exit 0
        ;;
esac

# ---- Map legacy arg names ----
ARGS="$@"
case "$1" in
    dmg) ARGS="installer ${@:2}" ;;
esac

# ---- Delegate to build.py ----
exec "$PYTHON_EXE" scripts/build.py $ARGS
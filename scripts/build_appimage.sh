#!/usr/bin/env bash
# =============================================================================
# build_appimage.sh - Package Nunba cx_Freeze output into an AppImage
#
# Nunba: A Friend, A Well Wisher, Your LocalMind
#
# Usage:
#   ./scripts/build_appimage.sh                     # Full build
#   ./scripts/build_appimage.sh --skip-freeze        # Skip cx_Freeze, package only
#   ARCH=x86_64 ./scripts/build_appimage.sh         # Explicit architecture
#
# Prerequisites:
#   - cx_Freeze build output in build/Nunba/
#   - appimagetool or linuxdeploy (auto-downloaded if not found)
#   - imagemagick (for icon conversion, optional)
#
# Output:
#   Output/Nunba-<version>-<arch>.AppImage
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${PROJECT_DIR}/build/Nunba"
OUTPUT_DIR="${PROJECT_DIR}/Output"
TOOLS_DIR="${PROJECT_DIR}/build/tools"
DEPLOY_DIR="${PROJECT_DIR}/deploy/linux"

# Architecture
ARCH="${ARCH:-$(uname -m)}"
export ARCH

# Version from deps.py
VERSION=$(python3 "${SCRIPT_DIR}/deps.py" version 2>/dev/null || echo "2.0.0")

APPDIR="${PROJECT_DIR}/build/Nunba.AppDir"
APPIMAGE_NAME="Nunba-${VERSION}-${ARCH}.AppImage"

SKIP_FREEZE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-freeze)
            SKIP_FREEZE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# -- Helper functions --

info() {
    echo -e "\033[1;34m[INFO]\033[0m $*"
}

warn() {
    echo -e "\033[1;33m[WARN]\033[0m $*"
}

error() {
    echo -e "\033[1;31m[ERROR]\033[0m $*"
    exit 1
}

header() {
    echo ""
    echo "============================================================"
    echo "  $*"
    echo "============================================================"
}

# -- Check prerequisites --

check_prerequisites() {
    header "Checking prerequisites"

    if ! command -v python3 &>/dev/null; then
        error "python3 not found. Install Python 3.10+ first."
    fi
    info "Python: $(python3 --version)"

    if [[ "$SKIP_FREEZE" == false ]] && [[ ! -d "$BUILD_DIR" ]]; then
        info "cx_Freeze build output not found. Will run cx_Freeze first."
    elif [[ "$SKIP_FREEZE" == true ]] && [[ ! -d "$BUILD_DIR" ]]; then
        error "build/Nunba/ not found. Run cx_Freeze first or remove --skip-freeze."
    fi

    # Check for icon conversion tool
    if command -v convert &>/dev/null; then
        info "ImageMagick found (for icon conversion)"
    elif command -v rsvg-convert &>/dev/null; then
        info "rsvg-convert found (for icon conversion)"
    else
        warn "Neither ImageMagick nor rsvg-convert found. Icon may not be converted."
    fi
}

# -- Download appimagetool if not present --

ensure_appimagetool() {
    header "Ensuring appimagetool is available"

    # Check system PATH first
    if command -v appimagetool &>/dev/null; then
        APPIMAGETOOL="appimagetool"
        info "Using system appimagetool: $(which appimagetool)"
        return
    fi

    # Check local tools directory
    APPIMAGETOOL="${TOOLS_DIR}/appimagetool-${ARCH}.AppImage"
    if [[ -x "$APPIMAGETOOL" ]]; then
        info "Using cached appimagetool: ${APPIMAGETOOL}"
        return
    fi

    # Download
    mkdir -p "$TOOLS_DIR"
    local url="https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-${ARCH}.AppImage"
    info "Downloading appimagetool from ${url}..."
    if curl -fSL -o "$APPIMAGETOOL" "$url"; then
        chmod +x "$APPIMAGETOOL"
        info "Downloaded appimagetool to ${APPIMAGETOOL}"
    else
        # Fallback: try linuxdeploy
        warn "Failed to download appimagetool. Trying linuxdeploy..."
        local ld_url="https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-${ARCH}.AppImage"
        APPIMAGETOOL="${TOOLS_DIR}/linuxdeploy-${ARCH}.AppImage"
        if curl -fSL -o "$APPIMAGETOOL" "$ld_url"; then
            chmod +x "$APPIMAGETOOL"
            USE_LINUXDEPLOY=true
            info "Downloaded linuxdeploy to ${APPIMAGETOOL}"
        else
            error "Could not download appimagetool or linuxdeploy. Install manually."
        fi
    fi
}

# -- Run cx_Freeze --

run_cx_freeze() {
    if [[ "$SKIP_FREEZE" == true ]]; then
        info "Skipping cx_Freeze (--skip-freeze)"
        return
    fi

    header "Running cx_Freeze build"
    cd "$PROJECT_DIR"
    python3 "${SCRIPT_DIR}/setup_freeze_linux.py" build
    info "cx_Freeze build complete"
}

# -- Prepare icon --

prepare_icon() {
    header "Preparing icon"

    local icon_dst="${APPDIR}/nunba.png"
    local icon_256="${APPDIR}/usr/share/icons/hicolor/256x256/apps/nunba.png"

    mkdir -p "$(dirname "$icon_256")"
    mkdir -p "${APPDIR}/usr/share/icons/hicolor/128x128/apps"
    mkdir -p "${APPDIR}/usr/share/icons/hicolor/64x64/apps"
    mkdir -p "${APPDIR}/usr/share/icons/hicolor/48x48/apps"
    mkdir -p "${APPDIR}/usr/share/icons/hicolor/32x32/apps"
    mkdir -p "${APPDIR}/usr/share/icons/hicolor/16x16/apps"

    # Find source icon
    local src_icon=""
    for candidate in \
        "${PROJECT_DIR}/Nunba_Logo.png" \
        "${PROJECT_DIR}/Product_Hevolve_Logo.png" \
        "${BUILD_DIR}/Product_Hevolve_Logo.png" \
        "${BUILD_DIR}/nunba_icon.png"; do
        if [[ -f "$candidate" ]]; then
            src_icon="$candidate"
            break
        fi
    done

    if [[ -z "$src_icon" ]]; then
        # Try to extract from .ico
        if [[ -f "${PROJECT_DIR}/app.ico" ]]; then
            if command -v convert &>/dev/null; then
                convert "${PROJECT_DIR}/app.ico[0]" -resize 256x256 "$icon_256"
                src_icon="$icon_256"
                info "Extracted icon from app.ico via ImageMagick"
            fi
        fi
    fi

    if [[ -z "$src_icon" ]]; then
        warn "No icon found. AppImage will have no icon."
        return
    fi

    # Copy main icon (for AppDir root -- used by AppImage runtime)
    cp "$src_icon" "$icon_dst"

    # Generate multiple sizes if ImageMagick is available
    if command -v convert &>/dev/null; then
        for size in 256 128 64 48 32 16; do
            convert "$src_icon" -resize "${size}x${size}" \
                "${APPDIR}/usr/share/icons/hicolor/${size}x${size}/apps/nunba.png"
        done
        info "Generated icon set (16x16 to 256x256)"
    else
        # Just copy the source to 256x256
        cp "$src_icon" "$icon_256"
        info "Copied source icon to 256x256 (install ImageMagick for multi-size)"
    fi
}

# -- Create AppDir structure --

create_appdir() {
    header "Creating AppDir structure"

    # Clean previous AppDir
    if [[ -d "$APPDIR" ]]; then
        info "Removing previous AppDir..."
        rm -rf "$APPDIR"
    fi

    # Create directory structure
    mkdir -p "${APPDIR}/usr/bin"
    mkdir -p "${APPDIR}/usr/lib"
    mkdir -p "${APPDIR}/usr/share/applications"
    mkdir -p "${APPDIR}/usr/share/icons"
    mkdir -p "${APPDIR}/usr/share/metainfo"

    # Copy cx_Freeze build output into usr/bin
    info "Copying cx_Freeze output to AppDir..."
    cp -a "${BUILD_DIR}/." "${APPDIR}/usr/bin/"

    # Copy .desktop file
    if [[ -f "${DEPLOY_DIR}/Nunba.desktop" ]]; then
        cp "${DEPLOY_DIR}/Nunba.desktop" "${APPDIR}/usr/share/applications/Nunba.desktop"
        # AppImage needs .desktop at root too
        cp "${DEPLOY_DIR}/Nunba.desktop" "${APPDIR}/Nunba.desktop"
        info "Installed Nunba.desktop"
    else
        warn "Nunba.desktop not found at ${DEPLOY_DIR}/Nunba.desktop"
        # Create a minimal one
        cat > "${APPDIR}/Nunba.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Nunba
Exec=Nunba
Icon=nunba
Categories=Education;Development;
DESKTOP
        cp "${APPDIR}/Nunba.desktop" "${APPDIR}/usr/share/applications/Nunba.desktop"
    fi

    # Copy metainfo
    if [[ -f "${DEPLOY_DIR}/nunba.metainfo.xml" ]]; then
        cp "${DEPLOY_DIR}/nunba.metainfo.xml" "${APPDIR}/usr/share/metainfo/com.hevolve.nunba.metainfo.xml"
        info "Installed AppStream metainfo"
    fi

    # Prepare icon
    prepare_icon

    # Create AppRun script
    create_apprun
}

# -- Create AppRun launcher --

create_apprun() {
    info "Creating AppRun launcher..."

    cat > "${APPDIR}/AppRun" <<'APPRUN'
#!/usr/bin/env bash
# =============================================================================
# AppRun - Launcher for Nunba AppImage
#
# Sets up the runtime environment (library paths, Python paths) and launches
# the frozen Nunba executable.
# =============================================================================
set -euo pipefail

# Resolve the AppDir (where this AppRun script lives)
if [[ -n "${APPDIR:-}" ]]; then
    APPDIR_RESOLVED="$APPDIR"
else
    APPDIR_RESOLVED="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

NUNBA_BIN="${APPDIR_RESOLVED}/usr/bin"
NUNBA_EXE="${NUNBA_BIN}/Nunba"

# -- Library path setup --
# Add the frozen app's lib directory and any bundled .libs directories
# so that .so files (numpy, shapely, etc.) can find their dependencies.
export LD_LIBRARY_PATH="${NUNBA_BIN}/lib:${NUNBA_BIN}:${LD_LIBRARY_PATH:-}"

# Add .libs directories (numpy.libs, shapely.libs, etc.)
for libs_dir in "${NUNBA_BIN}"/lib/*.libs; do
    if [[ -d "$libs_dir" ]]; then
        export LD_LIBRARY_PATH="${libs_dir}:${LD_LIBRARY_PATH}"
    fi
done

# python-embed libs (if present)
EMBED_DIR="${NUNBA_BIN}/python-embed"
if [[ -d "$EMBED_DIR" ]]; then
    # Linux python-embed structure: lib/pythonX.Y/site-packages
    for sp_libs in "${EMBED_DIR}"/lib/python*/site-packages/*.libs; do
        if [[ -d "$sp_libs" ]]; then
            export LD_LIBRARY_PATH="${sp_libs}:${LD_LIBRARY_PATH}"
        fi
    done
    # Also add the embed lib directory itself
    for embed_lib in "${EMBED_DIR}"/lib/python*/lib-dynload; do
        if [[ -d "$embed_lib" ]]; then
            export LD_LIBRARY_PATH="${embed_lib}:${LD_LIBRARY_PATH}"
        fi
    done
fi

# -- GTK/WebKit2 environment --
# pywebview uses GTK3 + WebKit2 on Linux. Ensure GI typelib paths are set
# so that gi.require_version('Gtk', '3.0') and WebKit2 work properly.
# We rely on system-installed GTK and WebKit2 (can't realistically bundle them).

# -- XDG data directories --
# Add our share directory so .desktop and icons are discoverable
export XDG_DATA_DIRS="${APPDIR_RESOLVED}/usr/share:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"

# -- Locale / encoding --
# Ensure Python uses UTF-8 (avoids 'ascii' codec errors in frozen builds)
export PYTHONIOENCODING="utf-8"
export LC_ALL="${LC_ALL:-C.UTF-8}"

# -- Launch --
if [[ ! -x "$NUNBA_EXE" ]]; then
    echo "ERROR: Nunba executable not found at ${NUNBA_EXE}" >&2
    echo "The AppImage may be corrupted. Please re-download." >&2
    exit 1
fi

exec "$NUNBA_EXE" "$@"
APPRUN

    chmod +x "${APPDIR}/AppRun"
    info "AppRun created"
}

# -- Build AppImage --

build_appimage() {
    header "Building AppImage"

    mkdir -p "$OUTPUT_DIR"

    local output_path="${OUTPUT_DIR}/${APPIMAGE_NAME}"

    # Remove old AppImage if present
    rm -f "$output_path"

    if [[ "${USE_LINUXDEPLOY:-false}" == true ]]; then
        # linuxdeploy mode
        info "Building with linuxdeploy..."
        "$APPIMAGETOOL" \
            --appdir "$APPDIR" \
            --desktop-file "${APPDIR}/Nunba.desktop" \
            --output appimage
        # linuxdeploy outputs to current directory
        local generated
        generated=$(ls -t Nunba*.AppImage 2>/dev/null | head -1)
        if [[ -n "$generated" && -f "$generated" ]]; then
            mv "$generated" "$output_path"
        fi
    else
        # appimagetool mode
        info "Building with appimagetool..."

        # appimagetool needs FUSE or --appimage-extract-and-run
        # Try direct first, then fallback
        if "$APPIMAGETOOL" "$APPDIR" "$output_path" 2>/dev/null; then
            true
        elif "$APPIMAGETOOL" --appimage-extract-and-run "$APPDIR" "$output_path" 2>/dev/null; then
            true
        else
            # Last resort: extract appimagetool and run natively
            info "Extracting appimagetool for FUSE-less build..."
            local extracted_dir="${TOOLS_DIR}/appimagetool-extracted"
            rm -rf "$extracted_dir"
            cd "$TOOLS_DIR"
            "$APPIMAGETOOL" --appimage-extract 2>/dev/null || true
            if [[ -x "${TOOLS_DIR}/squashfs-root/AppRun" ]]; then
                mv "${TOOLS_DIR}/squashfs-root" "$extracted_dir"
                "${extracted_dir}/AppRun" "$APPDIR" "$output_path"
            else
                error "Failed to run appimagetool. Install FUSE: sudo apt install fuse libfuse2"
            fi
            cd "$PROJECT_DIR"
        fi
    fi

    if [[ -f "$output_path" ]]; then
        chmod +x "$output_path"
        local size_mb
        size_mb=$(du -m "$output_path" | cut -f1)
        info "AppImage created: ${output_path} (${size_mb} MB)"
    else
        error "AppImage was not created at ${output_path}"
    fi
}

# -- Summary --

print_summary() {
    header "BUILD COMPLETE"

    local output_path="${OUTPUT_DIR}/${APPIMAGE_NAME}"

    if [[ -f "$output_path" ]]; then
        local size_mb
        size_mb=$(du -m "$output_path" | cut -f1)
        echo "  AppImage:  ${output_path}"
        echo "  Size:      ${size_mb} MB"
        echo "  Arch:      ${ARCH}"
        echo "  Version:   ${VERSION}"
        echo ""
        echo "============================================================"
        echo ""
        echo "  To test:   chmod +x ${output_path} && ${output_path}"
        echo "  To install: ./deploy/linux/install.sh ${output_path}"
        echo ""
        echo "  System requirements:"
        echo "    - GTK 3.0"
        echo "    - WebKit2GTK 4.0 (for pywebview)"
        echo "    - FUSE (for AppImage, or use --appimage-extract)"
        echo ""
    else
        echo "  Build produced artifacts in build/Nunba/ but AppImage packaging failed."
        echo "  You can still run: build/Nunba/Nunba"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    header "Nunba Linux Build (AppImage)"
    info "Version: ${VERSION}"
    info "Architecture: ${ARCH}"
    info "Project: ${PROJECT_DIR}"

    cd "$PROJECT_DIR"

    check_prerequisites
    ensure_appimagetool
    run_cx_freeze
    create_appdir
    build_appimage
    print_summary
}

main "$@"

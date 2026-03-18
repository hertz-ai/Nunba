#!/usr/bin/env bash
# =============================================================================
# install.sh - Install Nunba AppImage for the current user
#
# Usage:
#   ./install.sh                              # Install from Output/ (auto-detect)
#   ./install.sh /path/to/Nunba-2.0.0.AppImage  # Install specific AppImage
#   ./install.sh --uninstall                   # Remove Nunba
#
# What it does:
#   1. Copies AppImage to ~/.local/bin/Nunba.AppImage
#   2. Creates a wrapper script at ~/.local/bin/Nunba
#   3. Installs .desktop file to ~/.local/share/applications/
#   4. Installs icon to ~/.local/share/icons/hicolor/
#   5. Registers hevolveai:// protocol handler via xdg-mime
#   6. Optionally adds to autostart via ~/.config/autostart/
#
# No root required. Everything installs to user directories.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

APP_NAME="Nunba"
APP_ID="com.hevolve.nunba"
PROTOCOL="hevolveai"

# Install directories (XDG standard)
BIN_DIR="${HOME}/.local/bin"
APPS_DIR="${HOME}/.local/share/applications"
ICONS_DIR="${HOME}/.local/share/icons/hicolor"
METAINFO_DIR="${HOME}/.local/share/metainfo"
AUTOSTART_DIR="${HOME}/.config/autostart"

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

# -- Uninstall --

do_uninstall() {
    echo "Uninstalling ${APP_NAME}..."

    local removed=0

    # Remove binary and AppImage
    for f in "${BIN_DIR}/Nunba" "${BIN_DIR}/Nunba.AppImage"; do
        if [[ -f "$f" ]]; then
            rm -f "$f"
            info "Removed: $f"
            ((removed++)) || true
        fi
    done

    # Remove .desktop file
    local desktop_file="${APPS_DIR}/Nunba.desktop"
    if [[ -f "$desktop_file" ]]; then
        rm -f "$desktop_file"
        info "Removed: $desktop_file"
        ((removed++)) || true
    fi

    # Remove autostart entry
    local autostart_file="${AUTOSTART_DIR}/Nunba.desktop"
    if [[ -f "$autostart_file" ]]; then
        rm -f "$autostart_file"
        info "Removed: $autostart_file"
        ((removed++)) || true
    fi

    # Remove icons
    for size in 16 32 48 64 128 256; do
        local icon="${ICONS_DIR}/${size}x${size}/apps/nunba.png"
        if [[ -f "$icon" ]]; then
            rm -f "$icon"
            ((removed++)) || true
        fi
    done

    # Remove metainfo
    local metainfo="${METAINFO_DIR}/${APP_ID}.metainfo.xml"
    if [[ -f "$metainfo" ]]; then
        rm -f "$metainfo"
        info "Removed: $metainfo"
        ((removed++)) || true
    fi

    # Unregister protocol handler
    if command -v xdg-mime &>/dev/null; then
        # xdg-mime doesn't have an "unset" — just remove the .desktop association
        local mimeapps="${HOME}/.local/share/applications/mimeapps.list"
        if [[ -f "$mimeapps" ]]; then
            sed -i "/x-scheme-handler\/${PROTOCOL}=Nunba.desktop/d" "$mimeapps" 2>/dev/null || true
        fi
    fi

    # Update desktop database
    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$APPS_DIR" 2>/dev/null || true
    fi

    if [[ $removed -gt 0 ]]; then
        info "${APP_NAME} has been uninstalled."
    else
        info "${APP_NAME} was not installed."
    fi
}

# -- Find AppImage --

find_appimage() {
    local search_path="$1"

    # Explicit path given
    if [[ -n "$search_path" && -f "$search_path" ]]; then
        echo "$search_path"
        return
    fi

    # Search in Output/ directory
    local latest
    latest=$(ls -t "${PROJECT_DIR}/Output"/Nunba-*.AppImage 2>/dev/null | head -1)
    if [[ -n "$latest" && -f "$latest" ]]; then
        echo "$latest"
        return
    fi

    # Search in current directory
    latest=$(ls -t Nunba-*.AppImage 2>/dev/null | head -1)
    if [[ -n "$latest" && -f "$latest" ]]; then
        echo "$latest"
        return
    fi

    return 1
}

# -- Install icon --

install_icon() {
    local src_icon=""

    # Try to find a source icon
    for candidate in \
        "${PROJECT_DIR}/Nunba_Logo.png" \
        "${PROJECT_DIR}/Product_Hevolve_Logo.png" \
        "${SCRIPT_DIR}/../../Product_Hevolve_Logo.png"; do
        if [[ -f "$candidate" ]]; then
            src_icon="$candidate"
            break
        fi
    done

    # Try extracting from AppImage
    if [[ -z "$src_icon" ]]; then
        local appimage="${BIN_DIR}/Nunba.AppImage"
        if [[ -f "$appimage" ]]; then
            local tmp_dir
            tmp_dir=$(mktemp -d)
            # Extract just the icon
            cd "$tmp_dir"
            "$appimage" --appimage-extract "nunba.png" 2>/dev/null || true
            "$appimage" --appimage-extract "usr/share/icons/hicolor/256x256/apps/nunba.png" 2>/dev/null || true
            cd "$OLDPWD"

            if [[ -f "${tmp_dir}/squashfs-root/nunba.png" ]]; then
                src_icon="${tmp_dir}/squashfs-root/nunba.png"
            elif [[ -f "${tmp_dir}/squashfs-root/usr/share/icons/hicolor/256x256/apps/nunba.png" ]]; then
                src_icon="${tmp_dir}/squashfs-root/usr/share/icons/hicolor/256x256/apps/nunba.png"
            fi
        fi
    fi

    if [[ -z "$src_icon" ]]; then
        warn "No icon source found. Skipping icon installation."
        return
    fi

    # Install at multiple sizes
    if command -v convert &>/dev/null; then
        for size in 256 128 64 48 32 16; do
            local dest_dir="${ICONS_DIR}/${size}x${size}/apps"
            mkdir -p "$dest_dir"
            convert "$src_icon" -resize "${size}x${size}" "${dest_dir}/nunba.png"
        done
        info "Installed icons (16x16 to 256x256)"
    else
        # Just install at 256x256
        local dest_dir="${ICONS_DIR}/256x256/apps"
        mkdir -p "$dest_dir"
        cp "$src_icon" "${dest_dir}/nunba.png"
        info "Installed icon at 256x256 (install ImageMagick for multi-size)"
    fi

    # Update icon cache
    if command -v gtk-update-icon-cache &>/dev/null; then
        gtk-update-icon-cache -f -t "$ICONS_DIR" 2>/dev/null || true
    fi
}

# -- Install .desktop file --

install_desktop_file() {
    mkdir -p "$APPS_DIR"

    local desktop_src="${SCRIPT_DIR}/Nunba.desktop"
    local desktop_dst="${APPS_DIR}/Nunba.desktop"

    if [[ -f "$desktop_src" ]]; then
        # Copy and patch Exec line to point to installed location
        sed "s|^Exec=Nunba|Exec=${BIN_DIR}/Nunba|g" "$desktop_src" > "$desktop_dst"
    else
        # Create from scratch
        cat > "$desktop_dst" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Nunba
GenericName=Local AI Companion
Comment=Your Local HART Mind Companion - Run LLMs, TTS, STT locally
Exec=${BIN_DIR}/Nunba %u
Icon=nunba
Terminal=false
Categories=Education;Development;ArtificialIntelligence;Chat;
Keywords=AI;LLM;TTS;STT;Agent;Local;Privacy;
MimeType=x-scheme-handler/hevolveai;
StartupWMClass=Nunba
StartupNotify=true
DESKTOP
    fi

    chmod 644 "$desktop_dst"
    info "Installed: $desktop_dst"

    # Update desktop database
    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$APPS_DIR" 2>/dev/null || true
    fi
}

# -- Register protocol handler --

register_protocol_handler() {
    if ! command -v xdg-mime &>/dev/null; then
        warn "xdg-mime not found. Protocol handler not registered."
        return
    fi

    xdg-mime default Nunba.desktop "x-scheme-handler/${PROTOCOL}" 2>/dev/null || true
    info "Registered protocol handler: ${PROTOCOL}://"
}

# -- Install metainfo --

install_metainfo() {
    local src="${SCRIPT_DIR}/nunba.metainfo.xml"
    if [[ ! -f "$src" ]]; then
        return
    fi

    mkdir -p "$METAINFO_DIR"
    cp "$src" "${METAINFO_DIR}/${APP_ID}.metainfo.xml"
    info "Installed AppStream metainfo"
}

# -- Optional: autostart --

setup_autostart() {
    echo ""
    read -rp "Start Nunba automatically on login? [y/N] " response
    case "$response" in
        [yY]|[yY][eE][sS])
            mkdir -p "$AUTOSTART_DIR"
            cat > "${AUTOSTART_DIR}/Nunba.desktop" <<AUTOSTART
[Desktop Entry]
Type=Application
Name=Nunba
Exec=${BIN_DIR}/Nunba --background
Icon=nunba
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=Nunba AI Companion (background mode)
AUTOSTART
            info "Autostart enabled: ${AUTOSTART_DIR}/Nunba.desktop"
            ;;
        *)
            info "Autostart not enabled. You can enable it later in system settings."
            ;;
    esac
}

# -- Main install --

do_install() {
    local appimage_path="${1:-}"

    # Find the AppImage
    local appimage
    if ! appimage=$(find_appimage "$appimage_path"); then
        error "No AppImage found. Build with: ./scripts/build_appimage.sh
Or specify path: ./deploy/linux/install.sh /path/to/Nunba.AppImage"
    fi

    echo ""
    echo "============================================================"
    echo "  Installing ${APP_NAME}"
    echo "============================================================"
    echo ""
    info "Source: ${appimage}"
    echo ""

    # Create directories
    mkdir -p "$BIN_DIR"

    # Copy AppImage
    cp "$appimage" "${BIN_DIR}/Nunba.AppImage"
    chmod +x "${BIN_DIR}/Nunba.AppImage"
    info "Installed: ${BIN_DIR}/Nunba.AppImage"

    # Create wrapper script (so 'Nunba' works as a command)
    cat > "${BIN_DIR}/Nunba" <<WRAPPER
#!/usr/bin/env bash
# Nunba launcher - delegates to the AppImage
exec "${BIN_DIR}/Nunba.AppImage" "\$@"
WRAPPER
    chmod +x "${BIN_DIR}/Nunba"
    info "Created wrapper: ${BIN_DIR}/Nunba"

    # Install .desktop file
    install_desktop_file

    # Install icon
    install_icon

    # Install metainfo
    install_metainfo

    # Register protocol handler
    register_protocol_handler

    # Autostart prompt
    setup_autostart

    # Check PATH
    if ! echo "$PATH" | tr ':' '\n' | grep -qx "${BIN_DIR}"; then
        echo ""
        warn "${BIN_DIR} is not in your PATH."
        echo "  Add this to your ~/.bashrc or ~/.zshrc:"
        echo "    export PATH=\"\${HOME}/.local/bin:\${PATH}\""
        echo ""
    fi

    echo ""
    echo "============================================================"
    echo "  ${APP_NAME} installed successfully!"
    echo "============================================================"
    echo ""
    echo "  Run:        Nunba"
    echo "  Or:         ${BIN_DIR}/Nunba"
    echo "  Uninstall:  $0 --uninstall"
    echo ""
    echo "  System requirements (install if not present):"
    echo "    sudo apt install libwebkit2gtk-4.0-37 gir1.2-webkit2-4.0"
    echo "    # or on Fedora:"
    echo "    sudo dnf install webkit2gtk3"
    echo ""
}

# =============================================================================
# Entry point
# =============================================================================

case "${1:-}" in
    --uninstall|-u)
        do_uninstall
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS] [APPIMAGE_PATH]"
        echo ""
        echo "Install Nunba AppImage for the current user."
        echo ""
        echo "Options:"
        echo "  --uninstall, -u    Remove Nunba installation"
        echo "  --help, -h         Show this help"
        echo ""
        echo "If APPIMAGE_PATH is not given, searches Output/ and current directory."
        ;;
    *)
        do_install "${1:-}"
        ;;
esac

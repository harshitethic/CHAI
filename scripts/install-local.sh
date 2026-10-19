#!/bin/sh
# Install the trusted CHAI AppImage for the current user, without root or autostart.
set -eu
source_image=${1:?Usage: sh scripts/install-local.sh /path/to/CHAI.AppImage}
[ -f "$source_image" ] || { echo 'AppImage not found' >&2; exit 1; }
install_dir="$HOME/.local/opt/chai-0.1.0-alpha.1"
launcher="$HOME/.local/bin/chai"
desktop_file="$HOME/.local/share/applications/chai.desktop"
if [ -e "$install_dir" ] || [ -e "$launcher" ] || [ -e "$desktop_file" ]; then
  echo 'Existing CHAI installation detected. Refusing to overwrite; inspect it first.' >&2
  exit 1
fi
mkdir -p "$install_dir" "$HOME/.local/bin" "$HOME/.local/share/applications"
cp "$source_image" "$install_dir/CHAI.AppImage"
chmod 755 "$install_dir/CHAI.AppImage"
cat > "$launcher" <<'LAUNCHER'
#!/bin/sh
export APPIMAGE_EXTRACT_AND_RUN=1
exec "$HOME/.local/opt/chai-0.1.0-alpha.1/CHAI.AppImage" "$@"
LAUNCHER
chmod 755 "$launcher"
# Linux filenames containing newlines are intentionally unsupported here.
case "$HOME" in *'"'*|*'%'*|*'`'*|*'\\'*) echo 'Unsupported home path for desktop launcher' >&2; exit 1;; esac
cat > "$desktop_file" <<DESKTOP
[Desktop Entry]
Type=Application
Name=CHAI
Comment=Chat Has Actions Inside. Stop chatting. Start doing.
Exec="$launcher"
Terminal=false
Categories=Development;
StartupWMClass=chai.desktop
DESKTOP
printf 'Installed CHAI. Run %s\n' "$launcher"

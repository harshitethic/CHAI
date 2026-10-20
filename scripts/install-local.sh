#!/bin/sh
# Install or explicitly upgrade CHAI for the current user; no root or autostart.
set -eu
umask 077
source_image=${1:?Usage: sh scripts/install-local.sh IMAGE [VERSION] [--upgrade]}
version=${2:-0.10.2-alpha.1}
upgrade=${3:-}
case "$version" in ''|*[!a-zA-Z0-9.-]*) echo 'Invalid version' >&2; exit 1;; esac
[ -f "$source_image" ] || { echo 'AppImage not found' >&2; exit 1; }
target_home=${CHAI_INSTALL_HOME:-$HOME}
case "$target_home" in *'"'*|*'%'*|*'`'*|*'\'*|*'
'*) echo 'Unsupported home path for desktop launcher' >&2; exit 1;; esac
install_dir="$target_home/.local/opt/chai-$version"
launcher="$target_home/.local/bin/chai"
desktop_file="$target_home/.local/share/applications/chai.desktop"
for path in "$install_dir" "$launcher" "$desktop_file"; do
  [ ! -L "$path" ] || { echo 'Refusing a symlinked installation target' >&2; exit 1; }
done
if [ -e "$launcher" ] || [ -e "$desktop_file" ]; then
  [ "$upgrade" = '--upgrade' ] || { echo 'Use --upgrade after inspecting the existing CHAI installation.' >&2; exit 1; }
  if [ -e "$launcher" ]; then
    existing=$(cat "$launcher")
    case "$existing" in *APPIMAGE_EXTRACT_AND_RUN=1*'.local/opt/chai-'*'/CHAI.AppImage'*) :;; *) echo 'Existing launcher is not recognized as CHAI; retained.' >&2; exit 1;; esac
  fi
  if [ -e "$desktop_file" ]; then
    existing=$(cat "$desktop_file")
    case "$existing" in *'Name=CHAI'*'StartupWMClass=chai.desktop'*) :;; *) echo 'Existing desktop entry is not recognized; retained.' >&2; exit 1;; esac
  fi
fi
if [ -e "$install_dir" ]; then
  echo 'That version is already installed. Existing files retained.' >&2; exit 1
fi
mkdir -p "$install_dir" "$target_home/.local/bin" "$target_home/.local/share/applications"
cp "$source_image" "$install_dir/CHAI.AppImage"
chmod 755 "$install_dir/CHAI.AppImage"
[ ! -f "$launcher" ] || cp -p "$launcher" "$install_dir/previous-launcher"
[ ! -f "$desktop_file" ] || cp -p "$desktop_file" "$install_dir/previous-desktop-entry"
{
  printf '%s\n' '#!/bin/sh' '# CHAI user launcher' 'export APPIMAGE_EXTRACT_AND_RUN=1'
  printf 'exec "$HOME/.local/opt/chai-%s/CHAI.AppImage" "$@"\n' "$version"
} > "$install_dir/new-launcher"
chmod 755 "$install_dir/new-launcher"
cat > "$install_dir/new-desktop-entry" <<DESKTOP
[Desktop Entry]
Type=Application
Name=CHAI
Comment=Chat Has Actions Inside. Stop chatting. Start doing.
Exec="$launcher"
Terminal=false
Categories=Development;
StartupWMClass=chai.desktop
DESKTOP
mv "$install_dir/new-launcher" "$launcher"
mv "$install_dir/new-desktop-entry" "$desktop_file"
printf 'Installed CHAI %s. Previous version and launcher backups retained. Run %s\n' "$version" "$launcher"

#!/usr/bin/env bash
set -euo pipefail

# ─── easyJSON Universal macOS Build ───
# Builds a universal .app and .dmg (Intel x86_64 + Apple Silicon arm64)
#
# Usage:  npm run build:mac:universal
# Output: src-tauri/target/release/bundle/macos/easyJSON.app (universal)
#         src-tauri/target/release/bundle/dmg/easyJSON_*_universal.dmg

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_TAURI="$PROJECT_DIR/src-tauri"
APP="$SRC_TAURI/target/release/bundle/macos/easyJSON.app"
VERSION=$(cd "$PROJECT_DIR" && node -pe "require('./package.json').version")
DMG_OUT="$SRC_TAURI/target/release/bundle/dmg/easyJSON_${VERSION}_universal.dmg"

echo "========================================="
echo "  easyJSON Universal macOS Build"
echo "========================================="
echo ""

# ── Step 1: Check Rust targets ──────────────────────────────────
echo "▸ Checking Rust targets..."
source "$HOME/.cargo/env" 2>/dev/null || true
for target in aarch64-apple-darwin x86_64-apple-darwin; do
  rustup target list --installed | grep -q "$target" || rustup target add "$target"
done
echo "  ✓ Rust targets ready"
echo ""

# ── Step 2: Tauri build (produces .app with default arch) ───────
echo "▸ Building frontend + bundling .app..."
cd "$PROJECT_DIR"
npm run build --silent
cd "$SRC_TAURI"
cargo build --release
echo "  ✓ .app bundled"
echo ""

# ── Step 3: Build for the other arch & merge ────────────────────
echo "▸ Building for Intel (x86_64)..."
cargo build --release --target x86_64-apple-darwin
echo "  ✓ x86_64 done"

echo "▸ Merging into universal binary..."
lipo -create \
  "$SRC_TAURI/target/release/easy-json" \
  "$SRC_TAURI/target/x86_64-apple-darwin/release/easy-json" \
  -output "$SRC_TAURI/target/release/easy-json-universal"

# Replace binary in .app
cp "$SRC_TAURI/target/release/easy-json-universal" "$APP/Contents/MacOS/easy-json"
codesign --force --sign - "$APP" 2>/dev/null || true
rm -f "$SRC_TAURI/target/release/easy-json-universal"
echo "  ✓ Universal binary installed in .app"
echo ""

# ── Step 4: Create DMG ──────────────────────────────────────────
echo "▸ Creating DMG with Applications shortcut..."

# Clean up any leftover mounts
hdiutil detach /Volumes/easyJSON 2>/dev/null || true
sleep 1

rm -f "$DMG_OUT"

# Create writable DMG (layout NONE for macOS 26 compatibility)
DMG_RW="/tmp/easyjson_rw.dmg"
rm -f "$DMG_RW"
hdiutil create -size 70m -layout NONE -fs "HFS+" -volname "easyJSON" -ov "$DMG_RW" 2>&1 | tail -1

# Mount read-write
DEV=$(hdiutil attach "$DMG_RW" -readwrite -noverify -noautofsck 2>&1 | grep '/Volumes/' | awk '{print $1}')
echo "  Mounted: $DEV"

# Copy .app and create Applications symlink
cp -R "$APP" /Volumes/easyJSON/
ln -s /Applications /Volumes/easyJSON/Applications

# Set custom icon positions (app on left, Applications folder on right)
osascript -e "
tell application \"Finder\"
  tell disk \"easyJSON\"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {400, 200, 900, 500}
    set theViewOptions to the icon view options of container window
    set arrangement of theViewOptions to not arranged
    set icon size of theViewOptions to 72
    set position of item \"easyJSON.app\" to {120, 120}
    set position of item \"Applications\" to {380, 120}
    close
  end tell
end tell
" 2>/dev/null || true

# Detach
hdiutil detach "$DEV" -force 2>&1 | tail -1
sleep 2

# Convert to compressed read-only DMG
hdiutil convert "$DMG_RW" -format UDZO -o "$DMG_OUT" 2>&1 | tail -1
rm -f "$DMG_RW"

echo ""
echo "========================================="
echo "  ✅ Build Complete"
echo "========================================="
echo ""
echo "  .app:  $APP"
file "$APP/Contents/MacOS/easy-json" | head -1 | sed 's/.*: /  arch:  /'
echo "  .dmg:  $DMG_OUT"
echo "  size:  $(du -h "$DMG_OUT" | cut -f1)"
echo ""
echo "  Supported: Intel + Apple Silicon"
echo "  Requires:  macOS 11.0 (Big Sur) and above"

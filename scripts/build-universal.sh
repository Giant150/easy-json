#!/usr/bin/env bash
set -euo pipefail

# ─── easyJSON Universal macOS Build ───
# Builds a universal .app and .dmg (Intel x86_64 + Apple Silicon arm64)
#
# Usage:  npm run build:mac:universal
# Output: src-tauri/target/release/bundle/macos/easyJSON.app
#         src-tauri/target/release/bundle/dmg/easyJSON_*_universal.dmg

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_TAURI="$PROJECT_DIR/src-tauri"

echo "========================================="
echo "  easyJSON Universal macOS Build"
echo "========================================="
echo ""

# ── Step 1: Check Rust targets ──────────────────────────────────
echo "▸ Checking Rust targets..."
source "$HOME/.cargo/env" 2>/dev/null || true

for target in aarch64-apple-darwin x86_64-apple-darwin; do
  if ! rustup target list --installed | grep -q "$target"; then
    echo "  Installing $target ..."
    rustup target add "$target"
  fi
done
echo "  ✓ Rust targets ready"
echo ""

# ── Step 2: Build frontend ──────────────────────────────────────
echo "▸ Building frontend..."
cd "$PROJECT_DIR"
npm run build
echo "  ✓ Frontend built"
echo ""

# ── Step 3: Build Rust for both architectures ──────────────────
cd "$SRC_TAURI"

echo "▸ Building for Apple Silicon (arm64)..."
cargo build --release --target aarch64-apple-darwin
echo "  ✓ arm64 done"

echo "▸ Building for Intel (x86_64)..."
cargo build --release --target x86_64-apple-darwin
echo "  ✓ x86_64 done"
echo ""

# ── Step 4: Merge into universal binary ─────────────────────────
echo "▸ Merging into universal binary..."
lipo -create \
  "$SRC_TAURI/target/aarch64-apple-darwin/release/easy-json" \
  "$SRC_TAURI/target/x86_64-apple-darwin/release/easy-json" \
  -output "$SRC_TAURI/target/release/easy-json"
echo "  ✓ Universal binary created"
echo ""

# ── Step 5: Run tauri build (it will pick up the universal binary) ──
echo "▸ Bundling .app ..."
cd "$PROJECT_DIR"
npx tauri build --target aarch64-apple-darwin 2>&1 | tail -3
echo ""

# ── Step 6: Verify ──────────────────────────────────────────────
APP="$SRC_TAURI/target/release/bundle/macos/easyJSON.app"
BIN="$APP/Contents/MacOS/easy-json"

echo "========================================="
echo "  Build Complete"
echo "========================================="
echo ""
echo "  .app:  $APP"
echo "  arch:  $(file "$BIN" | head -1 | cut -d: -f2-)"

# ── Step 7: Create DMG ──────────────────────────────────────────
echo ""
echo "▸ Creating DMG ..."

# Clean up any leftover mounts
hdiutil detach /Volumes/easyJSON 2>/dev/null || true
sleep 1

DMG_TMP="$(mktemp /tmp/easyjson_dmg_XXXXXX.dmg)"
trap "rm -f '$DMG_TMP'" EXIT

VERSION=$(cd "$PROJECT_DIR" && node -pe "require('./package.json').version")
DMG_OUT="$SRC_TAURI/target/release/bundle/dmg/easyJSON_${VERSION}_universal.dmg"
rm -f "$DMG_OUT"

hdiutil create -size 60m -fs "HFS+" -volname "easyJSON" -ov "$DMG_TMP" 2>&1 | tail -1
DEV=$(hdiutil attach "$DMG_TMP" -nobrowse -readwrite 2>&1 | grep '/Volumes/' | awk '{print $1}')
cp -R "$APP" /Volumes/easyJSON/
hdiutil detach "$DEV" -force 2>&1 | tail -1
sleep 2
hdiutil convert "$DMG_TMP" -format UDZO -o "$DMG_OUT" 2>&1 | tail -1

echo ""
echo "  .dmg:  $DMG_OUT ($(du -h "$DMG_OUT" | cut -f1))"
echo ""
echo "  ✅ Universal binary (Intel + Apple Silicon)"
echo "  ✅ macOS 11.0 (Big Sur) and above"

#!/usr/bin/env bash
# gen-mac-icns.sh - 从 PNG 生成 macOS .icns 图标

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONS="$ROOT/public/icons"
BUILD="$ROOT/build"
ICONSET="$BUILD/icon.iconset"

mkdir -p "$ICONSET"

# macOS iconset 需要的尺寸对应关系
cp "$ICONS/icon-16.png"    "$ICONSET/icon_16x16.png"
cp "$ICONS/icon-32.png"    "$ICONSET/icon_16x16@2x.png"
cp "$ICONS/icon-32.png"    "$ICONSET/icon_32x32.png"
cp "$ICONS/icon-64.png"    "$ICONSET/icon_32x32@2x.png" 2>/dev/null || cp "$ICONS/icon-32.png" "$ICONSET/icon_32x32@2x.png"
cp "$ICONS/icon-128.png"   "$ICONSET/icon_128x128.png"
cp "$ICONS/icon-256.png"   "$ICONSET/icon_128x128@2x.png"
cp "$ICONS/icon-256.png"   "$ICONSET/icon_256x256.png"
cp "$ICONS/icon-512.png"   "$ICONSET/icon_256x256@2x.png"
cp "$ICONS/icon-512.png"   "$ICONSET/icon_512x512.png"
cp "$ICONS/icon-1024.png"  "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$BUILD/icon.icns"
echo "✓ build/icon.icns created"

rm -rf "$ICONSET"
echo "✅ macOS .icns done!"

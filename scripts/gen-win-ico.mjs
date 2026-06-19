/**
 * gen-win-ico.mjs
 * 从多个 PNG 生成 Windows .ico 文件（包含 16,32,48,256 尺寸）
 * 使用 sharp 手动拼合 ICO 格式
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ICONS_DIR = path.join(ROOT, 'public/icons')
const BUILD_DIR = path.join(ROOT, 'build')

// ICO 格式包含的尺寸（标准 Windows 图标尺寸）
const ICO_SIZES = [16, 32, 48, 256]

/**
 * 将多个 PNG buffer 打包成 ICO 格式
 */
function buildIco(images) {
  const numImages = images.length
  const dirEntrySize = 16
  const headerSize = 6
  const dirSize = headerSize + numImages * dirEntrySize

  let imageDataOffset = dirSize
  const entries = []

  for (const { buf, width, height } of images) {
    entries.push({
      width: width >= 256 ? 0 : width,  // 256 用 0 表示
      height: height >= 256 ? 0 : height,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: buf.length,
      imageOffset: imageDataOffset,
    })
    imageDataOffset += buf.length
  }

  const totalSize = imageDataOffset
  const ico = Buffer.alloc(totalSize)
  let offset = 0

  // ICO 文件头
  ico.writeUInt16LE(0, offset); offset += 2        // reserved
  ico.writeUInt16LE(1, offset); offset += 2        // type: 1 = ICO
  ico.writeUInt16LE(numImages, offset); offset += 2 // count

  // 目录项
  for (const e of entries) {
    ico.writeUInt8(e.width, offset); offset += 1
    ico.writeUInt8(e.height, offset); offset += 1
    ico.writeUInt8(e.colorCount, offset); offset += 1
    ico.writeUInt8(e.reserved, offset); offset += 1
    ico.writeUInt16LE(e.planes, offset); offset += 2
    ico.writeUInt16LE(e.bitCount, offset); offset += 2
    ico.writeUInt32LE(e.bytesInRes, offset); offset += 4
    ico.writeUInt32LE(e.imageOffset, offset); offset += 4
  }

  // 图像数据
  for (const { buf } of images) {
    buf.copy(ico, offset)
    offset += buf.length
  }

  return ico
}

// 加载各尺寸 PNG（以 PNG 格式写入 ICO，Windows 10+ 支持 PNG-in-ICO）
const images = []
for (const size of ICO_SIZES) {
  const srcPath = path.join(ICONS_DIR, `icon-${size}.png`)
  const buf = await sharp(srcPath).png().toBuffer()
  images.push({ buf, width: size, height: size })
  console.log(`  loaded ${size}x${size}`)
}

const ico = buildIco(images)
const dest = path.join(BUILD_DIR, 'icon.ico')
fs.writeFileSync(dest, ico)
console.log(`✓ ${dest}`)
console.log('✅ Windows .ico done!')

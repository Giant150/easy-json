/**
 * gen-icons.mjs
 * 从 public/images/logo.png (白底黑色 logo) 生成各平台图标
 * 
 * 输出:
 *  - public/icons/icon-16.png
 *  - public/icons/icon-32.png
 *  - public/icons/icon-48.png
 *  - public/icons/icon-128.png
 *  - public/icons/icon-256.png
 *  - public/icons/icon-512.png
 *  - public/icons/icon-1024.png   (macOS 用)
 *  - build/icon.png               (electron-builder 用, 1024px)
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC  = path.join(ROOT, 'public/images/logo.png')
const ICONS_DIR = path.join(ROOT, 'public/icons')
const BUILD_DIR = path.join(ROOT, 'build')

fs.mkdirSync(ICONS_DIR, { recursive: true })
fs.mkdirSync(BUILD_DIR, { recursive: true })

/**
 * 给 logo 添加圆角背景，适合作为应用图标。
 * logo 是白底黑色图形，我们合成一个：
 *   - 深色背景 (#111111) 圆角矩形
 *   - logo 图形反色为白色 (白底黑字 → 黑底白字)
 */
async function makeIconWithBg(size) {
  const pad = Math.round(size * 0.1) // 10% padding
  const inner = size - pad * 2

  // 先把 logo 缩放并反色（白底黑图 → 黑底白图）
  const logoWhite = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 17, g: 17, b: 17, alpha: 1 } })
    // negate 把黑色变白色，背景由深色补充
    .negate({ alpha: false })
    .toBuffer()

  // 创建圆角背景
  const radius = Math.round(size * 0.22) // 22% border-radius (macOS 风格)
  const bg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#111111"/>
    </svg>
  `)

  // 合成
  return await sharp(bg)
    .composite([{ input: logoWhite, top: pad, left: pad }])
    .png()
    .toBuffer()
}

const sizes = [16, 32, 48, 128, 256, 512, 1024]

for (const size of sizes) {
  const buf = await makeIconWithBg(size)
  const dest = path.join(ICONS_DIR, `icon-${size}.png`)
  fs.writeFileSync(dest, buf)
  console.log(`✓ ${dest}`)
}

// Copy 1024px as build/icon.png (for electron-builder)
const buf1024 = fs.readFileSync(path.join(ICONS_DIR, 'icon-1024.png'))
fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), buf1024)
console.log(`✓ build/icon.png`)

console.log('\n✅ All icons generated!')

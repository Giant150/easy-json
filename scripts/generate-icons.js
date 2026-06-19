import sharp from 'sharp'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'

const LOGO = 'public/images/logo.png'
const BUILD_DIR = 'build'

// Icon sizes for ICO (must be 256 or less for ICO directory entry byte)
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

// ICNS icon types → macOS display sizes
const ICNS_SIZES = [
  { size: 16, osType: 'icp4' },
  { size: 32, osType: 'icp5' },
  { size: 64, osType: 'icp6' },
  { size: 128, osType: 'ic07' },
  { size: 256, osType: 'ic08' },
  { size: 512, osType: 'ic09' },
  { size: 1024, osType: 'ic10' },
]

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function generateIco() {
  // Read all PNG sizes into memory
  const images = []
  for (const size of ICO_SIZES) {
    const buf = await sharp(LOGO).resize(size, size).png().toBuffer()
    images.push({ size, buf })
  }

  // ICO header: 6 bytes
  const count = images.length
  const dataOffset = 6 + 16 * count

  const header = Buffer.alloc(6 + 16 * count)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: ICO
  header.writeUInt16LE(count, 4) // image count

  const imageBuffers = []
  let offset = dataOffset

  for (let i = 0; i < count; i++) {
    const { size, buf } = images[i]
    const w = size >= 256 ? 0 : size // 0 means 256 in ICO dir entry
    const h = size >= 256 ? 0 : size

    const entryOffset = 6 + i * 16
    header.writeUInt8(w, entryOffset)          // width
    header.writeUInt8(h, entryOffset + 1)       // height
    header.writeUInt8(0, entryOffset + 2)       // palette
    header.writeUInt8(0, entryOffset + 3)       // reserved
    header.writeUInt16LE(1, entryOffset + 4)    // planes
    header.writeUInt16LE(32, entryOffset + 6)   // bpp
    header.writeUInt32LE(buf.length, entryOffset + 8)  // size
    header.writeUInt32LE(offset, entryOffset + 12)     // offset

    imageBuffers.push(buf)
    offset += buf.length
  }

  const ico = Buffer.concat([header, ...imageBuffers])
  writeFileSync(join(BUILD_DIR, 'icon.ico'), ico)
  console.log(`  ✓ icon.ico (${(ico.length / 1024).toFixed(0)} KB, ${count} sizes)`)
}

async function generateIcns() {
  // ICNS = concatenated icon entries, each: osType(4) + len(4) + data
  const entries = []

  for (const { size, osType } of ICNS_SIZES) {
    // For retina types (size >= 512), include @2x variants
    const pngBuf = await sharp(LOGO).resize(size, size).png().toBuffer()
    const header = Buffer.alloc(8)
    header.write(osType, 0, 'ascii')
    header.writeUInt32BE(8 + pngBuf.length, 4)
    entries.push(Buffer.concat([header, pngBuf]))
  }

  const body = Buffer.concat(entries)
  const fileHeader = Buffer.alloc(8)
  fileHeader.write('icns', 0, 'ascii')
  fileHeader.writeUInt32BE(8 + body.length, 4)

  const icns = Buffer.concat([fileHeader, body])
  writeFileSync(join(BUILD_DIR, 'icon.icns'), icns)
  console.log(`  ✓ icon.icns (${(icns.length / 1024).toFixed(0)} KB, ${ICNS_SIZES.length} sizes)`)
}

// Also generate a 512px icon.png as fallback
async function generatePng() {
  const buf = await sharp(LOGO).resize(512, 512).png().toBuffer()
  writeFileSync(join(BUILD_DIR, 'icon.png'), buf)
  console.log(`  ✓ icon.png (512×512, ${(buf.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  if (!existsSync(LOGO)) {
    console.error(`Logo not found: ${LOGO}`)
    process.exit(1)
  }

  ensureDir(BUILD_DIR)
  console.log('Generating icons from', LOGO)

  await Promise.all([generateIco(), generateIcns(), generatePng()])

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

/**
 * resources/icon.svg → resources/icon.ico, every size Windows asks for, plus
 * the Microsoft Store tiles in resources/appx (electron-builder packs them
 * into the Store build). Run after editing the logo: `node scripts/make-icon.cjs`.
 *
 * Each size is rendered from the vector (not scaled down from one bitmap),
 * then packed as PNG entries, which Windows has read since Vista.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const SIZES = [16, 24, 32, 48, 64, 128, 256]
const root = path.join(__dirname, '..', 'resources')

async function main() {
  const svg = fs.readFileSync(path.join(root, 'icon.svg'))
  const pngs = await Promise.all(SIZES.map((size) => sharp(svg, { density: Math.max(72, (size / 512) * 72 * 4) }).resize(size, size).png().toBuffer()))

  // ICONDIR, then one 16-byte ICONDIRENTRY per image, then the images.
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(SIZES.length, 4)
  let offset = 6 + 16 * SIZES.length
  const entries = SIZES.map((size, i) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2) // no palette
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(pngs[i].length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += pngs[i].length
    return entry
  })
  fs.writeFileSync(path.join(root, 'icon.ico'), Buffer.concat([header, ...entries, ...pngs]))
  fs.writeFileSync(path.join(root, 'icon.png'), await sharp(svg, { density: 288 }).resize(512, 512).png().toBuffer())

  // Store tiles: the logo on the tile colour (appx.backgroundColor), square
  // ones filled edge to edge, the wide one centred.
  const TILE = '#111113'
  const appx = path.join(root, 'appx')
  fs.mkdirSync(appx, { recursive: true })
  const square = { 'StoreLogo.png': 50, 'Square44x44Logo.png': 44, 'SmallTile.png': 71, 'Square150x150Logo.png': 150, 'LargeTile.png': 310 }
  for (const [name, size] of Object.entries(square)) {
    await sharp(svg, { density: Math.max(72, (size / 512) * 72 * 4) }).resize(size, size).png().toFile(path.join(appx, name))
  }
  const logo = await sharp(svg, { density: 144 }).resize(150, 150).png().toBuffer()
  await sharp({ create: { width: 310, height: 150, channels: 4, background: TILE } })
    .composite([{ input: logo, left: 80, top: 0 }])
    .png()
    .toFile(path.join(appx, 'Wide310x150Logo.png'))
  console.log(`icon.ico: ${SIZES.join(', ')} px; icon.png: 512 px; Store tiles: ${Object.keys(square).length + 1} in resources/appx`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

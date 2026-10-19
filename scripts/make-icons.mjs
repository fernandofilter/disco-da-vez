// Rasteriza a marca (public/favicon.svg) em favicon.ico e PNGs, sem dependências: `node scripts/make-icons.mjs`
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const INK = [0x15, 0x17, 0x1c], PAPER = [0xf2, 0xf3, 0xf6], RED = [0xdc, 0x2a, 0x2b]

// camadas na mesma ordem e medidas do SVG (viewBox 64); `rx` = canto do quadrado de tinta
const layers = (rx) => [
  (x, y) => (inRound(x, y, rx) ? INK : null),
  (x, y) => (Math.hypot(x - 31, y - 34) <= 19 ? PAPER : null),
  (x, y) => (Math.abs(Math.hypot(x - 31, y - 34) - 11) <= 1.2 ? INK : null),
  (x, y) => (Math.hypot(x - 31, y - 34) <= 3.8 ? INK : null),
  (x, y) => (Math.hypot(x - 51, y - 13) <= 8 ? RED : null),
  (x, y) => (Math.abs(Math.hypot(x - 51, y - 13) - 8) <= 1.3 ? PAPER : null),
]
function inRound(x, y, r) {
  const dx = Math.max(r - x, x - (64 - r), 0), dy = Math.max(r - y, y - (64 - r), 0)
  return x >= 0 && x <= 64 && y >= 0 && y <= 64 && dx * dx + dy * dy <= r * r
}

function render(size, rx) {
  const L = layers(rx), N = 4, px = Buffer.alloc(size * size * 4)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          const x = ((i + (sx + 0.5) / N) / size) * 64, y = ((j + (sy + 0.5) / N) / size) * 64
          let c = null
          for (const f of L) c = f(x, y) ?? c
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++ }
        }
      const o = (j * size + i) * 4
      if (a) [px[o], px[o + 1], px[o + 2]] = [r / a, g / a, b / a].map(Math.round)
      px[o + 3] = Math.round((a / (N * N)) * 255)
    }
  return png(size, px)
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const t = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(t.length + 8)
  out.writeUInt32BE(data.length, 0)
  t.copy(out, 4)
  out.writeUInt32BE(crc(t), t.length + 4)
  return out
}
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function ico(sizes) {
  const imgs = sizes.map((s) => render(s, 8))
  const head = Buffer.alloc(6 + 16 * imgs.length)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(imgs.length, 4)
  let off = head.length
  imgs.forEach((img, k) => {
    head.set([sizes[k] % 256, sizes[k] % 256, 0, 0], 6 + 16 * k)
    head.writeUInt16LE(1, 10 + 16 * k)
    head.writeUInt16LE(32, 12 + 16 * k)
    head.writeUInt32LE(img.length, 14 + 16 * k)
    head.writeUInt32LE(off, 18 + 16 * k)
    off += img.length
  })
  return Buffer.concat([head, ...imgs])
}

writeFileSync('public/favicon.ico', ico([16, 32, 48]))
writeFileSync('public/icon-192.png', render(192, 8))
writeFileSync('public/icon-512.png', render(512, 8))
writeFileSync('public/apple-touch-icon.png', render(180, 0)) // iOS arredonda sozinho; sem transparência para não ficar preto
console.log('ok')

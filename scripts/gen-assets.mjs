import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '..', 'public', 'assets')
mkdirSync(OUT, { recursive: true })

// ── PNG encoder ──────────────────────────────────────────────────────────────

const _crc = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    _crc[n] = c
}
const crc32 = buf => {
    let c = 0xFFFFFFFF
    for (const b of buf) c = _crc[(c ^ b) & 0xFF] ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
}
const mkChunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(body), 0)
    return Buffer.concat([len, body, crcBuf])
}
const toPNG = (px, w, h) => {
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const hdr = Buffer.alloc(13)
    hdr.writeUInt32BE(w, 0); hdr.writeUInt32BE(h, 4)
    hdr[8] = 8; hdr[9] = 6
    const stride = 1 + w * 4
    const raw = Buffer.alloc(stride * h)
    for (let y = 0; y < h; y++) {
        raw[y * stride] = 0
        for (let x = 0; x < w; x++) {
            const s = (y * w + x) * 4, d = y * stride + 1 + x * 4
            raw[d] = px[s]; raw[d + 1] = px[s + 1]; raw[d + 2] = px[s + 2]; raw[d + 3] = px[s + 3]
        }
    }
    return Buffer.concat([sig, mkChunk('IHDR', hdr), mkChunk('IDAT', deflateSync(raw)), mkChunk('IEND', Buffer.alloc(0))])
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// String-art palette
const PAL = {
    '.': [0, 0, 0, 0],
    'S': [244, 196, 143, 255],  // skin
    'B': [50, 100, 210, 255],   // player blue
    'b': [20, 55, 140, 255],    // dark blue / gun
    'G': [40, 160, 40, 255],    // zombie green
    'g': [15, 90, 15, 255],     // dark zombie green
    'r': [220, 40, 40, 255],    // red eyes
    'Y': [230, 185, 20, 255],   // yellow / gold
    'y': [150, 110, 0, 255],    // dark yellow
    'K': [20, 20, 20, 255],     // black
    'W': [22, 8, 4, 255],       // wall mortar
    'w': [78, 22, 8, 255],      // wall brick
    'x': [96, 32, 14, 255],     // brick highlight
    'F': [38, 38, 36, 255],     // floor grout
    'f': [54, 54, 50, 255],     // floor tile
}

const art = rows => {
    const h = rows.length, w = rows[0].length
    const px = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const col = PAL[rows[y][x]] ?? [255, 0, 255, 255]
            const i = (y * w + x) * 4
            px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = col[3]
        }
    return { px, w, h }
}

// Procedural canvas
const mkCanvas = (w, h) => {
    const px = new Uint8Array(w * h * 4)
    const set = (x, y, r, g, b, a = 255) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return
        const i = (y * w + x) * 4
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a
    }
    const fill = (x, y, fw, fh, r, g, b, a = 255) => {
        for (let dy = 0; dy < fh; dy++)
            for (let dx = 0; dx < fw; dx++)
                set(x + dx, y + dy, r, g, b, a)
    }
    const ring = (cx, cy, outerR, innerR, r, g, b, a = 255) => {
        for (let py = cy - outerR; py <= cy + outerR; py++)
            for (let px2 = cx - outerR; px2 <= cx + outerR; px2++) {
                const d2 = (px2 - cx) ** 2 + (py - cy) ** 2
                if (d2 <= outerR ** 2 && d2 > innerR ** 2)
                    set(px2, py, r, g, b, a)
            }
    }
    return { px, set, fill, ring, w, h }
}

const save = (name, { px, w, h }) => {
    writeFileSync(join(OUT, name), toPNG(px, w, h))
    console.log(`  ${name.padEnd(22)} ${w}x${h}`)
}

console.log('Generating assets...')

// ── Player 20x20 ─────────────────────────────────────────────────────────────
save('player.png', art([
    '....................',
    '......SSSSSS........',
    '.....SSSSSSSS.......',
    '.....SS.SS.SS.......',
    '.....SSSSSSSS.......',
    '......SSSSSS........',
    '.....BBBBBBBB.......',
    '...BBBBBBBBBBBBbb...',
    '...BBBBBBBBBBBBbb...',
    '.....BBBBBBBB.......',
    '.....BB....BB.......',
    '.....BB....BB.......',
    '.....BB....BB.......',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
]))

// ── Zombie 20x20 ─────────────────────────────────────────────────────────────
save('zombie.png', art([
    '....................',
    '......GGGGGG........',
    '.....GGGGGGGG.......',
    '.....GGrGGrGG.......',
    '.....GGGGGGGG.......',
    '......GGGGGG........',
    'GGG...GGGGGG...GGG..',
    'GGG...GGGGGG...GGG..',
    'GGG...GGGGGG...GGG..',
    '......GGGGGG........',
    '......GG..GG........',
    '......GG..GG........',
    '......GG..GG........',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
]))

// ── Bullet 14x4 ──────────────────────────────────────────────────────────────
save('bullet.png', art([
    '..YYYYYYYYYY..',
    '.YyYYYYYYYYYY.',
    '.YyYYYYYYYYYY.',
    '..YYYYYYYYYY..',
]))

// ── Ammo 16x10 ───────────────────────────────────────────────────────────────
save('ammo.png', art([
    '................',
    '.YYYYYYYYYY.....',
    '.YKKYKKYKKKY....',
    '.YYYYYYYYYYy....',
    '.YKKYKKYKKKY....',
    '.YYYYYYYYYYy....',
    '.yyyyyyyyyy.....',
    '................',
    '................',
    '................',
]))

// ── Key 26x14 (replicates original Canvas drawing) ───────────────────────────
{
    const c = mkCanvas(26, 14)
    const gold = [255, 215, 0]
    c.ring(6, 7, 5, 3, ...gold)    // ring: center (6,7), outer r=5, inner hole r=3
    c.fill(10, 6, 14, 2, ...gold)  // shaft
    c.fill(16, 8, 2, 4, ...gold)   // tooth 1
    c.fill(20, 8, 2, 3, ...gold)   // tooth 2
    save('key.png', c)
}

// ── Exit locked 20x20 ────────────────────────────────────────────────────────
{
    const c = mkCanvas(20, 20)
    // Frame
    c.fill(0, 0, 20, 20, 55, 24, 7)
    // Door panels — red (locked)
    c.fill(2, 2, 8, 16, 140, 22, 22)
    c.fill(11, 2, 7, 16, 140, 22, 22)
    // Center split
    c.fill(9, 2, 2, 16, 55, 24, 7)
    // Padlock body
    c.fill(8, 10, 4, 4, 170, 170, 170)
    // Shackle
    c.fill(9, 7, 2, 4, 170, 170, 170)
    c.fill(8, 7, 1, 3, 170, 170, 170)
    c.fill(11, 7, 1, 3, 170, 170, 170)
    // Keyhole
    c.fill(9, 11, 2, 2, 55, 55, 55)
    save('exit-locked.png', c)
}

// ── Exit open 20x20 ──────────────────────────────────────────────────────────
{
    const c = mkCanvas(20, 20)
    // Frame
    c.fill(0, 0, 20, 20, 55, 24, 7)
    // Door panels — green (open)
    c.fill(2, 2, 8, 16, 20, 140, 30)
    c.fill(11, 2, 7, 16, 20, 140, 30)
    // Center split
    c.fill(9, 2, 2, 16, 55, 24, 7)
    // Arrow pointing right (white)
    c.fill(6, 9, 8, 2, 240, 240, 240)   // arrow shaft
    c.fill(11, 7, 3, 6, 240, 240, 240)  // arrowhead block
    save('exit-open.png', c)
}

// ── Wall 16x16 (scaled 4x to 64x64 in game) ──────────────────────────────────
save('wall.png', art([
    'WWWWWWWWWWWWWWWW',
    'WwwwwwxWwwwwwxwW',
    'WwwwwwxWwwwwwxwW',
    'WwwwwwxWwwwwwxwW',
    'WWWWWWWWWWWWWWWW',
    'WwwxWwwwwwwwxwwW',
    'WwwxWwwwwwwwxwwW',
    'WwwxWwwwwwwwxwwW',
    'WWWWWWWWWWWWWWWW',
    'WwwwwwxWwwwwwxwW',
    'WwwwwwxWwwwwwxwW',
    'WwwwwwxWwwwwwxwW',
    'WWWWWWWWWWWWWWWW',
    'WwwxWwwwwwwwxwwW',
    'WwwxWwwwwwwwxwwW',
    'WwwxWwwwwwwwxwwW',
]))

// ── Floor 16x16 (scaled 4x to 64x64 in game) ─────────────────────────────────
save('floor.png', art([
    'FFFFFFFFFFFFFFFF',
    'FffffffFfffffffF',
    'FffffffFfffffffF',
    'FffffffFfffffffF',
    'FffffffFfffffffF',
    'FffffffFfffffffF',
    'FffffffFfffffffF',
    'FFFFFFFFFFFFFFFF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FfffffffFffffffF',
    'FFFFFFFFFFFFFFFF',
]))

console.log('Done.')

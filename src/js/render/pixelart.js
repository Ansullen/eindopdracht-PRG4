// Hand-authored pixel-art sprites for the first-person view, built onto canvases at load.
// The existing PNGs are top-down views, so the billboarded zombie + FP gun are authored here.

function makeSprite(rows, palette) {
    const h = rows.length
    const w = rows[0].length
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const col = palette[rows[y][x]]
            if (!col) continue
            ctx.fillStyle = col
            ctx.fillRect(x, y, 1, 1)
        }
    }
    return c
}

// ---- glitch entities: unstable masses of dark static; only the eyes hold still ----
const ENT_W = 20
const ENT_H = 30

function entityBodyAt(x, y) {
    const cx = ENT_W / 2
    const head = ((x - cx + 0.5) / 4.2) ** 2 + ((y - 6) / 4.6) ** 2 < 1
    const torso = y >= 9 && y <= 21 &&
        Math.abs(x - cx + Math.sin(y * 1.7) * 1.2) < 3.2 + (y - 9) * 0.28
    const skirt = y > 21 && Math.abs(x - cx) < 6.5 &&
        (x * 7 + 3) % 5 > 1 && y < 23 + ((x * 13) % 7)
    return head || torso || skirt
}

function makeEntityVariant(attack) {
    const c = document.createElement('canvas')
    c.width = ENT_W
    c.height = ENT_H
    const ctx = c.getContext('2d')
    for (let y = 0; y < ENT_H; y++) {
        const shift = Math.random() < 0.28 ? Math.round((Math.random() - 0.5) * 5) : 0
        for (let x = 0; x < ENT_W; x++) {
            if (!entityBodyAt(x, y)) continue
            if (Math.random() < 0.14) continue // erosion — it never fully resolves
            const r = Math.random()
            ctx.fillStyle = r < 0.72 ? '#0a0404' : r < 0.9 ? '#1c0b09' : '#43100a'
            ctx.fillRect(x + shift, y, 1, 1)
        }
    }
    // stray signal artifacts in the mass
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(210,32,16,0.5)'
        ctx.fillRect(Math.random() * ENT_W | 0, 4 + Math.random() * (ENT_H - 8) | 0,
            1 + Math.random() * 3 | 0, 1 + Math.random() * 2 | 0)
    }
    // the eyes are the only stable thing about it
    ctx.fillStyle = 'rgba(255,60,40,0.4)'
    ctx.fillRect(6, 4, 4, 4)
    ctx.fillRect(11, 4, 4, 4)
    ctx.fillStyle = attack ? '#ff5030' : '#ff2b1b'
    ctx.fillRect(7, 5, 2, 2)
    ctx.fillRect(12, 5, 2, 2)
    if (attack) {
        // the maw: a void that opens when it lunges
        ctx.fillStyle = '#000000'
        ctx.fillRect(8, 9, 5, 8)
        ctx.fillStyle = 'rgba(170,22,10,0.85)'
        ctx.fillRect(8, 9, 5, 1)
        ctx.fillRect(8, 16, 5, 1)
    }
    return c
}

// ---- abstract bloody walls, generated at load — never the same twice ----
function makeBloodWall(intense) {
    const S = 32
    const c = document.createElement('canvas')
    c.width = S
    c.height = S
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(S, S)
    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random()
        img.data[i] = (intense ? 14 : 24) + v * (intense ? 36 : 26)
        img.data[i + 1] = 3 + v * 7
        img.data[i + 2] = 3 + v * 6
        img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    // organic blotches
    for (let i = 0; i < (intense ? 11 : 7); i++) {
        const x = Math.random() * S | 0
        const y = Math.random() * S | 0
        const rw = 2 + Math.random() * 7 | 0
        const rh = 2 + Math.random() * 5 | 0
        ctx.fillStyle = Math.random() < 0.5
            ? 'rgba(0,0,0,0.55)'
            : `rgba(${95 + Math.random() * 70 | 0},10,6,0.5)`
        ctx.fillRect(x, y, rw, rh)
        ctx.fillRect(x + 1, y - 1, Math.max(rw - 2, 1), rh + 2)
    }
    // drips running down, brighter at the head
    for (let i = 0; i < (intense ? 8 : 5); i++) {
        const x = Math.random() * S | 0
        const len = 6 + Math.random() * (S - 6) | 0
        const bright = intense ? 150 : 115
        ctx.fillStyle = `rgba(${bright},12,8,0.75)`
        ctx.fillRect(x, 0, 1, len)
        ctx.fillStyle = `rgba(${bright + 45},22,12,0.9)`
        ctx.fillRect(x, len - 2, 1, 2)
    }
    // sinew lines
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(60,6,4,0.6)'
        ctx.fillRect(0, Math.random() * S | 0, S, 1)
    }
    return c
}

// variant pools: the view flickers between these so nothing ever holds still
export function makeBloodWallSet() {
    const mk = (intense, n) => Array.from({ length: n }, () => makeBloodWall(intense))
    return { normal: mk(false, 3), other: mk(true, 3) }
}

const GUN_PALETTE = {
    'o': '#05070a', // outline
    'd': '#1a1f26', // gunmetal
    'D': '#39424d', // metal edge highlight
    'M': '#59646f', // slide top shine
    'h': '#2c3a2e', // gloved hand
    'H': '#425543', // glove highlight
}

const GUN_IDLE = [
    '........oMMMMo..........',
    '........oDddDo..........',
    '........odddddo.........',
    '........odddddo.........',
    '........oDdddDo.........',
    '........odddddo.........',
    '.......oodddddoo........',
    '......ohhodddohho.......',
    '.....ohhhhdddhhhho......',
    '....ohhHhhdddhhHhho.....',
    '....ohhhhhdddhhhhho.....',
    '....ohhhhhdddhhhhho.....',
    '.....ohhhhdddhhhho......',
    '.....ohhhhhdhhhhho......',
    '......ohhhhhhhhho.......',
    '......ohhhhhhhhho.......',
    '.......ohhhhhhho........',
    '.......ohhhhhhho........',
    '........ohhhhho.........',
    '........ohhhhho.........',
]

const GUN_RECOIL = [
    '........................',
    '........................',
    '........oMMMMo..........',
    '........oDddDo..........',
    '........odddddo.........',
    '.......oodddddoo........',
    '......ohhodddohho.......',
    '.....ohhhhdddhhhho......',
    '....ohhHhhdddhhHhho.....',
    '....ohhhhhdddhhhhho.....',
    '....ohhhhhdddhhhhho.....',
    '.....ohhhhdddhhhho......',
    '.....ohhhhhdhhhhho......',
    '......ohhhhhhhhho.......',
    '......ohhhhhhhhho.......',
    '.......ohhhhhhho........',
    '.......ohhhhhhho........',
    '........ohhhhho.........',
    '........ohhhhho.........',
    '........................',
]

function makeMuzzleFlash() {
    const c = document.createElement('canvas')
    c.width = 24
    c.height = 24
    const ctx = c.getContext('2d')
    const cx = 12, cy = 12
    ctx.fillStyle = '#ff9a1c'
    for (const [w, l] of [[3, 11], [2, 8]]) {
        ctx.save()
        ctx.translate(cx, cy)
        if (l === 8) ctx.rotate(Math.PI / 4)
        ctx.fillRect(-l, -w / 2, l * 2, w)
        ctx.fillRect(-w / 2, -l, w, l * 2)
        ctx.restore()
    }
    ctx.fillStyle = '#ffe95e'
    ctx.fillRect(cx - 6, cy - 2, 12, 4)
    ctx.fillRect(cx - 2, cy - 6, 4, 12)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 3, cy - 3, 6, 6)
    return c
}

function makeBulletSprite() {
    const c = document.createElement('canvas')
    c.width = 5
    c.height = 5
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ff8a2a'
    ctx.fillRect(0, 1, 5, 3)
    ctx.fillRect(1, 0, 3, 5)
    ctx.fillStyle = '#fff3b0'
    ctx.fillRect(1, 1, 3, 3)
    return c
}

function makeSplatSprite() {
    const c = document.createElement('canvas')
    c.width = 14
    c.height = 8
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#4a0d0d'
    ctx.fillRect(2, 3, 10, 4)
    ctx.fillRect(4, 1, 5, 6)
    ctx.fillRect(0, 4, 3, 2)
    ctx.fillRect(11, 2, 3, 3)
    ctx.fillStyle = '#7a1616'
    ctx.fillRect(4, 3, 6, 3)
    return c
}

// low-res screaming face for single-frame inserts — mostly shadow and mouth
export function makeFace() {
    const c = document.createElement('canvas')
    c.width = 48
    c.height = 64
    const ctx = c.getContext('2d')
    // head shadow
    ctx.fillStyle = '#1a0d0b'
    ctx.fillRect(8, 4, 32, 52)
    ctx.fillRect(4, 12, 40, 36)
    // gaunt cheek highlights, asymmetric
    ctx.fillStyle = '#3d2420'
    ctx.fillRect(10, 14, 10, 22)
    ctx.fillRect(29, 12, 9, 26)
    // hollow eyes, uneven
    ctx.fillStyle = '#000000'
    ctx.fillRect(12, 18, 9, 10)
    ctx.fillRect(28, 16, 10, 12)
    ctx.fillStyle = '#c9b8b4'
    ctx.fillRect(16, 22, 2, 2)
    ctx.fillRect(33, 21, 2, 2)
    // screaming mouth, torn wide
    ctx.fillStyle = '#000000'
    ctx.fillRect(17, 36, 14, 18)
    ctx.fillRect(14, 40, 20, 10)
    ctx.fillStyle = '#5a0f08'
    ctx.fillRect(19, 50, 10, 4)
    // noise speckle so it reads as a corrupted frame, not a drawing
    for (let i = 0; i < 160; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(120,30,20,0.35)'
        ctx.fillRect(Math.random() * 48 | 0, Math.random() * 64 | 0, 1, 1)
    }
    return c
}

// glitched variant of the wall texture: row slices shifted + red channel pushed
export function makeCorruptTexture(img) {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    for (let y = 0; y < img.height; y += 2) {
        const shift = Math.floor((Math.random() - 0.5) * 8)
        ctx.drawImage(img, 0, y, img.width, 2, shift, y, img.width, 2)
        ctx.drawImage(img, 0, y, img.width, 2, shift - img.width, y, img.width, 2)
    }
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = 'rgba(255,50,30,0.35)'
    ctx.fillRect(0, 0, c.width, c.height)
    return c
}

// solid-white copy of a sprite, swapped in for the 80ms hit flash
function flashVariant(src) {
    const c = document.createElement('canvas')
    c.width = src.width
    c.height = src.height
    const ctx = c.getContext('2d')
    ctx.drawImage(src, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#ffebdc'
    ctx.fillRect(0, 0, c.width, c.height)
    return c
}

function dot(color) {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 2
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 2, 2)
    return c
}

export const Sprites = {
    gunIdle: makeSprite(GUN_IDLE, GUN_PALETTE),
    gunRecoil: makeSprite(GUN_RECOIL, GUN_PALETTE),
    muzzleFlash: makeMuzzleFlash(),
    bullet: makeBulletSprite(),
    splat: makeSplatSprite(),
    particleGreen: dot('#2e4a2e'),
    particleRed: dot('#7a1616'),
}

Sprites.entityIdle = Array.from({ length: 8 }, () => makeEntityVariant(false))
Sprites.entityAttack = Array.from({ length: 4 }, () => makeEntityVariant(true))
Sprites.entityFlash = flashVariant(Sprites.entityIdle[0])

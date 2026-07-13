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

const ZOMBIE_PALETTE = {
    'o': '#060a08', // outline
    'g': '#3d5240', // rotten skin
    'G': '#5a7355', // skin highlight
    'e': '#ff2b1b', // glowing eyes
    'm': '#0c0708', // mouth
    'c': '#14181a', // rags
    'C': '#232a2d', // rags highlight
    'b': '#7a1616', // blood
}

const ZOMBIE_WALK_A = [
    '................',
    '.....oooooo.....',
    '....oggggggo....',
    '....ogGggGgo....',
    '....ogeggego....',
    '....oggggggo....',
    '.....ogmmgo.....',
    '......oggo......',
    '....occccccoo...',
    '...ogcccccccgo..',
    '..ogoccbccocgo..',
    '..ogo.ccccc.ogo.',
    '..oGo.ccccc.oGo.',
    '......ccccc.....',
    '.....occccco....',
    '.....occCcco....',
    '.....occ.cco....',
    '.....occ.cco....',
    '....ogg...ggo...',
    '....ogg...ggo...',
    '....oggo.oggo...',
    '.....ogo.ogo....',
    '....oggo..ggo...',
    '....oGGo..GGo...',
    '................',
    '................',
]

const ZOMBIE_WALK_B = [
    '................',
    '.....oooooo.....',
    '....oggggggo....',
    '....ogGggGgo....',
    '....ogeggego....',
    '....oggggggo....',
    '.....ogmmgo.....',
    '......oggo......',
    '...oocccccco....',
    '..ogcccccccgo...',
    '..ogcoccbccogo..',
    '.ogo.occccc.ogo.',
    '.oGo.occccc.oGo.',
    '.....occccc.....',
    '.....occccco....',
    '.....occCcco....',
    '.....occ.cco....',
    '.....occ.cco....',
    '....ogg...ggo...',
    '....ogg...ggo...',
    '.....ogo.oggo...',
    '....oggo..ogo...',
    '....ogg...oggo..',
    '....oGG...oGGo..',
    '................',
    '................',
]

const ZOMBIE_ATTACK = [
    '................',
    '.....oooooo.....',
    '....oggggggo....',
    '....ogGggGgo....',
    '....oeeggeeo....',
    '....oggggggo....',
    '.....ommmmo.....',
    '......oggo......',
    '..oGGoccccoGGo..',
    '..oggccccccggo..',
    '..oggocbbcoggo..',
    '..ooo.ccccc.ooo.',
    '......ccccc.....',
    '.....occccco....',
    '.....occCcco....',
    '.....occbcco....',
    '.....occ.cco....',
    '.....occ.cco....',
    '....ogg...ggo...',
    '....ogg...ggo...',
    '....oggo.oggo...',
    '....oggo.oggo...',
    '....oggo..ggo...',
    '....oGGo..GGo...',
    '................',
    '................',
]

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

// glitched variant of the wall texture: row slices shifted + green channel pushed
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
    ctx.fillStyle = 'rgba(30,255,80,0.28)'
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
    zombieWalkA: makeSprite(ZOMBIE_WALK_A, ZOMBIE_PALETTE),
    zombieWalkB: makeSprite(ZOMBIE_WALK_B, ZOMBIE_PALETTE),
    zombieAttack: makeSprite(ZOMBIE_ATTACK, ZOMBIE_PALETTE),
    gunIdle: makeSprite(GUN_IDLE, GUN_PALETTE),
    gunRecoil: makeSprite(GUN_RECOIL, GUN_PALETTE),
    muzzleFlash: makeMuzzleFlash(),
    bullet: makeBulletSprite(),
    splat: makeSplatSprite(),
    particleGreen: dot('#2e4a2e'),
    particleRed: dot('#7a1616'),
}

Sprites.zombieWalkAFlash = flashVariant(Sprites.zombieWalkA)
Sprites.zombieWalkBFlash = flashVariant(Sprites.zombieWalkB)
Sprites.zombieAttackFlash = flashVariant(Sprites.zombieAttack)

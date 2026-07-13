// Tiny 3x5 bitmap font for the diegetic camera OSD.
// Glyphs are pre-rendered into one atlas per color; drawText is one drawImage per char.

const GLYPHS = {
    'A': '111101111101101', 'B': '110101110101110', 'C': '111100100100111',
    'D': '110101101101110', 'E': '111100111100111', 'F': '111100111100100',
    'G': '111100101101111', 'H': '101101111101101', 'I': '111010010010111',
    'J': '001001001101111', 'K': '101110100110101', 'L': '100100100100111',
    'M': '111111101101101', 'N': '101111111111101', 'O': '111101101101111',
    'P': '111101111100100', 'Q': '111101101111001', 'R': '111101110101101',
    'S': '111100111001111', 'T': '111010010010010', 'U': '101101101101111',
    'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101',
    'Y': '101101010010010', 'Z': '111001010100111',
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
    '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
    '6': '111100111101111', '7': '111001001010010', '8': '111101111101111',
    '9': '111101111001111',
    ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
    '/': '001001010100100', '<': '001010100010001', '>': '100010001010100',
    '+': '000010111010000', '%': '101001010100101', '#': '010111010111010',
    '@': '010111111111010', // filled dot (REC)
    '}': '100110111110100', // play arrow
    '?': '111001010000010', '!': '010010010000010',
    '[': '110100100100110', ']': '011001001001011',
    '_': '000000000000111', '=': '000111000111000',
}

const CHARS = Object.keys(GLYPHS)
const CW = 4 // 3px glyph + 1px spacing
const CH = 5

function buildAtlas(color) {
    const c = document.createElement('canvas')
    c.width = CHARS.length * CW
    c.height = CH
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    CHARS.forEach((ch, i) => {
        const bits = GLYPHS[ch]
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 3; x++) {
                if (bits[y * 3 + x] === '1') ctx.fillRect(i * CW + x, y, 1, 1)
            }
        }
    })
    return c
}

const atlases = {}
const index = Object.fromEntries(CHARS.map((ch, i) => [ch, i]))

export function drawText(ctx, text, x, y, color = '#cfe8cf', scale = 1) {
    let atlas = atlases[color]
    if (!atlas) atlas = atlases[color] = buildAtlas(color)
    const up = String(text).toUpperCase()
    for (let i = 0; i < up.length; i++) {
        const gi = index[up[i]]
        if (gi === undefined) continue // space and unknown chars advance silently
        ctx.drawImage(atlas, gi * CW, 0, 3, CH, x + i * CW * scale, y, 3 * scale, CH * scale)
    }
}

export function textWidth(text, scale = 1) {
    return text.length * CW * scale
}

// scrambles k random chars to corruption glyphs (for glitched OSD moments)
export function scramble(text, k) {
    const pool = ['#', '%', '?', '=', '_']
    const chars = text.split('')
    for (let i = 0; i < k; i++) {
        const at = Math.floor(Math.random() * chars.length)
        chars[at] = pool[Math.floor(Math.random() * pool.length)]
    }
    return chars.join('')
}

// Diegetic camcorder OSD, drawn into the low-res buffer BEFORE the glitch pass
// so the camera UI gets corrupted by the same tears and grain as the world.

import { drawText, textWidth, scramble } from './font.js'

const WHITE = '#cfe8cf'
const DIM = '#6d8f6d'
const RED = '#ff3b1f'

const BOOT_LINES = [
    'OKKO VC-88 // SELF TEST OK',
    'HEADS: DIRTY',
    'TRACKING: MANUAL',
    'TAPE 4 OF 4',
]

const SUBLIMINALS = ['BEH1ND', 'D0 N0T ST0P', 'IT KNOWS THE MAP', 'HEADS: DIRTY', 'ST1LL RUNN1NG']

let lastSubliminalAt = -Infinity
let subliminal = null

function pad(n, len = 2) {
    return String(Math.max(0, Math.floor(n))).padStart(len, '0')
}

export function drawOSD(ctx, w, h, s) {
    const { now } = s

    // boot self-test: typed line by line over the first 1200ms
    if (s.playMs < 1200) {
        const lines = Math.min(BOOT_LINES.length, 1 + Math.floor(s.playMs / 200))
        for (let i = 0; i < lines; i++) {
            drawText(ctx, BOOT_LINES[i], 8, 40 + i * 8, DIM)
        }
    }

    // REC, top-left — blinks 800ms on / 400ms off; corrupts while dying
    const recOn = (now % 1200) < 800
    if (s.dying) {
        drawText(ctx, '@ ###', 8, 8, RED)
    } else if (recOn) {
        drawText(ctx, '@', 8, 8, RED)
        drawText(ctx, 'REC', 14, 8, WHITE)
    } else {
        drawText(ctx, 'REC', 14, 8, DIM)
    }

    // timecode + date stamp, bottom-left (fake 25fps frames digit)
    const secs = s.playMs / 1000
    const frames = Math.floor((secs % 1) * 25)
    let tc = `} PLAY ${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}:${pad(frames)}`
    if (s.trauma > 0.5) tc = scramble(tc, 2)
    drawText(ctx, tc, 8, h - 20, WHITE)
    const mins = Math.floor(secs / 60)
    drawText(ctx, `OCT 31 1987 03:${pad(33 + mins)} AM`, 8, h - 12, DIM)

    // camera label, top-right — digit loses its mind when something is close
    let cam = 'CAM-07 SUBLVL-B'
    if (s.proximity > 0.6 && Math.floor(now / 300) % 2 === 0) {
        cam = `CAM-0${Math.floor(Math.random() * 10)} SUBLVL-B`
    }
    drawText(ctx, cam, w - textWidth(cam) - 8, 8, WHITE)

    // battery = HP, 4 segments
    const segs = Math.ceil((s.hp / s.maxHp) * 4)
    const bx = w - 34, by = 18
    const low = segs <= 1
    const blink = low && (now % 1000) < 500
    ctx.fillStyle = low ? RED : WHITE
    ctx.fillRect(bx, by, 22, 7)
    ctx.fillStyle = '#020402'
    ctx.fillRect(bx + 1, by + 1, 20, 5)
    ctx.fillStyle = low ? RED : WHITE
    ctx.fillRect(bx + 22, by + 2, 2, 3) // battery nub
    if (!blink) {
        for (let i = 0; i < segs; i++) {
            ctx.fillRect(bx + 2 + i * 5, by + 2, 4, 3)
        }
    }
    drawText(ctx, 'BAT', bx - 14, by + 1, DIM)

    // kill counter under battery
    drawText(ctx, `TRM ${pad(s.kills, 3)}`, w - textWidth('TRM 000') - 8, by + 12, DIM)

    // MAG counter, bottom-right
    let mag
    let magColor = WHITE
    if (s.reloadUntil > now) {
        mag = Math.floor(now / 300) % 2 === 0 ? 'MAG --' : 'LOADING'
        magColor = DIM
    } else {
        mag = `MAG ${pad(s.ammo)}/${pad(s.reserve)}`
        if (s.ammo === 0) magColor = RED
    }
    drawText(ctx, mag, w - textWidth(mag) - 8, h - 20, magColor)
    drawText(ctx, 'SP AE-LOCK', w - textWidth('SP AE-LOCK') - 8, h - 12, DIM)

    // key / access state, under REC
    if (s.keyFlashUntil > now) {
        if (Math.floor(now / 150) % 2 === 0) {
            const msg = 'ACCESS GRANTED - DOOR NODE OPEN'
            drawText(ctx, msg, (w - textWidth(msg)) / 2, h - 40, WHITE)
        }
    } else {
        drawText(ctx, s.hasKey ? 'ACC 1/1' : 'ACC 0/1', 8, 18, s.hasKey ? WHITE : DIM)
    }

    // TRACKING line, bottom-center
    if (s.proximity > 0.85) {
        if (Math.floor(now / 300) % 2 === 0) {
            const msg = 'TRACKING FAILED'
            drawText(ctx, msg, (w - textWidth(msg)) / 2, h - 12, RED)
        }
    } else if (s.proximity > 0.5) {
        const dots = '.'.repeat(1 + Math.floor(now / 400) % 3)
        const msg = 'TRACKING ' + dots
        drawText(ctx, msg, (w - textWidth('TRACKING ...')) / 2, h - 12, DIM)
    }

    // subliminal single-frame whispers
    if (subliminal) {
        drawText(ctx, subliminal.text, subliminal.x, subliminal.y, 'rgba(207,232,207,0.5)')
        subliminal = null
    } else if (s.proximity > 0.5 && now - lastSubliminalAt > 10000 && Math.random() < 0.0008) {
        lastSubliminalAt = now
        const text = SUBLIMINALS[Math.floor(Math.random() * SUBLIMINALS.length)]
        subliminal = {
            text,
            x: 40 + Math.random() * (w - 80 - textWidth(text)),
            y: 30 + Math.random() * (h - 60),
        }
    }
}

// death/win cards are drawn AFTER the glitch pass (on top of static/black)
export function drawDeathCard(ctx, w, h, elapsed) {
    if (elapsed < 1100) return
    const msg = Math.floor(elapsed / 700) % 2 === 0 ? 'SIGNAL LOST' : 'PLEASE STAND BY'
    drawText(ctx, msg, (w - textWidth(msg, 2)) / 2, h / 2 - 5, '#cfe8cf', 2)
}

export function drawWinCard(ctx, w, h, elapsed, playMs) {
    if (elapsed < 900) return
    const secs = playMs / 1000
    const msg = `TAPE ENDS ${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}`
    drawText(ctx, msg, (w - textWidth(msg, 2)) / 2, h / 2 - 5, '#cfe8cf', 2)
}

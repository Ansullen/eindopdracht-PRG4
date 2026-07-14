// End-of-tape cards, drawn AFTER the glitch pass (on top of static/black).
// The in-game camcorder GUI was removed — the feed is bare now.

import { drawText, textWidth } from './font.js'

function pad(n, len = 2) {
    return String(Math.max(0, Math.floor(n))).padStart(len, '0')
}

export function drawDeathCard(ctx, w, h, elapsed) {
    if (elapsed < 1100) return
    const msg = Math.floor(elapsed / 700) % 2 === 0 ? 'SIGNAL LOST' : 'PLEASE STAND BY'
    drawText(ctx, msg, (w - textWidth(msg, 2)) / 2, h / 2 - 5, '#e8cfcf', 2)
}

export function drawWinCard(ctx, w, h, elapsed, playMs) {
    if (elapsed < 900) return
    const secs = playMs / 1000
    const msg = `TAPE ENDS ${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}`
    drawText(ctx, msg, (w - textWidth(msg, 2)) / 2, h / 2 - 5, '#e8cfcf', 2)
}

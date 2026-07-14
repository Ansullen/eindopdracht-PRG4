// Wolfenstein-style raycast renderer (Lodev DDA) drawing into a low-res 2D canvas.
// Coordinates are in tile units. The camera is { x, y, dirX, dirY, planeX, planeY }.

export const FOG_NEAR = 1.5 // tiles at full brightness
export const FOG_DIST = 8   // tiles until full darkness

// quantized to 8 bands for chunky retro banding
function fogAt(dist) {
    const f = Math.min(Math.max((dist - FOG_NEAR) / (FOG_DIST - FOG_NEAR), 0), 1)
    return Math.floor(f * 8) / 8
}

export function makeCamera(x, y, angle, fovRad) {
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)
    const planeLen = Math.tan(fovRad / 2)
    return {
        x, y, dirX, dirY,
        planeX: -dirY * planeLen,
        planeY: dirX * planeLen,
    }
}

// Casts a single ray, returns perpendicular distance + wall hit info.
export function castRay(level, px, py, rayDirX, rayDirY) {
    let mapX = Math.floor(px)
    let mapY = Math.floor(py)

    const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX)
    const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY)

    let stepX, stepY, sideDistX, sideDistY
    if (rayDirX < 0) {
        stepX = -1
        sideDistX = (px - mapX) * deltaDistX
    } else {
        stepX = 1
        sideDistX = (mapX + 1 - px) * deltaDistX
    }
    if (rayDirY < 0) {
        stepY = -1
        sideDistY = (py - mapY) * deltaDistY
    } else {
        stepY = 1
        sideDistY = (mapY + 1 - py) * deltaDistY
    }

    let side = 0
    for (let i = 0; i < 64; i++) {
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX
            mapX += stepX
            side = 0
        } else {
            sideDistY += deltaDistY
            mapY += stepY
            side = 1
        }
        if (level.isWall(mapX, mapY)) break
    }

    const perpDist = side === 0
        ? sideDistX - deltaDistX
        : sideDistY - deltaDistY

    // fractional position along the wall face, for texture X
    let wallX = side === 0
        ? py + perpDist * rayDirY
        : px + perpDist * rayDirX
    wallX -= Math.floor(wallX)

    return { dist: Math.max(perpDist, 0.0001), side, wallX, mapX, mapY }
}

export class Raycaster {
    constructor(width, height) {
        this.w = width
        this.h = height
        this.zbuf = new Float32Array(width)
        this.#buildGradients()
    }

    #buildGradients() {
        // cached ceiling/floor strips, redrawn shifted by the horizon each frame
        const mk = (stops) => {
            const c = document.createElement('canvas')
            c.width = 1
            c.height = this.h
            const g = c.getContext('2d')
            const grad = g.createLinearGradient(0, 0, 0, this.h)
            for (const [at, col] of stops) grad.addColorStop(at, col)
            g.fillStyle = grad
            g.fillRect(0, 0, 1, this.h)
            return c
        }
        this.ceilGrad = mk([[0, '#160505'], [0.5, '#070202'], [1, '#000000']])
        this.floorGrad = mk([[0, '#000000'], [0.5, '#130505'], [1, '#250907']])
    }

    // camera in tile units; horizon = h/2 + bob/shake offset
    renderWalls(ctx, level, cam, wallTex, horizon, opts = {}) {
        const { w, h, zbuf } = this
        const corruption = opts.corruption ?? 0
        const corruptTex = opts.corruptTex ?? wallTex

        ctx.imageSmoothingEnabled = false

        // ceiling & floor (stretched cached gradients around the horizon)
        ctx.drawImage(this.ceilGrad, 0, 0, 1, this.h, 0, horizon - h, w, h)
        ctx.drawImage(this.floorGrad, 0, 0, 1, this.h, 0, horizon, w, h)

        const texW = wallTex.width
        const texH = wallTex.height

        for (let x = 0; x < w; x++) {
            const camX = 2 * x / w - 1
            const rayDirX = cam.dirX + cam.planeX * camX
            const rayDirY = cam.dirY + cam.planeY * camX

            const hit = castRay(level, cam.x, cam.y, rayDirX, rayDirY)
            zbuf[x] = hit.dist

            const lineH = h / hit.dist
            const drawStart = horizon - lineH / 2

            const tex = (corruption > 0 && Math.random() < corruption) ? corruptTex : wallTex
            let texX = Math.floor(hit.wallX * texW)
            if ((hit.side === 0 && rayDirX > 0) || (hit.side === 1 && rayDirY < 0)) {
                texX = texW - texX - 1
            }

            ctx.drawImage(tex, texX, 0, 1, texH, x, drawStart, 1, lineH)

            // distance fog + N/S vs E/W face shading, one overlay rect per column
            let shade = fogAt(hit.dist)
            if (hit.side === 1) shade += 0.3 * (1 - shade)
            shade = Math.max(0, Math.min(shade, 1) - (opts.lightPop ?? 0))
            if (shade > 0.02) {
                ctx.fillStyle = `rgba(12,3,3,${shade})`
                ctx.fillRect(x, drawStart, 1, lineH)
            }
        }
    }

    // sprites: [{ x, y (tile units), img (canvas), scale (1 = wall height),
    //             vShift (0..1 down from center), alpha, glow (halves fog dimming) }]
    renderSprites(ctx, sprites, cam, horizon, lightPop = 0) {
        const { w, h, zbuf } = this
        const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY)

        const visible = []
        for (const s of sprites) {
            const relX = s.x - cam.x
            const relY = s.y - cam.y
            const tx = invDet * (cam.dirY * relX - cam.dirX * relY)
            const ty = invDet * (-cam.planeY * relX + cam.planeX * relY) // depth into the screen
            if (ty <= 0.08) continue
            visible.push({ s, tx, ty })
        }
        visible.sort((a, b) => b.ty - a.ty)

        for (const { s, tx, ty } of visible) {
            const screenX = (w / 2) * (1 + tx / ty)
            const scale = s.scale ?? 1
            const spriteH = Math.abs(h / ty) * scale
            const spriteW = spriteH * (s.img.width / s.img.height)
            const vShift = (s.vShift ?? 0) * (h / ty) / 2
            const top = horizon - spriteH / 2 + vShift

            const startX = Math.floor(screenX - spriteW / 2)
            const endX = Math.ceil(screenX + spriteW / 2)
            if (endX < 0 || startX >= w) continue

            let fog = fogAt(ty)
            if (s.glow) fog *= 0.5
            fog = Math.max(0, fog - lightPop)
            ctx.globalAlpha = (s.alpha ?? 1) * (1 - fog * 0.92)

            const imgW = s.img.width
            // per-column strips so walls occlude correctly via the zbuffer
            const x0 = Math.max(startX, 0)
            const x1 = Math.min(endX, w)
            let runStart = -1
            const flushRun = (xEnd) => {
                if (runStart < 0) return
                const u0 = (runStart - startX) / spriteW * imgW
                const u1 = (xEnd - startX) / spriteW * imgW
                ctx.drawImage(s.img, u0, 0, Math.max(u1 - u0, 0.01), s.img.height,
                    runStart, top, xEnd - runStart, spriteH)
                runStart = -1
            }
            for (let x = x0; x < x1; x++) {
                if (ty < zbuf[x]) {
                    if (runStart < 0) runStart = x
                } else {
                    flushRun(x)
                }
            }
            flushRun(x1)
            ctx.globalAlpha = 1
        }
    }
}

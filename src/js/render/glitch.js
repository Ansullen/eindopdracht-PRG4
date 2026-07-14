// Layered VHS/CRT glitch post-processing on the low-res buffer.
// One 'trauma' scalar (0..1) drives shake, tear intensity and the audio static bed.
// Layers: 1 ambient (mask/grain/roll-bar/ghost) — 2 proximity dread — 3 event bursts
// (damage/kill/key/death/win) — 4 low-HP corruption — 5 rare micro-glitches.
// All overlays are pre-baked at load; the per-frame cost is drawImage/fillRect only.

import { makeFace } from './pixelart.js'
import { drawText, textWidth } from './font.js'

const TAU = Math.PI * 2

function lerp(a, b, t) { return a + (b - a) * t }

const SCRAWLS = ['BEHIND YOU', 'IT SEES YOU', 'DONT LOOK', 'YOUR FAULT', 'HELP ME', 'STAY', 'NO EXIT', 'IT WEARS YOU']

export class GlitchFX {
    trauma = 0
    proximity = 0   // n: 0..1, nearest-zombie closeness
    lowHp = 0       // s: 0..1 severity below 40 hp
    turning = false

    #damageT = 0
    #damageDir = 0  // 0 front, 1 right, 2 back, 3 left
    #damageFrames = 0
    #killT = 0
    #killFrame = 0
    #rewindT = 0
    #deathT = -1
    #winT = -1
    #chokeFrames = 0
    #chokeCooldown = 0
    #syncFrames = 0
    #syncX = 160
    #suppressMicroT = 0
    #judderFlip = false
    #shiftT = 0        // otherworld transition burst
    #faceFrames = 0    // single-frame face inserts
    #dipFrames = 0     // flashlight brown-out
    #flashAlpha = 0.92 // flashlight flicker random walk
    otherworld = false

    constructor(w, h) {
        this.w = w
        this.h = h
        this.ghost = document.createElement('canvas')
        this.ghost.width = w
        this.ghost.height = h
        this.ghostCtx = this.ghost.getContext('2d')
        // scratch canvas for the red channel-split ghost
        this.chroma = document.createElement('canvas')
        this.chroma.width = w
        this.chroma.height = h
        this.chromaCtx = this.chroma.getContext('2d')
        this.face = makeFace()
        this.#bake()
    }

    #bake() {
        const { w, h } = this

        // scanlines (taller than screen so they can crawl)
        const sl = document.createElement('canvas')
        sl.width = w
        sl.height = h + 3
        const slc = sl.getContext('2d')
        slc.fillStyle = 'rgba(10,0,0,0.3)'
        for (let y = 0; y < sl.height; y += 3) slc.fillRect(0, y, w, 1)
        this.scanlines = sl

        // vignette
        const vg = document.createElement('canvas')
        vg.width = w
        vg.height = h
        const vgc = vg.getContext('2d')
        const grad = vgc.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.62)
        grad.addColorStop(0, 'rgba(10,2,2,0)')
        grad.addColorStop(1, 'rgba(10,2,2,0.55)')
        vgc.fillStyle = grad
        vgc.fillRect(0, 0, w, h)
        this.vignette = vg

        // red low-HP vignette
        const rv = document.createElement('canvas')
        rv.width = w
        rv.height = h
        const rvc = rv.getContext('2d')
        const rgrad = rvc.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.6)
        rgrad.addColorStop(0, 'rgba(204,34,0,0)')
        rgrad.addColorStop(1, 'rgba(204,34,0,0.7)')
        rvc.fillStyle = rgrad
        rvc.fillRect(0, 0, w, h)
        this.redVignette = rv

        // analog grain tiles (drawn 2x with composite 'overlay')
        this.grainTiles = []
        for (let t = 0; t < 4; t++) {
            const g = document.createElement('canvas')
            g.width = 176
            g.height = 96
            const gc = g.getContext('2d')
            const img = gc.createImageData(176, 96)
            for (let i = 0; i < img.data.length; i += 4) {
                const r = Math.random()
                if (r < 0.2) {
                    img.data[i] = 255; img.data[i + 1] = 140; img.data[i + 2] = 125
                    img.data[i + 3] = 12 + Math.random() * 18
                } else if (r < 0.3) {
                    img.data[i + 3] = 30
                }
            }
            gc.putImageData(img, 0, 0)
            this.grainTiles.push(g)
        }

        // full-frame TV static (death / rewind)
        const st = document.createElement('canvas')
        st.width = w
        st.height = h
        const stc = st.getContext('2d')
        const simg = stc.createImageData(w, h)
        for (let i = 0; i < simg.data.length; i += 4) {
            const v = Math.random() * 200
            simg.data[i] = v; simg.data[i + 1] = v * 0.42; simg.data[i + 2] = v * 0.38
            simg.data[i + 3] = 255
        }
        stc.putImageData(simg, 0, 0)
        this.static = st

        // directional damage edges: 0 front (bottom), 1 right, 2 back (radial), 3 left
        const edge = (x0, y0, x1, y1) => {
            const c = document.createElement('canvas')
            c.width = w
            c.height = h
            const cc = c.getContext('2d')
            const eg = cc.createLinearGradient(x0, y0, x1, y1)
            eg.addColorStop(0, 'rgba(204,34,0,0)')
            eg.addColorStop(1, 'rgba(204,34,0,0.85)')
            cc.fillStyle = eg
            cc.fillRect(0, 0, w, h)
            return c
        }
        const back = document.createElement('canvas')
        back.width = w
        back.height = h
        const bc = back.getContext('2d')
        const bg = bc.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.55)
        bg.addColorStop(0, 'rgba(204,34,0,0.5)')
        bg.addColorStop(1, 'rgba(204,34,0,0.15)')
        bc.fillStyle = bg
        bc.fillRect(0, 0, w, h)
        this.damageEdges = [
            edge(0, h - 50, 0, h), // front: bottom edge
            edge(w - 60, 0, w, 0), // right
            back,                  // back: full radial
            edge(60, 0, 0, 0),     // left
        ]

        // flashlight cone: heavy darkness closing in from the edges
        const fl = document.createElement('canvas')
        fl.width = w
        fl.height = h
        const flc = fl.getContext('2d')
        const fgrad = flc.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, w * 0.55)
        fgrad.addColorStop(0, 'rgba(0,0,0,0)')
        fgrad.addColorStop(0.6, 'rgba(0,0,0,0.35)')
        fgrad.addColorStop(1, 'rgba(0,0,0,0.82)')
        flc.fillStyle = fgrad
        flc.fillRect(0, 0, w, h)
        this.flashlight = fl
    }

    // ---- events ----
    addTrauma(n) { this.trauma = Math.min(1, this.trauma + n) }

    onDamage(dirBucket) {
        this.#damageT = 240
        this.#damageFrames = 2
        this.#damageDir = dirBucket
        this.#killT = 0
        this.#rewindT = 0
        this.#suppressMicroT = 3000
        if (Math.random() < 0.35) this.#faceFrames = 2 // sometimes it looks back
        this.addTrauma(0.5)
    }

    // otherworld transition burst (call alongside the siren)
    onShift() {
        this.#shiftT = 1400
        this.addTrauma(0.6)
    }

    onKill() {
        this.#killT = 160
        this.#killFrame = 1
        this.#suppressMicroT = 3000
        this.addTrauma(0.2)
    }

    onRewind() { // key pickup
        this.#rewindT = 550
        this.#suppressMicroT = 3000
        this.addTrauma(0.3)
    }

    onDeath() { this.#deathT = 0 }
    onWin() { this.#winT = 0 }
    get dying() { return this.#deathT >= 0 }
    get winning() { return this.#winT >= 0 }
    get deathElapsed() { return this.#deathT }
    get winElapsed() { return this.#winT }

    // ---- per-frame ----
    update(dt, { proximity = 0, hpFrac = 1, turning = false, otherworld = false } = {}) {
        this.trauma = Math.max(0, this.trauma - 1.5 * (dt / 1000))
        this.proximity = proximity
        this.lowHp = hpFrac < 0.4 ? 1 - hpFrac / 0.4 : 0
        this.turning = turning
        this.otherworld = otherworld

        // flashlight flicker: random walk, occasional brown-out
        this.#flashAlpha = Math.max(0.75, Math.min(1,
            this.#flashAlpha + (Math.random() - 0.5) * 0.16))
        if (this.#dipFrames === 0 && Math.random() < (otherworld ? 0.012 : 0.005)) {
            this.#dipFrames = 1 + Math.floor(Math.random() * 3)
        }
        // in the otherworld, it sometimes just appears for one frame
        if (otherworld && this.#faceFrames === 0 && Math.random() < 0.0012) this.#faceFrames = 1

        if (this.#shiftT > 0) this.#shiftT -= dt
        if (this.#damageT > 0) this.#damageT -= dt
        if (this.#killT > 0) this.#killT -= dt
        if (this.#rewindT > 0) this.#rewindT -= dt
        if (this.#suppressMicroT > 0) this.#suppressMicroT -= dt
        if (this.#chokeCooldown > 0) this.#chokeCooldown -= dt
        if (this.#deathT >= 0) this.#deathT += dt
        if (this.#winT >= 0) this.#winT += dt

        const eventActive = this.#damageT > 0 || this.#killT > 0 || this.#rewindT > 0
        // choke stutter: frame-freeze panic when a zombie is on top of you
        if (this.#chokeFrames === 0 && !eventActive && this.proximity > 0.7 &&
            this.#chokeCooldown <= 0 && Math.random() < 0.02) {
            this.#chokeFrames = 2 + Math.floor(Math.random() * 3)
            this.#chokeCooldown = 1500
        }
        // sync loss micro-glitch
        if (this.#syncFrames === 0 && this.#suppressMicroT <= 0 && Math.random() < 0.003) {
            this.#syncFrames = 4 + Math.floor(Math.random() * 4)
            this.#syncX = 60 + Math.floor(Math.random() * 200)
        }
        this.#judderFlip = !this.#judderFlip
    }

    #tear(ctx, bandH, dx) {
        const y = Math.floor(Math.random() * (this.h - bandH))
        ctx.drawImage(ctx.canvas, 0, y, this.w, bandH, dx, y, this.w, bandH)
    }

    // the post pass — buffer already contains scene + gun + OSD
    apply(ctx, now) {
        const { w, h } = this

        if (this.#winT >= 0) { this.#applyWin(ctx); return }
        if (this.#deathT >= 0) { this.#applyDeath(ctx); return }

        const rewindClean = this.#rewindT > 0 && this.#rewindT < 100

        // choke stutter: replace the fresh frame with the frozen ghost
        if (this.#chokeFrames > 0) {
            this.#chokeFrames--
            ctx.drawImage(this.ghost, 0, 0)
            this.#tear(ctx, 12 + Math.random() * 8, (Math.random() < 0.5 ? -1 : 1) * 10)
            this.#tear(ctx, 12 + Math.random() * 8, (Math.random() < 0.5 ? -1 : 1) * 10)
            ctx.globalAlpha = 0.25
            ctx.drawImage(this.grainTiles[now % 4 | 0], 0, 0, 176, 96, 0, 0, w, h)
            ctx.globalAlpha = 1
        } else if (!rewindClean) {
            // phosphor ghosting: last frame smears over this one
            ctx.globalAlpha = this.turning ? 0.3 : 0.15
            ctx.drawImage(this.ghost, 0, 0)
            ctx.globalAlpha = 1
        }

        if (!rewindClean) {
            const n = this.proximity

            // proximity + ambient tears (the picture barely holds on the other side)
            if (Math.random() < (this.otherworld ? 0.14 : 0.06) + 0.35 * n * n) {
                const k = 1 + Math.floor(3 * n)
                for (let i = 0; i < k; i++) {
                    this.#tear(ctx, 2 + Math.random() * 8, (Math.random() < 0.5 ? -1 : 1) * (1 + 7 * n))
                }
            }
            // trauma tears
            const traumaRows = Math.floor(this.trauma * 10)
            for (let i = 0; i < traumaRows; i++) {
                if (Math.random() < 0.5) this.#tear(ctx, 1 + Math.random() * 3, (Math.random() * 2 - 1) * 12 * this.trauma)
            }

            // red channel-split ghost — always on, widens with trauma
            const cc = this.chromaCtx
            cc.globalCompositeOperation = 'source-over'
            cc.drawImage(ctx.canvas, 0, 0)
            cc.globalCompositeOperation = 'multiply'
            cc.fillStyle = '#ff2418'
            cc.fillRect(0, 0, w, h)
            ctx.globalCompositeOperation = 'screen'
            ctx.globalAlpha = 0.35
            ctx.drawImage(this.chroma, 1 + Math.round(this.trauma * 4), 0)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1

            // heartbeat blood pulse
            if (n > 0.2) {
                const T = lerp(1100, 420, n)
                const e = Math.pow(Math.max(0, Math.sin(TAU * now / T)), 8)
                if (e > 0.01) {
                    ctx.globalCompositeOperation = 'screen'
                    ctx.fillStyle = `rgba(204,34,0,${(0.03 + 0.12 * n) * e})`
                    ctx.fillRect(0, 0, w, h)
                    ctx.globalCompositeOperation = 'source-over'
                }
            }

            // roll bar (fast during rewind grab)
            const speed = this.#rewindT > 100 ? 0.56 : 0.028
            const rollY = h - ((now * speed) % (h + 40))
            if (rollY > -7 && rollY < h) {
                const y = Math.max(0, Math.floor(rollY))
                const bh = Math.min(7, h - y)
                if (bh > 0) {
                    ctx.drawImage(ctx.canvas, 0, y, w, bh, 3, y, w, bh)
                    ctx.fillStyle = 'rgba(0,0,0,0.18)'
                    ctx.fillRect(0, y, w, bh)
                    ctx.fillStyle = 'rgba(255,200,190,0.10)'
                    ctx.fillRect(0, y, w, 1)
                }
            }

            // damage slam
            if (this.#damageT > 0) {
                const e = Math.pow(this.#damageT / 240, 2)
                if (this.#damageFrames > 0) {
                    this.#damageFrames--
                    ctx.globalCompositeOperation = 'difference'
                    ctx.globalAlpha = 0.85
                    ctx.fillStyle = '#e6ffe6'
                    ctx.fillRect(0, 0, w, h)
                    ctx.globalAlpha = 1
                    ctx.globalCompositeOperation = 'source-over'
                }
                ctx.globalCompositeOperation = 'screen'
                ctx.fillStyle = `rgba(204,34,0,${0.3 * e})`
                ctx.fillRect(0, 0, w, h)
                ctx.globalCompositeOperation = 'source-over'
                for (let i = 0; i < 5; i++) this.#tear(ctx, 2 + Math.random() * 8, (Math.random() * 2 - 1) * 12 * e)
                ctx.globalAlpha = 0.55 * e
                ctx.drawImage(this.damageEdges[this.#damageDir], 0, 0)
                ctx.globalAlpha = 1
            }

            // kill spike
            if (this.#killT > 0) {
                if (this.#killFrame === 1) {
                    this.#killFrame = 0
                    for (let sx = 0; sx < w; sx += 40) {
                        const dy = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4)
                        ctx.drawImage(ctx.canvas, sx, 0, 40, h, sx, dy, 40, h)
                    }
                }
                ctx.globalCompositeOperation = 'lighter'
                ctx.fillStyle = `rgba(255,84,64,${0.12 * (this.#killT / 160)})`
                ctx.fillRect(0, 0, w, h)
                ctx.globalCompositeOperation = 'source-over'
            }

            // otherworld shift burst: static wall + strobing negative while the siren wails
            if (this.#shiftT > 0) {
                const e = this.#shiftT / 1400
                ctx.globalAlpha = 0.5 * e
                ctx.drawImage(this.static, 0, 0)
                ctx.globalAlpha = 1
                for (let i = 0; i < 4; i++) {
                    this.#tear(ctx, 3 + Math.random() * 10, (Math.random() * 2 - 1) * 14 * e)
                }
                if (Math.random() < 0.12 * e) {
                    ctx.globalCompositeOperation = 'difference'
                    ctx.fillStyle = 'rgba(230,230,230,0.8)'
                    ctx.fillRect(0, 0, w, h)
                    ctx.globalCompositeOperation = 'source-over'
                }
            }

            // rewind grab (key pickup)
            if (this.#rewindT > 100) {
                ctx.globalAlpha = 0.3 * ((this.#rewindT - 100) / 450)
                ctx.drawImage(this.static, 0, 0)
                ctx.globalAlpha = 1
                this.#tear(ctx, 4 + Math.random() * 6, (Math.random() < 0.5 ? -1 : 1) * 6)
                this.#tear(ctx, 4 + Math.random() * 6, (Math.random() < 0.5 ? -1 : 1) * 6)
            }

            // low HP terminal corruption
            if (this.lowHp > 0) {
                const s = this.lowHp
                if (Math.random() < 0.08 + 0.35 * s) {
                    const y1 = Math.random() * h | 0
                    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(232,207,207,0.4)' : 'rgba(0,0,0,0.6)'
                    ctx.fillRect(0, y1, w, 1)
                }
                ctx.globalCompositeOperation = 'multiply'
                ctx.fillStyle = `rgba(26,9,9,${0.12 * s})`
                ctx.fillRect(0, 0, w, h)
                ctx.globalCompositeOperation = 'source-over'
                const T = lerp(1100, 420, Math.max(this.proximity, s * 0.6))
                const beat = Math.pow(Math.max(0, Math.sin(TAU * now / T)), 8)
                ctx.globalAlpha = 0.25 * s * (0.5 + beat * 0.5)
                ctx.drawImage(this.redVignette, 0, 0)
                ctx.globalAlpha = 1
            }

            // micro-glitches
            if (this.#suppressMicroT <= 0 && this.#chokeFrames === 0) {
                if (Math.random() < 0.012) {
                    const nRects = 2 + Math.floor(Math.random() * 3)
                    for (let i = 0; i < nRects; i++) {
                        const bw = 16 + Math.random() * 32, bh = 8 + Math.random() * 16
                        ctx.drawImage(ctx.canvas,
                            Math.random() * (w - bw), Math.random() * (h - bh), bw, bh,
                            Math.random() * (w - bw), Math.random() * (h - bh), bw, bh)
                    }
                }
                if (this.#syncFrames > 0) {
                    this.#syncFrames--
                    const sx = this.#syncX
                    ctx.drawImage(ctx.canvas, 0, 0, sx, h, w - sx, 0, sx, h)
                    ctx.drawImage(ctx.canvas, sx, 0, w - sx, h, 0, 0, w - sx, h)
                }
            }

            // analog grain
            ctx.globalCompositeOperation = 'overlay'
            const tile = this.grainTiles[Math.floor(Math.random() * 4)]
            ctx.drawImage(tile, 0, 0, 176, 96,
                -Math.floor(Math.random() * 32), -Math.floor(Math.random() * 16), 352, 192)
            ctx.globalCompositeOperation = 'source-over'
        }

        // single-frame inserts: the face, or words scratched into the frame
        if (this.#faceFrames > 0) {
            this.#faceFrames--
            const fh = h * 0.75
            const fw = fh * (this.face.width / this.face.height)
            ctx.globalAlpha = 0.55
            ctx.drawImage(this.face,
                (w - fw) / 2 + (Math.random() * 2 - 1) * 10,
                (h - fh) / 2 + (Math.random() * 2 - 1) * 6, fw, fh)
            ctx.globalAlpha = 1
        } else if (Math.random() < (this.otherworld ? 0.002 : 0.0005)) {
            const word = SCRAWLS[Math.floor(Math.random() * SCRAWLS.length)]
            const scale = 2 + Math.floor(Math.random() * 2)
            drawText(ctx, word,
                Math.random() * Math.max(1, w - textWidth(word, scale)),
                20 + Math.random() * (h - 40), 'rgba(200,30,20,0.75)', scale)
        }

        // flashlight cone with a failing bulb
        if (this.#dipFrames > 0) {
            this.#dipFrames--
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            ctx.fillRect(0, 0, w, h)
        }
        ctx.globalAlpha = this.#flashAlpha
        ctx.drawImage(this.flashlight, 0, 0)
        ctx.globalAlpha = 1

        // phosphor mask (always, even in the clean window — it's the monitor, not the tape)
        const crawl = Math.floor(now / 90) % 3
        ctx.drawImage(this.scanlines, 0, 3 - crawl, w, h, 0, 0, w, h)
        ctx.drawImage(this.vignette, 0, 0)

        // capture ghost for next frame (post-fx included: glitches leave trails)
        this.ghostCtx.clearRect(0, 0, w, h)
        this.ghostCtx.drawImage(ctx.canvas, 0, 0)
    }

    #applyDeath(ctx) {
        const { w, h } = this
        const t = this.#deathT
        if (t < 500) {
            // vertical hold failure: accelerating wrap roll
            const off = Math.floor((t / 500) * (t / 500) * h * 1.5) % h
            ctx.drawImage(ctx.canvas, 0, 0, w, h - off, 0, off, w, h - off)
            ctx.drawImage(this.ghost, 0, h - off, w, off, 0, 0, w, off)
        } else if (t < 1100) {
            const a = 0.2 + 0.8 * ((t - 500) / 600)
            ctx.globalAlpha = a
            ctx.drawImage(this.static, 0, 0)
            ctx.globalAlpha = 1
            ctx.fillStyle = 'rgba(0,0,0,0.35)'
            const pitch = 3 + Math.floor(((t - 500) / 600) * 3)
            for (let y = 0; y < h; y += pitch) ctx.fillRect(0, y, w, 1)
        } else {
            ctx.fillStyle = '#020402'
            ctx.fillRect(0, 0, w, h)
        }
        ctx.drawImage(this.vignette, 0, 0)
        this.ghostCtx.drawImage(ctx.canvas, 0, 0)
    }

    #applyWin(ctx) {
        const { w, h } = this
        const t = this.#winT
        if (t < 300) {
            ctx.globalCompositeOperation = 'lighter'
            ctx.fillStyle = `rgba(255,216,210,${0.5 * (1 - t / 300)})`
            ctx.fillRect(0, 0, w, h)
            ctx.globalCompositeOperation = 'source-over'
        } else if (t < 750) {
            const p = (t - 300) / 450
            const dh = Math.max(2, h * (1 - p * p))
            const y = (h - dh) / 2
            ctx.drawImage(ctx.canvas, 0, 0, w, h, 0, y, w, dh)
            ctx.fillStyle = '#020402'
            ctx.fillRect(0, 0, w, y)
            ctx.fillRect(0, y + dh, w, h - y - dh)
        } else {
            ctx.fillStyle = '#020402'
            ctx.fillRect(0, 0, w, h)
            if (t < 900) {
                ctx.fillStyle = `rgba(232,207,207,${1 - (t - 750) / 150})`
                ctx.fillRect(0, h / 2, w, 1)
            }
        }
        this.ghostCtx.drawImage(ctx.canvas, 0, 0)
    }

    // shake/jitter offset for the final blit of the buffer into the ex.Canvas
    blitOffset() {
        let x = 0, y = 0
        const t2 = this.trauma * this.trauma
        x += (Math.random() * 2 - 1) * 4 * t2
        y += (Math.random() * 2 - 1) * 4 * t2
        if (this.#damageT > 0) x += (Math.random() * 2 - 1) * 3 * (this.#damageT / 240)
        if (Math.random() < 0.35 * this.proximity) y += Math.random() < 0.5 ? -1 : 1
        if (this.lowHp > 0.5 && this.#judderFlip) y += 1
        return { x: Math.round(x), y: Math.round(y) }
    }
}

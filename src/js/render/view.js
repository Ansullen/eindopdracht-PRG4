// Full-screen first-person view. All game logic stays in Excalibur actors;
// this ScreenElement renders the world as a raycast scene into a 320x176
// buffer, applies the glitch pass, and blits into an ex.Canvas scaled 4x.
// Pipeline: walls -> billboards -> gun -> OSD -> glitch -> death/win card -> blit.

import { ScreenElement, Canvas, ImageFiltering, vec } from 'excalibur'
import { Raycaster, makeCamera } from './raycaster.js'
import { GlitchFX } from './glitch.js'
import { Sprites, makeCorruptTexture } from './pixelart.js'
import { drawDeathCard, drawWinCard } from './osd.js'
import { WorldFX } from './worldfx.js'
import { Res } from '../resources.js'
import { Level, TILE } from '../level.js'
import { Sfx } from '../audio.js'
import { Zombie } from '../actors/Zombie.js'
import { AmmoPickup } from '../actors/AmmoPickup.js'
import { Key } from '../actors/Key.js'
import { Exit } from '../actors/Exit.js'
import { Bullet } from '../actors/Bullet.js'

const W = 320
const H = 176
const FOV = 66 * Math.PI / 180
const MAX_SPEED = 140

export class RaycastView extends ScreenElement {
    #player
    #buffer
    #b // buffer 2d context
    #raycaster
    #glitch
    #wallTex
    #corruptTex

    // gun + crosshair state (mutated in onPostUpdate, read in draw)
    #bobPhase = 0
    #lastStepHalf = 0
    #stepSide = 1
    #recoilT = 0
    #flashT = 0
    #dipT = 0
    #hitT = 0
    #killMarkT = 0
    #spreadT = 0
    #tint = null
    #playMs = 0
    #playMsAtEnd = 0
    #lastAngle = 0
    #turning = false
    #proximity = 0

    constructor(player) {
        super({ pos: vec(0, 0), z: 1000 })
        this.#player = player
    }

    onInitialize(engine) {
        this.#buffer = document.createElement('canvas')
        this.#buffer.width = W
        this.#buffer.height = H
        this.#b = this.#buffer.getContext('2d')
        this.#b.imageSmoothingEnabled = false

        this.#raycaster = new Raycaster(W, H)
        this.#glitch = new GlitchFX(W, H)

        // wall texture as a canvas for fast column sampling
        const wt = document.createElement('canvas')
        wt.width = Res.wall.image.width
        wt.height = Res.wall.image.height
        wt.getContext('2d').drawImage(Res.wall.image, 0, 0)
        this.#wallTex = wt
        this.#corruptTex = makeCorruptTexture(wt)

        Sfx.onCrackle = () => this.#glitch.addTrauma(0.05)

        // 320x176 raster, GPU-upscaled 4x with hard nearest-neighbor sampling
        this.graphics.use(new Canvas({
            width: W,
            height: H,
            cache: false,
            filtering: ImageFiltering.Pixel,
            draw: (ctx) => this.#render(ctx, engine),
        }))
        this.scale = vec(4, 4)
    }

    onPostUpdate(engine, delta) {
        const p = this.#player
        const now = engine.clock.now()
        if (!p.dead && !p.won) {
            this.#playMs += delta
            this.#playMsAtEnd = this.#playMs
        }

        for (const evt of WorldFX.drain()) {
            switch (evt.type) {
                case 'shoot':
                    this.#recoilT = 160
                    this.#flashT = 80
                    this.#spreadT = 80
                    this.#glitch.addTrauma(0.12)
                    break
                case 'dry':
                    this.#dipT = 80
                    this.#glitch.addTrauma(0.03)
                    break
                case 'hit':
                    this.#hitT = 100
                    Sfx.hitTick()
                    break
                case 'kill':
                    this.#killMarkT = 150
                    this.#glitch.onKill()
                    break
                case 'damage':
                    this.#glitch.onDamage(evt.data ?? 2)
                    break
                case 'pickup':
                    this.#tint = { color: 'rgba(80,255,120,0.25)', until: now + 100 }
                    break
                case 'key':
                    this.#tint = { color: 'rgba(255,80,50,0.35)', until: now + 100 }
                    this.#glitch.onRewind()
                    break
                case 'unlock':
                    this.#glitch.addTrauma(0.3)
                    break
                case 'death':
                    this.#glitch.onDeath()
                    break
                case 'win':
                    this.#glitch.onWin()
                    break
            }
        }

        // proximity dread from the nearest zombie
        let nearest = Infinity
        for (const a of this.scene.actors) {
            if (a instanceof Zombie) {
                const d = a.pos.distance(p.pos)
                if (d < nearest) nearest = d
            }
        }
        this.#proximity = Math.max(0, Math.min(1, 1 - nearest / 512))

        const turnRate = Math.abs(p.angle - this.#lastAngle) / Math.max(delta / 1000, 0.001)
        this.#turning = turnRate > 2
        this.#lastAngle = p.angle

        this.#glitch.update(delta, {
            proximity: this.#proximity,
            hpFrac: p.hp / 100,
            turning: this.#turning,
        })
        Sfx.setDread(Math.max(this.#glitch.trauma * 0.8, this.#proximity * 0.6))

        WorldFX.update(delta)

        // velocity-coupled gun bob; footsteps on each half-cycle
        const speed = Math.min(p.vel.magnitude / MAX_SPEED, 1)
        this.#bobPhase += speed * (delta / 1000) * (2 * Math.PI / 0.45)
        const half = Math.floor(this.#bobPhase / Math.PI)
        if (half !== this.#lastStepHalf && speed > 0.3 && !p.dead && !p.won) {
            this.#lastStepHalf = half
            this.#stepSide = -this.#stepSide
            Sfx.footstep(this.#stepSide)
        }

        if (this.#recoilT > 0) this.#recoilT -= delta
        if (this.#flashT > 0) this.#flashT -= delta
        if (this.#dipT > 0) this.#dipT -= delta
        if (this.#hitT > 0) this.#hitT -= delta
        if (this.#killMarkT > 0) this.#killMarkT -= delta
        if (this.#spreadT > 0) this.#spreadT -= delta
    }

    #collectSprites(now) {
        const p = this.#player
        const sprites = []

        for (const s of WorldFX.splats) {
            sprites.push({ x: s.x / TILE, y: s.y / TILE, img: Sprites.splat, scale: 0.16, vShift: 0.84, alpha: 0.85 })
        }

        for (const a of this.scene.actors) {
            if (a instanceof Zombie) {
                let img
                const walk = Math.floor((now + a.id * 137) / 350) % 2 === 0
                if (a.state === 'windup') img = Sprites.zombieAttack
                else if (a.state === 'chase') img = walk ? Sprites.zombieWalkA : Sprites.zombieWalkB
                else img = Math.random() < 0.005 ? Sprites.zombieWalkB : Sprites.zombieWalkA // idle twitch
                if (a.flashT > 0) {
                    if (img === Sprites.zombieAttack) img = Sprites.zombieAttackFlash
                    else if (img === Sprites.zombieWalkB) img = Sprites.zombieWalkBFlash
                    else img = Sprites.zombieWalkAFlash
                }
                sprites.push({ x: a.pos.x / TILE, y: a.pos.y / TILE, img, scale: 0.8, vShift: 0.2 })
            } else if (a instanceof AmmoPickup || a instanceof Key) {
                const isKey = a instanceof Key
                const bob = Math.sin(now * 0.00754 + a.id * 2.1) * 0.05
                sprites.push({
                    x: a.pos.x / TILE, y: a.pos.y / TILE,
                    img: (isKey ? Res.key : Res.ammo).image,
                    scale: isKey ? 0.2 : 0.16,
                    vShift: (isKey ? 0.72 : 0.76) + bob,
                    glow: true,
                })
            } else if (a instanceof Exit) {
                const open = this.#player.hasKey
                sprites.push({
                    x: a.pos.x / TILE, y: a.pos.y / TILE,
                    img: (open ? Res.exitOpen : Res.exitLocked).image,
                    scale: 1, vShift: 0, glow: open,
                })
            } else if (a instanceof Bullet) {
                sprites.push({ x: a.pos.x / TILE, y: a.pos.y / TILE, img: Sprites.bullet, scale: 0.09, vShift: 0.05, glow: true })
            }
        }

        for (const pt of WorldFX.particles) {
            sprites.push({
                x: pt.x / TILE, y: pt.y / TILE,
                img: pt.red ? Sprites.particleRed : Sprites.particleGreen,
                scale: 0.06, vShift: 1 - 2 * pt.z,
                alpha: pt.life / 500,
            })
        }
        return sprites
    }

    #drawGun(b, now) {
        const p = this.#player
        if (p.dead) return

        const scalePx = 4
        const gunW = 24 * scalePx
        const gunH = 20 * scalePx
        const speed = Math.min(p.vel.magnitude / MAX_SPEED, 1)
        const bobX = Math.sin(this.#bobPhase) * 3 * speed
        const bobY = Math.abs(Math.sin(this.#bobPhase)) * 2 * speed
            + Math.sin(now * 0.0025) * 1 * (1 - speed) // idle breathe
        const recP = Math.max(this.#recoilT, 0) / 160
        const dip = this.#dipT > 0 ? 1 : 0

        const img = recP > 0.5 ? Sprites.gunRecoil : Sprites.gunIdle
        const gx = Math.round(W / 2 - gunW / 2 + 22 + bobX + recP * 2)
        const gy = Math.round(H - gunH + 6 + bobY + recP * 7 + dip)
        b.drawImage(img, gx, gy, gunW, gunH)

        if (this.#flashT > 0) {
            const big = this.#flashT > 40
            const fs = big ? 72 : 44
            b.drawImage(Sprites.muzzleFlash, gx + gunW / 2 - fs / 2 - 5, gy - fs + 14, fs, fs)
        }

        // crosshair / hitmarker
        const cx = W / 2, cy = H / 2
        if (this.#hitT > 0 || this.#killMarkT > 0) {
            const r = this.#killMarkT > 0 ? 3 : 2
            b.fillStyle = '#cc2200'
            for (let i = 1; i <= r; i++) {
                b.fillRect(cx - i, cy - i, 1, 1)
                b.fillRect(cx + i, cy - i, 1, 1)
                b.fillRect(cx - i, cy + i, 1, 1)
                b.fillRect(cx + i, cy + i, 1, 1)
            }
            b.fillRect(cx, cy, 1, 1)
        } else {
            const sp = this.#spreadT > 0 ? 1 : 0
            b.fillStyle = 'rgba(223,159,150,0.6)'
            b.fillRect(cx - 2 - sp, cy, 2, 1)
            b.fillRect(cx + 1 + sp, cy, 2, 1)
            b.fillRect(cx, cy - 2 - sp, 1, 2)
            b.fillRect(cx, cy + 1 + sp, 1, 2)
        }
    }

    #render(ctx, engine) {
        const now = engine.clock.now()
        const p = this.#player
        const b = this.#b

        const speed = Math.min(p.vel.magnitude / MAX_SPEED, 1)
        const horizon = H / 2 + Math.abs(Math.sin(this.#bobPhase)) * 2 * speed
        const lightPop = this.#flashT > 40 ? 0.25 : 0
        const corruption = 0.015 + this.#glitch.lowHp * 0.08 + (this.#glitch.trauma > 0.5 ? 0.1 : 0)

        const cam = makeCamera(p.pos.x / TILE, p.pos.y / TILE, p.angle, FOV)
        this.#raycaster.renderWalls(b, Level, cam, this.#wallTex, horizon, {
            lightPop,
            corruption,
            corruptTex: this.#corruptTex,
        })
        this.#raycaster.renderSprites(b, this.#collectSprites(now), cam, horizon, lightPop)
        this.#drawGun(b, now)

        if (this.#tint && this.#tint.until > now) {
            b.globalCompositeOperation = 'screen'
            b.fillStyle = this.#tint.color
            b.fillRect(0, 0, W, H)
            b.globalCompositeOperation = 'source-over'
        }

        this.#glitch.apply(b, now)

        if (this.#glitch.dying) drawDeathCard(b, W, H, this.#glitch.deathElapsed)
        if (this.#glitch.winning) drawWinCard(b, W, H, this.#glitch.winElapsed, this.#playMsAtEnd)

        // final blit with shake/judder; black behind so shake shows tracking edges
        const off = this.#glitch.blitOffset()
        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = '#020402'
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(this.#buffer, off.x, off.y)
    }
}

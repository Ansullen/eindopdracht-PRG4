import { Actor, CollisionType, Keys, vec } from 'excalibur'
import { Bullet } from './Bullet.js'
import { Sfx } from '../audio.js'
import { WorldFX } from '../render/worldfx.js'
import { showEndOverlay } from '../ui/popup.js'

const FWD_SPEED = 140
const BACK_SPEED = 100
const STRAFE_SPEED = 110
const TURN_SPEED = 150 * Math.PI / 180 // rad/s
const MOUSE_SENS = 0.0022
const MAX_AMMO = 10
const MAX_HP = 100
const FIRE_COOLDOWN = 220
const RELOAD_TIME = 400

function normalizeAngle(a) {
    return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
}

export class Player extends Actor {
    hp = MAX_HP
    ammo = MAX_AMMO
    reserveAmmo = 0
    hasKey = false
    won = false
    dead = false
    kills = 0
    angle = 0
    reloadUntil = 0

    #lastShotAt = -Infinity
    #pendingReload = false
    #onPointerMove
    #onCanvasClick

    constructor(x, y) {
        super({
            x,
            y,
            radius: 10,
            collisionType: CollisionType.Active,
        })
    }

    onInitialize(engine) {
        // pointer lock: acquire on click (also re-entry after Esc); the locking
        // click never shoots because the shoot handler requires an active lock
        this.#onCanvasClick = () => {
            if (!this.dead && !this.won && document.pointerLockElement !== engine.canvas) {
                engine.canvas.requestPointerLock()
            }
        }
        engine.canvas.addEventListener('click', this.#onCanvasClick)

        this.#onPointerMove = (e) => {
            if (document.pointerLockElement === engine.canvas && !this.dead && !this.won) {
                this.angle += e.movementX * MOUSE_SENS
            }
        }
        document.addEventListener('pointermove', this.#onPointerMove)

        engine.input.pointers.primary.on('down', () => {
            if (document.pointerLockElement !== engine.canvas) return
            this.#shoot(engine)
        })
    }

    #shoot(engine) {
        if (this.dead || this.won) return
        const now = engine.clock.now()
        if (now - this.#lastShotAt < FIRE_COOLDOWN || this.reloadUntil > now) return
        this.#lastShotAt = now

        if (this.ammo <= 0) {
            Sfx.dryFire()
            WorldFX.emit('dry')
            return
        }
        const nx = Math.cos(this.angle)
        const ny = Math.sin(this.angle)
        this.scene.add(new Bullet(this.pos.x + nx * 15, this.pos.y + ny * 15, nx, ny))
        this.ammo--
        Sfx.shoot()
        WorldFX.emit('shoot')
    }

    #reload(engine) {
        const now = engine.clock.now()
        if (this.reloadUntil > now || this.#pendingReload) return
        if (this.ammo >= MAX_AMMO || this.reserveAmmo <= 0) return
        this.reloadUntil = now + RELOAD_TIME
        this.#pendingReload = true
        Sfx.reload()
    }

    addKill() {
        this.kills++
    }

    pickupAmmo(amount) {
        this.reserveAmmo += amount
        Sfx.pickup()
        WorldFX.emit('pickup')
    }

    pickupKey() {
        this.hasKey = true
        Sfx.keyPickup()
        WorldFX.emit('key')
    }

    win() {
        if (this.won || this.dead) return
        this.won = true
        this.vel = vec(0, 0)
        Sfx.win()
        WorldFX.emit('win')
        document.exitPointerLock()
        setTimeout(() => showEndOverlay('TAPE RECOVERED', `you escaped - ${this.kills} terminated`, '#00cc44'), 1400)
    }

    takeDamage(amount, fromPos) {
        if (this.dead || this.won) return
        this.hp = Math.max(0, this.hp - amount)

        let bucket = 2 // back
        if (fromPos) {
            const rel = normalizeAngle(Math.atan2(fromPos.y - this.pos.y, fromPos.x - this.pos.x) - this.angle)
            if (Math.abs(rel) < Math.PI / 4) bucket = 0        // front
            else if (rel >= Math.PI / 4 && rel < Math.PI * 0.75) bucket = 1 // right
            else if (rel <= -Math.PI / 4 && rel > -Math.PI * 0.75) bucket = 3 // left
        }
        Sfx.hurt()
        WorldFX.emit('damage', bucket)

        if (this.hp <= 0) this.#die()
    }

    #die() {
        this.dead = true
        this.vel = vec(0, 0)
        Sfx.death()
        WorldFX.emit('death')
        document.exitPointerLock()
        setTimeout(() => showEndOverlay('FEED TERMINATED', 'the corridor keeps you', '#cc2200'), 1900)
    }

    onPreKill() {
        document.removeEventListener('pointermove', this.#onPointerMove)
        this.scene?.engine?.canvas.removeEventListener('click', this.#onCanvasClick)
    }

    onPreUpdate(engine, delta) {
        if (this.won || this.dead) {
            this.vel = vec(0, 0)
            return
        }

        const keys = engine.input.keyboard
        const dt = delta / 1000

        if (keys.isHeld(Keys.Left)) this.angle -= TURN_SPEED * dt
        if (keys.isHeld(Keys.Right)) this.angle += TURN_SPEED * dt
        if (keys.wasPressed(Keys.R)) this.#reload(engine)
        if (keys.wasPressed(Keys.Space)) this.#shoot(engine)

        // finish a pending reload once the timer runs out
        if (this.#pendingReload && engine.clock.now() >= this.reloadUntil) {
            this.#pendingReload = false
            const take = Math.min(MAX_AMMO - this.ammo, this.reserveAmmo)
            this.ammo += take
            this.reserveAmmo -= take
        }

        let f = 0
        let s = 0
        if (keys.isHeld(Keys.W) || keys.isHeld(Keys.Up)) f += 1
        if (keys.isHeld(Keys.S) || keys.isHeld(Keys.Down)) f -= 1
        if (keys.isHeld(Keys.A)) s -= 1
        if (keys.isHeld(Keys.D)) s += 1

        const fx = Math.cos(this.angle)
        const fy = Math.sin(this.angle)
        const diag = f !== 0 && s !== 0 ? Math.SQRT1_2 : 1
        const fSpeed = f > 0 ? FWD_SPEED : BACK_SPEED // backpedaling is slower: retreat is a choice
        const tx = (fx * f * fSpeed - fy * s * STRAFE_SPEED) * diag
        const ty = (fy * f * fSpeed + fx * s * STRAFE_SPEED) * diag

        // short acceleration ramp (~80ms to speed) so movement has weight
        const k = 1 - Math.pow(0.0001, dt)
        this.vel = vec(
            this.vel.x + (tx - this.vel.x) * k,
            this.vel.y + (ty - this.vel.y) * k,
        )
    }
}

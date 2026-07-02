import { Actor, CollisionType, Keys, vec } from 'excalibur'
import { Bullet } from './Bullet.js'
import { Res } from '../resources.js'

const SPEED = 80
const MAX_AMMO = 10
const MAX_HP = 100

export class Player extends Actor {
    #hud
    #killHUD
    #placeHUD

    hp = MAX_HP
    ammo = MAX_AMMO
    reserveAmmo = 0
    hasKey = false
    won = false
    dead = false
    kills = 0

    constructor(x, y) {
        super({
            x,
            y,
            radius: 10,
            collisionType: CollisionType.Active,
        })
    }

    onInitialize(engine) {
        this.graphics.use(Res.player.toSprite())

        this.#hud = document.createElement('div')
        this.#hud.style.cssText = [
            'position: fixed',
            'font-family: "Press Start 2P", monospace',
            'font-size: 14px',
            'color: white',
            'line-height: 2',
            'text-shadow: 2px 2px 0 black',
            'z-index: 999',
            'pointer-events: none',
        ].join(';')
        document.body.appendChild(this.#hud)
        this.#updateHUD()

        this.#killHUD = document.createElement('div')
        this.#killHUD.style.cssText = [
            'position: fixed',
            'font-family: "Press Start 2P", monospace',
            'font-size: 14px',
            'color: white',
            'line-height: 2',
            'text-shadow: 2px 2px 0 black',
            'z-index: 999',
            'pointer-events: none',
            'text-align: right',
        ].join(';')
        document.body.appendChild(this.#killHUD)
        this.#updateKillHUD()

        this.#placeHUD = () => {
            const rect = engine.canvas.getBoundingClientRect()
            this.#hud.style.left = (rect.left + 20) + 'px'
            this.#hud.style.top  = (rect.top  + 20) + 'px'
            this.#killHUD.style.right = (window.innerWidth - rect.right + 20) + 'px'
            this.#killHUD.style.top   = (rect.top + 20) + 'px'
        }
        this.#placeHUD()
        window.addEventListener('resize', this.#placeHUD)

        engine.input.pointers.primary.on('down', (evt) => {
            if (this.ammo <= 0 || this.dead || this.won) return
            const worldPos = evt.worldPos
            const dx = worldPos.x - this.pos.x
            const dy = worldPos.y - this.pos.y
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len === 0) return
            const nx = dx / len
            const ny = dy / len
            const bullet = new Bullet(this.pos.x + nx * 15, this.pos.y + ny * 15, nx, ny)
            this.scene.add(bullet)
            this.ammo--
            this.#updateHUD()
        })
    }

    #hpColor() {
        const pct = this.hp / MAX_HP
        if (pct > 0.6) return '#00cc44'
        if (pct > 0.3) return '#ffcc00'
        return '#cc2200'
    }

    #updateHUD() {
        const pct = Math.max(0, this.hp / MAX_HP) * 100
        const color = this.#hpColor()
        this.#hud.innerHTML = `
            <div style="margin-bottom:4px">
                HP
                <span style="display:inline-block;width:120px;height:10px;background:#333;border:2px solid white;vertical-align:middle;margin-left:8px">
                    <span style="display:block;width:${pct}%;height:100%;background:${color};transition:width 0.1s"></span>
                </span>
                ${this.hp}
            </div>
            AMMO: ${this.ammo} / ${this.reserveAmmo}<br>
            KEY: ${this.hasKey ? 'YES' : 'NO'}
        `
    }

    #updateKillHUD() {
        this.#killHUD.innerHTML = `KILLS: ${this.kills}`
    }

    addKill() {
        this.kills++
        this.#updateKillHUD()
    }

    pickupAmmo(amount) {
        this.reserveAmmo += amount
        this.#updateHUD()
    }

    pickupKey() {
        this.hasKey = true
        this.#updateHUD()
    }

    #reload() {
        if (this.ammo >= MAX_AMMO || this.reserveAmmo <= 0) return
        const needed = MAX_AMMO - this.ammo
        const take = Math.min(needed, this.reserveAmmo)
        this.ammo += take
        this.reserveAmmo -= take
        this.#updateHUD()
    }

    onPreKill(scene) {
        this.#hud?.remove()
        this.#killHUD?.remove()
        window.removeEventListener('resize', this.#placeHUD)
    }

    takeDamage(amount) {
        if (this.dead) return
        this.hp = Math.max(0, this.hp - amount)
        this.#updateHUD()
        if (this.hp <= 0) this.#die()
    }

    #die() {
        this.dead = true
        this.vel = vec(0, 0)

        const overlay = document.createElement('div')
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'gap: 48px',
            'background: rgba(0,0,0,0.8)',
            'z-index: 9999',
        ].join(';')

        const title = document.createElement('div')
        title.textContent = 'YOU DIED'
        title.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 40px',
            'color: #cc2200',
        ].join(';')

        const btn = document.createElement('button')
        btn.textContent = 'PLAY AGAIN'
        btn.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 16px',
            'color: white',
            'background: #cc2200',
            'border: none',
            'padding: 16px 32px',
            'cursor: pointer',
        ].join(';')
        btn.onclick = () => window.location.reload()

        overlay.appendChild(title)
        overlay.appendChild(btn)
        document.body.appendChild(overlay)
    }

    onPreUpdate(engine) {
        if (this.won || this.dead) {
            this.vel = vec(0, 0)
            return
        }

        const keys = engine.input.keyboard
        let vx = 0
        let vy = 0

        if (keys.isHeld(Keys.W) || keys.isHeld(Keys.Up))    vy = -SPEED
        if (keys.isHeld(Keys.S) || keys.isHeld(Keys.Down))  vy =  SPEED
        if (keys.isHeld(Keys.A) || keys.isHeld(Keys.Left))  vx = -SPEED
        if (keys.isHeld(Keys.D) || keys.isHeld(Keys.Right)) vx =  SPEED

        if (keys.wasPressed(Keys.R)) this.#reload()

        this.vel = vec(vx, vy)
    }
}

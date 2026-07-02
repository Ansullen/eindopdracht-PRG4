import { Actor, CollisionType, vec } from 'excalibur'
import { Player } from './Player.js'
import { Res } from '../resources.js'

export class Exit extends Actor {
    #player
    #isOpen = false
    #lockedSprite
    #openSprite

    constructor(x, y, player) {
        super({ x, y, width: 40, height: 40, collisionType: CollisionType.Passive })
        this.#player = player
    }

    onInitialize(engine) {
        this.#lockedSprite = Res.exitLocked.toSprite()
        this.#lockedSprite.scale = vec(2, 2)
        this.#openSprite = Res.exitOpen.toSprite()
        this.#openSprite.scale = vec(2, 2)
        this.graphics.use(this.#lockedSprite)
    }

    onCollisionStart(self, other) {
        const owner = other.owner
        if (!(owner instanceof Player)) return
        if (!owner.hasKey) return
        owner.won = true
        this.#showWin(this.scene.engine)
    }

    onPreUpdate() {
        const open = this.#player.hasKey
        if (open !== this.#isOpen) {
            this.#isOpen = open
            this.graphics.use(open ? this.#openSprite : this.#lockedSprite)
        }
    }

    #showWin(engine) {
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
        title.textContent = 'YOU ESCAPED!'
        title.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 32px',
            'color: #00cc44',
        ].join(';')

        const btn = document.createElement('button')
        btn.textContent = 'PLAY AGAIN'
        btn.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 16px',
            'color: black',
            'background: #00cc44',
            'border: none',
            'padding: 16px 32px',
            'cursor: pointer',
            'text-shadow: none',
        ].join(';')
        btn.onclick = () => window.location.reload()

        overlay.appendChild(title)
        overlay.appendChild(btn)
        document.body.appendChild(overlay)
    }
}

import { Actor, Rectangle, Color, CollisionType } from 'excalibur'

const LOCKED = new Rectangle({ width: 40, height: 40, color: Color.fromHex('#cc2200') })
const OPEN   = new Rectangle({ width: 40, height: 40, color: Color.fromHex('#00cc44') })

export class Exit extends Actor {
    constructor(x, y, player) {
        super({ x, y, width: 40, height: 40, collisionType: CollisionType.Passive })
        this._player = player
        this._isOpen = false
    }

    onInitialize(engine) {
        this.graphics.use(LOCKED)
        this.on('collisionstart', (evt) => {
            const other = evt.other?.owner
            if (!other?.hasTag('player')) return
            if (!other.hasKey) return
            other.won = true
            this._showWin(engine)
        })
    }

    onPreUpdate() {
        const open = this._player.hasKey
        if (open !== this._isOpen) {
            this._isOpen = open
            this.graphics.use(open ? OPEN : LOCKED)
        }
    }

    _showWin(engine) {
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
            'text-shadow: 4px 4px 0 black',
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
            'box-shadow: 4px 4px 0 #007722',
        ].join(';')
        btn.onclick = () => window.location.reload()

        overlay.appendChild(title)
        overlay.appendChild(btn)
        document.body.appendChild(overlay)
    }
}

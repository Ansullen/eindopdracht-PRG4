import { Actor, Canvas, CollisionType } from 'excalibur'

const keyGraphic = new Canvas({
    width: 26,
    height: 14,
    cache: true,
    draw(ctx) {
        ctx.fillStyle = '#ffd700'
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 2

        // Ring (hollow circle)
        ctx.beginPath()
        ctx.arc(6, 7, 5, 0, Math.PI * 2)
        ctx.stroke()

        // Shaft
        ctx.fillRect(10, 6, 14, 2)

        // Teeth
        ctx.fillRect(16, 8, 2, 4)
        ctx.fillRect(20, 8, 2, 3)
    },
})

export class Key extends Actor {
    constructor(x, y) {
        super({ x, y, width: 26, height: 14, collisionType: CollisionType.Passive })
    }

    onInitialize(engine) {
        this.graphics.use(keyGraphic)
        this.on('collisionstart', (evt) => {
            const other = evt.other?.owner
            if (!other?.hasTag('player')) return
            other.pickupKey()
            this.kill()
        })
    }
}

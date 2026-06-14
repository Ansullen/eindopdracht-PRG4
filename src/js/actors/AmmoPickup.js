import { Actor, Rectangle, Color, CollisionType } from 'excalibur'

export class AmmoPickup extends Actor {
    constructor(x, y) {
        super({
            x,
            y,
            width: 16,
            height: 10,
            collisionType: CollisionType.Passive,
        })
    }

    onInitialize(engine) {
        this.graphics.use(new Rectangle({ width: 16, height: 10, color: Color.fromHex('#f5c400') }))
        this.on('collisionstart', (evt) => {
            const other = evt.other?.owner
            if (!other?.hasTag('player')) return
            other.pickupAmmo(10)
            this.kill()
        })
    }
}

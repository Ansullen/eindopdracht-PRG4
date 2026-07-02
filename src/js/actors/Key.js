import { Pickup } from './Pickup.js'
import { Res } from '../resources.js'

export class Key extends Pickup {
    constructor(x, y) {
        super(x, y, 26, 14)
    }

    onInitialize(engine) {
        this.graphics.use(Res.key.toSprite())
    }

    applyPickup(player) {
        player.pickupKey()
    }
}

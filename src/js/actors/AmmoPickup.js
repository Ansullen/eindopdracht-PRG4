import { Pickup } from './Pickup.js'
import { Res } from '../resources.js'

export class AmmoPickup extends Pickup {
    constructor(x, y) {
        super(x, y, 16, 10)
    }

    onInitialize(engine) {
        this.graphics.use(Res.ammo.toSprite())
    }

    applyPickup(player) {
        player.pickupAmmo(10)
    }
}

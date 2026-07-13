import { Pickup } from './Pickup.js'

export class AmmoPickup extends Pickup {
    constructor(x, y) {
        super(x, y, 16, 10)
    }

    applyPickup(player) {
        player.pickupAmmo(10)
    }
}

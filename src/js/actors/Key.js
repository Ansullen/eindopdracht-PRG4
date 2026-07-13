import { Pickup } from './Pickup.js'

export class Key extends Pickup {
    constructor(x, y) {
        super(x, y, 26, 14)
    }

    applyPickup(player) {
        player.pickupKey()
    }
}

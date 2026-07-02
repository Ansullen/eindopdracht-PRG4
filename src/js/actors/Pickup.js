import { Actor, CollisionType } from 'excalibur'
import { Player } from './Player.js'

export class Pickup extends Actor {
    constructor(x, y, width, height) {
        super({ x, y, width, height, collisionType: CollisionType.Passive })
    }

    onCollisionStart(self, other) {
        const owner = other.owner
        if (!(owner instanceof Player)) return
        this.applyPickup(owner)
        this.kill()
    }

    applyPickup(player) {}
}

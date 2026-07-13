import { Actor, CollisionType } from 'excalibur'
import { Player } from './Player.js'
import { Sfx } from '../audio.js'
import { WorldFX } from '../render/worldfx.js'

export class Exit extends Actor {
    #player
    #wasOpen = false

    constructor(x, y, player) {
        super({ x, y, width: 40, height: 40, collisionType: CollisionType.Passive })
        this.#player = player
    }

    onCollisionStart(self, other) {
        const owner = other.owner
        if (!(owner instanceof Player)) return
        if (!owner.hasKey) return
        owner.win()
    }

    onPreUpdate() {
        // the view renders the open/locked billboard from player.hasKey;
        // this just fires the unlock sting once
        if (this.#player.hasKey && !this.#wasOpen) {
            this.#wasOpen = true
            Sfx.unlock()
            WorldFX.emit('unlock')
        }
    }
}

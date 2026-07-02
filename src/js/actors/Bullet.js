import { Actor, CollisionType, vec } from 'excalibur'
import { Zombie } from './Zombie.js'
import { Player } from './Player.js'
import { Res } from '../resources.js'

const BULLET_SPEED = 300
const MAX_DISTANCE = 500
const TILE = 64

export class Bullet extends Actor {
    #startPos

    constructor(x, y, dirX, dirY) {
        super({
            x,
            y,
            width: 14,
            height: 3,
            collisionType: CollisionType.Passive,
        })
        this.rotation = Math.atan2(dirY, dirX)
        this.vel = vec(dirX * BULLET_SPEED, dirY * BULLET_SPEED)
        this.#startPos = vec(x, y)
    }

    onInitialize(engine) {
        this.graphics.use(Res.bullet.toSprite())
    }

    onCollisionStart(self, other) {
        const owner = other.owner
        if (!owner || owner instanceof Player) return
        if (owner instanceof Zombie) owner.takeDamage(20)
        this.kill()
    }

    onPreUpdate() {
        const col = Math.floor(this.pos.x / TILE)
        const row = Math.floor(this.pos.y / TILE)
        const tile = this.scene?.tilemap?.getTile(col, row)
        if (tile?.solid) {
            this.kill()
            return
        }

        const dx = this.pos.x - this.#startPos.x
        const dy = this.pos.y - this.#startPos.y
        if (dx * dx + dy * dy > MAX_DISTANCE * MAX_DISTANCE) {
            this.kill()
        }
    }
}

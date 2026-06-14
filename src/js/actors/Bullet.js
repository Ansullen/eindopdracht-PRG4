import { Actor, Rectangle, Color, CollisionType, vec } from 'excalibur'
import { Zombie } from './Zombie.js'

const BULLET_SPEED = 300
const MAX_DISTANCE = 500
const TILE = 64

export class Bullet extends Actor {
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
        this._startPos = vec(x, y)
    }

    onInitialize(engine) {
        this.graphics.use(new Rectangle({ width: 14, height: 3, color: Color.fromHex('#ffe066') }))
        this.on('collisionstart', (evt) => {
            const other = evt.other?.owner
            if (!other || other.hasTag('player')) return
            if (other instanceof Zombie) other.takeDamage(20)
            this.kill()
        })
    }

    onPreUpdate() {
        const col = Math.floor(this.pos.x / TILE)
        const row = Math.floor(this.pos.y / TILE)
        const tile = this.scene?.tilemap?.getTile(col, row)
        if (tile?.solid) {
            this.kill()
            return
        }

        const dx = this.pos.x - this._startPos.x
        const dy = this.pos.y - this._startPos.y
        if (dx * dx + dy * dy > MAX_DISTANCE * MAX_DISTANCE) {
            this.kill()
        }
    }
}

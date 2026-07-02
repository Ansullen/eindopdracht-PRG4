import { Actor, CollisionType, vec } from 'excalibur'
import { Player } from './Player.js'
import { Res } from '../resources.js'

const SPEED = 40
const AGGRO_RANGE = 200
const ATTACK_DAMAGE = 10
const ATTACK_COOLDOWN = 1000

export class Zombie extends Actor {
    #contacting = false
    #attackCooldown = 0
    #player
    #state = 'idle'

    hp = 60

    constructor(x, y, player) {
        super({
            x,
            y,
            radius: 10,
            collisionType: CollisionType.Active,
        })
        this.#player = player
    }

    onInitialize(engine) {
        this.graphics.use(Res.zombie.toSprite())
    }

    onCollisionStart(self, other) {
        if (other.owner instanceof Player) this.#contacting = true
    }

    onCollisionEnd(self, other) {
        if (other.owner instanceof Player) this.#contacting = false
    }

    takeDamage(amount) {
        this.hp -= amount
        if (this.hp <= 0) {
            this.#player.addKill()
            this.kill()
        }
    }

    onPreUpdate(engine, delta) {
        const dx = this.#player.pos.x - this.pos.x
        const dy = this.#player.pos.y - this.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        this.#state = dist < AGGRO_RANGE ? 'chase' : 'idle'

        switch (this.#state) {
            case 'chase':
                this.vel = vec((dx / dist) * SPEED, (dy / dist) * SPEED)
                break
            case 'idle':
                this.vel = vec(0, 0)
                break
        }

        this.#attackCooldown -= delta
        if (this.#contacting && this.#attackCooldown <= 0) {
            this.#player.takeDamage(ATTACK_DAMAGE)
            this.#attackCooldown = ATTACK_COOLDOWN
        }
    }
}

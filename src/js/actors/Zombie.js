import { Actor, Circle, Color, CollisionType, vec } from 'excalibur'

const SPEED = 40
const AGGRO_RANGE = 200
const ATTACK_DAMAGE = 10
const ATTACK_COOLDOWN = 1000

export class Zombie extends Actor {
    constructor(x, y, player) {
        super({
            x,
            y,
            radius: 10,
            color: Color.fromHex('#00aa00'),
            collisionType: CollisionType.Active,
        })
        this.player = player
        this.attackCooldown = 0
    }

    onInitialize(engine) {
        this.hp = 100
        this.graphics.use(new Circle({ radius: 10, color: Color.fromHex('#00aa00') }))
    }

    takeDamage(amount) {
        this.hp -= amount
        if (this.hp <= 0) {
            this.player.addKill()
            this.kill()
        }
    }

    onPreUpdate(engine, delta) {
        const dx = this.player.pos.x - this.pos.x
        const dy = this.player.pos.y - this.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < AGGRO_RANGE) {
            this.vel = vec((dx / dist) * SPEED, (dy / dist) * SPEED)
        } else {
            this.vel = vec(0, 0)
        }

        this.attackCooldown -= delta
        if (dist < 25 && this.attackCooldown <= 0) {
            this.player.takeDamage(ATTACK_DAMAGE)
            this.attackCooldown = ATTACK_COOLDOWN
        }
    }
}

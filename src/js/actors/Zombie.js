import { Actor, CollisionType, vec } from 'excalibur'
import { Player } from './Player.js'
import { Sfx } from '../audio.js'
import { WorldFX } from '../render/worldfx.js'
import { Level, TILE } from '../level.js'

const SPEED = 55
const AGGRO_RANGE = 260
const ATTACK_DAMAGE = 10
const ATTACK_COOLDOWN = 1000
const WINDUP = 300      // telegraph before the bite lands — you can strafe out
const AGGRO_MEMORY = 4000
const BITE_RANGE = 30   // circle radii (10+10) plus a lunge

export class Zombie extends Actor {
    #attackCooldown = 0
    #windup = 0
    #aggroT = 0
    #nextGroanIn = 0
    #player

    state = 'idle' // idle | chase | windup (the view picks billboard frames from this)
    flashT = 0
    #stunT = 0

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

    // stereo pan of this zombie relative to where the player is looking
    #pan() {
        const bearing = Math.atan2(this.pos.y - this.#player.pos.y, this.pos.x - this.#player.pos.x)
        return Math.sin(bearing - this.#player.angle)
    }

    #dist01() {
        return Math.min(this.pos.distance(this.#player.pos) / 512, 1)
    }

    takeDamage(amount, dir) {
        this.hp -= amount
        this.flashT = 80
        if (dir) {
            this.#stunT = 100
            this.vel = vec(dir.x * 140, dir.y * 140) // knockback flinch
        }
        if (this.hp <= 0) {
            this.#player.addKill()
            WorldFX.burst(this.pos.x, this.pos.y)
            WorldFX.splat(this.pos.x, this.pos.y)
            WorldFX.emit('kill')
            Sfx.zombieDie(this.#pan(), 1 - this.#dist01() * 0.8)
            this.kill()
        } else {
            WorldFX.emit('hit')
        }
    }

    onPreUpdate(engine, delta) {
        if (this.#player.dead || this.#player.won) {
            this.vel = vec(0, 0)
            return
        }

        if (this.flashT > 0) this.flashT -= delta
        this.#attackCooldown -= delta
        if (this.#stunT > 0) {
            this.#stunT -= delta
            return // keep the knockback velocity, AI resumes after
        }

        const dx = this.#player.pos.x - this.pos.x
        const dy = this.#player.pos.y - this.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // aggro needs range AND line of sight; once seen, remembers for a few seconds
        const canSee = dist < AGGRO_RANGE && Level.hasLineOfSight(
            this.pos.x / TILE, this.pos.y / TILE,
            this.#player.pos.x / TILE, this.#player.pos.y / TILE)
        if (canSee) {
            if (this.#aggroT <= 0) {
                Sfx.groan(this.#pan(), 1 - this.#dist01() * 0.8)
                this.#nextGroanIn = 4000 + Math.random() * 5000
            }
            this.#aggroT = AGGRO_MEMORY
        } else if (this.#aggroT > 0) {
            this.#aggroT -= delta
        }

        // attack telegraph: plant, rear back, then bite only if still in range
        // (distance-based, not collision events — the physics solver keeps two
        // Active circles separated, so contact start/end flickers every frame)
        if (this.#windup > 0) {
            this.#windup -= delta
            this.vel = vec(0, 0)
            this.state = 'windup'
            if (this.#windup <= 0) {
                if (dist < BITE_RANGE + 6) this.#player.takeDamage(ATTACK_DAMAGE, this.pos)
                this.#attackCooldown = ATTACK_COOLDOWN
            }
            return
        }
        if (dist < BITE_RANGE && this.#attackCooldown <= 0) {
            this.#windup = WINDUP
            this.state = 'windup'
            Sfx.attackHiss(this.#pan())
            return
        }

        if (this.#aggroT > 0 && dist > 1) {
            this.state = 'chase'
            this.vel = vec((dx / dist) * SPEED, (dy / dist) * SPEED)
            this.#nextGroanIn -= delta
            if (this.#nextGroanIn <= 0) {
                Sfx.groan(this.#pan(), 1 - this.#dist01() * 0.8)
                this.#nextGroanIn = 4000 + Math.random() * 5000
            }
        } else {
            this.state = 'idle'
            this.vel = vec(0, 0)
        }
    }
}

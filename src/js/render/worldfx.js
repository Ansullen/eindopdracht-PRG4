// Shared world-effect state: an event queue actors push into (the view drains it
// each frame to drive gun animation and glitch bursts), plus particles and
// floor decals in world pixel coordinates.

export const WorldFX = {
    events: [],
    particles: [],
    splats: [],

    emit(type, data) {
        this.events.push({ type, data })
    },

    drain() {
        const e = this.events
        this.events = []
        return e
    },

    burst(x, y) {
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2
            const speed = 40 + Math.random() * 50
            this.particles.push({
                x, y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                z: 0.4 + Math.random() * 0.3, // 0 floor .. 1 ceiling
                vz: (Math.random() - 0.2) * 1.2,
                life: 500,
                red: i >= 4,
            })
        }
    },

    splat(x, y) {
        this.splats.push({ x, y })
        if (this.splats.length > 40) this.splats.shift()
    },

    update(dt) {
        const s = dt / 1000
        this.particles = this.particles.filter(p => {
            p.life -= dt
            if (p.life <= 0) return false
            p.x += p.vx * s
            p.y += p.vy * s
            p.vz -= 3 * s
            p.z = Math.max(0.03, p.z + p.vz * s)
            return true
        })
    },

    reset() {
        this.events = []
        this.particles = []
        this.splats = []
    },
}

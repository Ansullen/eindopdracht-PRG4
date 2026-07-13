// Procedural WebAudio sound — no audio assets, everything synthesized.
// Call Sfx.init() from a user gesture (the start button) before using.
// source -> per-sound gain [-> panner] -> compressor -> master -> destination

class SfxEngine {
    #ctx = null
    #master = null
    #comp = null
    #noiseBuf = null
    #staticGain = null
    #droneGain = null
    #bedGain = null      // duckable group for ambient
    onCrackle = null     // hook: view adds a tiny trauma flicker per crackle

    init() {
        if (this.#ctx) {
            this.#ctx.resume()
            return
        }
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        this.#ctx = ctx

        this.#master = ctx.createGain()
        this.#master.gain.value = 0.8
        this.#comp = ctx.createDynamicsCompressor()
        this.#comp.threshold.value = -18
        this.#comp.knee.value = 12
        this.#comp.ratio.value = 4
        this.#comp.attack.value = 0.003
        this.#comp.release.value = 0.25
        this.#comp.connect(this.#master).connect(ctx.destination)

        const len = ctx.sampleRate * 2
        this.#noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = this.#noiseBuf.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

        this.#startAmbient()
        this.#scheduleCrackle()
    }

    get ready() { return !!this.#ctx }

    #noise() {
        const src = this.#ctx.createBufferSource()
        src.buffer = this.#noiseBuf
        src.loop = true
        return src
    }

    #env(gainNode, t0, peak, decay) {
        const g = gainNode.gain
        g.setValueAtTime(0.0001, t0)
        g.exponentialRampToValueAtTime(peak, t0 + 0.008)
        g.exponentialRampToValueAtTime(0.0001, t0 + decay)
    }

    #out(pan = 0) {
        if (pan === 0) return this.#comp
        const p = this.#ctx.createStereoPanner()
        p.pan.value = Math.max(-1, Math.min(1, pan))
        p.connect(this.#comp)
        return p
    }

    #startAmbient() {
        const ctx = this.#ctx
        this.#bedGain = ctx.createGain()
        this.#bedGain.gain.value = 1
        this.#bedGain.connect(this.#comp)

        // two slightly detuned sines beat against each other: slow unease
        this.#droneGain = ctx.createGain()
        this.#droneGain.gain.value = 0.08
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 200
        for (const f of [55, 55.7]) {
            const o = ctx.createOscillator()
            o.frequency.value = f
            o.connect(lp)
            o.start()
        }
        lp.connect(this.#droneGain).connect(this.#bedGain)

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.05
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.025
        lfo.connect(lfoGain).connect(this.#droneGain.gain)
        lfo.start()

        // static bed — swells with trauma/dread via setDread
        const noise = this.#noise()
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 3000
        this.#staticGain = ctx.createGain()
        this.#staticGain.gain.value = 0.015
        noise.connect(hp).connect(this.#staticGain).connect(this.#bedGain)
        noise.start()
    }

    #scheduleCrackle() {
        const tick = () => {
            if (this.#ctx) {
                const t = this.#ctx.currentTime
                const dur = 0.03 + Math.random() * 0.05
                this.#staticGain.gain.setValueAtTime(0.05, t)
                this.#staticGain.gain.setTargetAtTime(0.015, t + dur, 0.02)
                this.onCrackle?.()
            }
            setTimeout(tick, 3000 + Math.random() * 5000)
        }
        setTimeout(tick, 3000 + Math.random() * 5000)
    }

    // trauma+dread 0..1 — static bed volume
    setDread(level) {
        if (!this.#ctx) return
        this.#staticGain.gain.setTargetAtTime(0.015 + level * 0.06, this.#ctx.currentTime, 0.15)
    }

    #duckBed() {
        const t = this.#ctx.currentTime
        this.#bedGain.gain.setTargetAtTime(0.4, t, 0.05)
        this.#bedGain.gain.setTargetAtTime(1, t + 0.15, 0.4)
    }

    shoot() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const rnd = 0.95 + Math.random() * 0.1

        // crack
        const noise = this.#noise()
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 1800 * rnd
        bp.Q.value = 1
        const ng = ctx.createGain()
        this.#env(ng, t, 1.0, 0.12)
        noise.connect(bp).connect(ng).connect(this.#comp)
        noise.start(t)
        noise.stop(t + 0.15)

        // thump
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(180 * rnd, t)
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1)
        const og = ctx.createGain()
        this.#env(og, t, 0.9, 0.15)
        osc.connect(og).connect(this.#comp)
        osc.start(t)
        osc.stop(t + 0.18)

        // mech click
        const click = ctx.createOscillator()
        click.type = 'square'
        click.frequency.value = 2500
        const cg = ctx.createGain()
        this.#env(cg, t, 0.15, 0.01)
        click.connect(cg).connect(this.#comp)
        click.start(t)
        click.stop(t + 0.02)
    }

    dryFire() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const click = ctx.createOscillator()
        click.type = 'square'
        click.frequency.value = 2500
        const cg = ctx.createGain()
        this.#env(cg, t, 0.3, 0.012)
        click.connect(cg).connect(this.#comp)
        click.start(t)
        click.stop(t + 0.03)
    }

    reload() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const events = [[0, 2000, 0.3], [0.12, 900, 0.2], [0.3, 2200, 0.4]]
        for (const [dt, f, vol] of events) {
            const t = ctx.currentTime + dt
            const noise = this.#noise()
            const filt = ctx.createBiquadFilter()
            filt.type = dt === 0.12 ? 'bandpass' : 'highpass'
            filt.frequency.value = f
            filt.Q.value = 4
            const g = ctx.createGain()
            this.#env(g, t, vol, dt === 0.12 ? 0.08 : 0.015)
            noise.connect(filt).connect(g).connect(this.#comp)
            noise.start(t)
            noise.stop(t + 0.1)
        }
    }

    footstep(side = 0) {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const noise = this.#noise()
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 250 + Math.random() * 100
        const g = ctx.createGain()
        this.#env(g, t, 0.12, 0.05)
        noise.connect(lp).connect(g).connect(this.#out(side * 0.2))
        noise.start(t)
        noise.stop(t + 0.08)
    }

    // pan -1..1, vol 0..1 by distance
    groan(pan = 0, vol = 0.5) {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const f0 = 55 + Math.random() * 25
        const out = this.#out(pan)

        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 400
        lp.Q.value = 0.7
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(0.25 * vol, t + 0.3)
        g.gain.setValueAtTime(0.25 * vol, t + 0.9)
        g.gain.linearRampToValueAtTime(0.0001, t + 1.3)
        lp.connect(g).connect(out)

        const drift = ctx.createOscillator()
        drift.frequency.value = 0.8
        const driftGain = ctx.createGain()
        driftGain.gain.value = 8
        drift.connect(driftGain)
        drift.start(t)
        drift.stop(t + 1.4)

        for (const f of [f0, f0 + 7]) {
            const o = ctx.createOscillator()
            o.type = 'sawtooth'
            o.frequency.value = f
            driftGain.connect(o.frequency)
            o.connect(lp)
            o.start(t)
            o.stop(t + 1.4)
        }
    }

    attackHiss(pan = 0) {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const out = this.#out(pan)

        const noise = this.#noise()
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 2000
        const ng = ctx.createGain()
        ng.gain.setValueAtTime(0.0001, t)
        ng.gain.linearRampToValueAtTime(0.35, t + 0.25)
        ng.gain.linearRampToValueAtTime(0.0001, t + 0.3)
        noise.connect(hp).connect(ng).connect(out)
        noise.start(t)
        noise.stop(t + 0.32)

        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(600, t)
        osc.frequency.linearRampToValueAtTime(950, t + 0.25)
        const og = ctx.createGain()
        og.gain.setValueAtTime(0.0001, t)
        og.gain.linearRampToValueAtTime(0.15, t + 0.25)
        og.gain.linearRampToValueAtTime(0.0001, t + 0.3)
        osc.connect(og).connect(out)
        osc.start(t)
        osc.stop(t + 0.32)
    }

    hurt() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        this.#duckBed()

        const noise = this.#noise()
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 800
        const ng = ctx.createGain()
        this.#env(ng, t, 0.6, 0.2)
        noise.connect(lp).connect(ng).connect(this.#comp)
        noise.start(t)
        noise.stop(t + 0.25)

        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(220, t)
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.25)
        const og = ctx.createGain()
        this.#env(og, t, 0.5, 0.25)
        osc.connect(og).connect(this.#comp)
        osc.start(t)
        osc.stop(t + 0.3)
    }

    hitTick() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.value = 2000
        const g = ctx.createGain()
        this.#env(g, t, 0.12, 0.015)
        osc.connect(g).connect(this.#comp)
        osc.start(t)
        osc.stop(t + 0.03)
    }

    zombieDie(pan = 0, vol = 0.7) {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        const out = this.#out(pan)

        const splat = this.#noise()
        const slp = ctx.createBiquadFilter()
        slp.type = 'lowpass'
        slp.frequency.value = 500
        const sg = ctx.createGain()
        this.#env(sg, t, 0.8 * vol, 0.04)
        splat.connect(slp).connect(sg).connect(out)
        splat.start(t)
        splat.stop(t + 0.06)

        const body = this.#noise()
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.setValueAtTime(300, t)
        bp.frequency.exponentialRampToValueAtTime(100, t + 0.3)
        const bg = ctx.createGain()
        this.#env(bg, t, 0.5 * vol, 0.3)
        body.connect(bp).connect(bg).connect(out)
        body.start(t)
        body.stop(t + 0.35)

        const tone = ctx.createOscillator()
        tone.type = 'sawtooth'
        tone.frequency.setValueAtTime(100, t)
        tone.frequency.exponentialRampToValueAtTime(40, t + 0.35)
        const tg = ctx.createGain()
        this.#env(tg, t, 0.4 * vol, 0.35)
        tone.connect(tg).connect(out)
        tone.start(t)
        tone.stop(t + 0.4)
    }

    #arp(notes, type = 'square', vibratoLast = false) {
        const ctx = this.#ctx
        for (let i = 0; i < notes.length; i++) {
            const [dt, f, dur] = notes[i]
            const t = ctx.currentTime + dt
            const osc = ctx.createOscillator()
            osc.type = type
            osc.frequency.value = f
            if (vibratoLast && i === notes.length - 1) {
                const v = ctx.createOscillator()
                v.frequency.value = 5
                const vg = ctx.createGain()
                vg.gain.value = 12
                v.connect(vg).connect(osc.frequency)
                v.start(t)
                v.stop(t + dur + 0.05)
            }
            const g = ctx.createGain()
            g.gain.setValueAtTime(0.0001, t)
            g.gain.linearRampToValueAtTime(0.25, t + 0.005)
            g.gain.exponentialRampToValueAtTime(0.001, t + dur)
            osc.connect(g).connect(this.#comp)
            osc.start(t)
            osc.stop(t + dur + 0.05)
        }
    }

    pickup() {
        if (!this.#ctx) return
        this.#arp([[0, 660, 0.05], [0.05, 990, 0.08]])
    }

    keyPickup() {
        if (!this.#ctx) return
        this.#arp([[0, 660, 0.05], [0.05, 880, 0.05], [0.1, 1320, 0.18]], 'square', true)
    }

    unlock() {
        if (!this.#ctx) return
        this.#arp([[0, 660, 0.12], [0.12, 440, 0.12], [0.24, 330, 0.12]])
    }

    death() {
        if (!this.#ctx) return
        const ctx = this.#ctx
        const t = ctx.currentTime
        this.#duckBed()
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.exponentialRampToValueAtTime(25, t + 1.6)
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(1200, t)
        lp.frequency.exponentialRampToValueAtTime(80, t + 1.6)
        const g = ctx.createGain()
        this.#env(g, t, 0.5, 1.7)
        osc.connect(lp).connect(g).connect(this.#comp)
        osc.start(t)
        osc.stop(t + 1.8)

        const noise = this.#noise()
        const ng = ctx.createGain()
        ng.gain.setValueAtTime(0.0001, t + 0.5)
        ng.gain.linearRampToValueAtTime(0.4, t + 1.1)
        ng.gain.linearRampToValueAtTime(0.0001, t + 1.6)
        noise.connect(ng).connect(this.#comp)
        noise.start(t + 0.5)
        noise.stop(t + 1.7)
    }

    win() {
        if (!this.#ctx) return
        this.#arp([[0, 392, 0.3], [0.14, 523, 0.3], [0.28, 659, 0.3], [0.42, 784, 0.45]], 'triangle')
    }
}

export const Sfx = new SfxEngine()

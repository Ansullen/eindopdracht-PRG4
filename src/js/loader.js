import { Loader } from 'excalibur'

export class DeadCorridorLoader extends Loader {
    constructor() {
        super()
        this.suppressPlayButton = true
    }

    onDraw(ctx) {
        const w = this.engine.canvasWidth / this.engine.pixelRatio
        const h = this.engine.canvasHeight / this.engine.pixelRatio

        ctx.fillStyle = '#0a0000'
        ctx.fillRect(0, 0, w, h)

        const barWidth = Math.min(500, w * 0.5)
        const barX = w / 2 - barWidth / 2
        const barY = h / 2
        const barH = 10
        const margin = 2

        ctx.strokeStyle = '#cc2200'
        ctx.lineWidth = 2
        ctx.strokeRect(barX, barY, barWidth, barH)

        const fill = Math.max(barWidth * this.progress - margin * 2, 4)
        ctx.fillStyle = '#cc2200'
        ctx.fillRect(barX + margin, barY + margin, fill, barH - margin * 2)
    }
}

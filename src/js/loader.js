import { Loader } from 'excalibur'

const buttonCss = `
button#excalibur-play {
  display: none;
}
button#excalibur-play {
  box-sizing: border-box;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 999;
  border: 3px solid #cc0000;
  border-radius: 0;
  padding: 0.75rem 1.5rem;
  background: #0a0a0a;
  color: #cc0000;
  font-family: 'Press Start 2P', monospace;
  font-size: 1rem;
  cursor: pointer;
  image-rendering: pixelated;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: background 150ms, color 150ms;
  animation: excalibur-button-fadein 200ms;
}
button#excalibur-play:hover {
  background: #cc0000;
  color: #0a0a0a;
}
button#excalibur-play:active {
  transform: scale(0.97);
}
span#excalibur-play-icon { display: none; }
@keyframes excalibur-button-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`

export class DeadCorridorLoader extends Loader {
    constructor(resources) {
        super(resources)
        this._playButtonStyles = buttonCss
        this.playButtonText = 'Play'
        this.suppressPlayButton = false
    }

    onDraw(ctx) {
        const canvasHeight = this.engine.canvasHeight / this.engine.pixelRatio
        const canvasWidth = this.engine.canvasWidth / this.engine.pixelRatio
        const cx = canvasWidth / 2
        const cy = canvasHeight / 2

        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        const fontSize = Math.floor(canvasWidth / 18)
        const offscreen = document.createElement('canvas')
        offscreen.width = canvasWidth
        offscreen.height = canvasHeight
        const oc = offscreen.getContext('2d')

        oc.textAlign = 'center'
        oc.textBaseline = 'middle'
        oc.font = `bold ${Math.floor(fontSize / 4)}px 'Press Start 2P', monospace`
        oc.fillStyle = '#cc0000'
        oc.shadowColor = '#ff0000'
        oc.shadowBlur = 4
        oc.fillText('DEAD CORRIDOR', cx / 4, (cy - 60) / 4)

        ctx.imageSmoothingEnabled = false
        ctx.drawImage(offscreen, 0, 0, canvasWidth / 4, canvasHeight / 4, 0, 0, canvasWidth, canvasHeight)

        if (!this.suppressPlayButton && this._playButtonShown) return

        const barWidth = Math.min(500, canvasWidth * 0.5)
        const barX = cx - barWidth / 2
        const barY = cy + 30
        const barH = 12
        const margin = 3

        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.strokeStyle = '#cc0000'
        ctx.lineWidth = 2
        ctx.strokeRect(barX, barY, barWidth, barH)
        const fill = Math.max(barWidth * this.progress - margin * 2, 6)
        ctx.fillStyle = '#cc0000'
        ctx.fillRect(barX + margin, barY + margin, fill, barH - margin * 2)
        ctx.restore()
    }
}

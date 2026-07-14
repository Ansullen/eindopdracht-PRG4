// End-of-game DOM overlay, styled to match the VHS look.

export function showEndOverlay(title, subtitle, color) {
    const overlay = document.createElement('div')
    overlay.style.cssText = [
        'position: fixed',
        'inset: 0',
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'justify-content: center',
        'gap: 32px',
        'background: rgba(2,4,2,0.85)',
        'z-index: 9999',
        'opacity: 0',
        'transition: opacity 0.4s',
    ].join(';')

    const titleEl = document.createElement('div')
    titleEl.textContent = title
    titleEl.className = 'glitch-text'
    titleEl.dataset.text = title
    titleEl.style.cssText = [
        'font-family: "Press Start 2P", monospace',
        'font-size: 36px',
        `color: ${color}`,
        'letter-spacing: 4px',
        'text-align: center',
    ].join(';')

    const subEl = document.createElement('div')
    subEl.textContent = subtitle.toUpperCase()
    subEl.style.cssText = [
        'font-family: "Press Start 2P", monospace',
        'font-size: 12px',
        'color: #8f6d6d',
        'text-align: center',
    ].join(';')

    const btn = document.createElement('button')
    btn.textContent = 'REWIND TAPE'
    btn.style.cssText = [
        'font-family: "Press Start 2P", monospace',
        'font-size: 16px',
        'color: #020402',
        `background: ${color}`,
        'border: none',
        'padding: 16px 32px',
        'cursor: pointer',
        `box-shadow: 0 0 16px ${color}`,
    ].join(';')
    btn.onclick = () => window.location.reload()

    overlay.appendChild(titleEl)
    overlay.appendChild(subEl)
    overlay.appendChild(btn)
    document.body.appendChild(overlay)
    requestAnimationFrame(() => { overlay.style.opacity = '1' })
}

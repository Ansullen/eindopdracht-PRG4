// Small DOM helpers for pickup popups and the end-of-game overlay,
// styled to match the phosphor/VHS look.

export function showPopup(text, color = '#7dc87d') {
    const el = document.createElement('div')
    el.textContent = text
    el.style.cssText = [
        'position: fixed',
        'left: 50%',
        'bottom: 28%',
        'transform: translateX(-50%)',
        'font-family: "Press Start 2P", monospace',
        'font-size: 14px',
        `color: ${color}`,
        `text-shadow: 0 0 6px ${color}, 2px 2px 0 black`,
        'z-index: 999',
        'pointer-events: none',
        'transition: transform 0.5s ease-out, opacity 0.5s ease-out',
        'opacity: 1',
    ].join(';')
    document.body.appendChild(el)
    requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) translateY(-24px)'
        el.style.opacity = '0'
    })
    setTimeout(() => el.remove(), 600)
}

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
        'color: #6d8f6d',
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

export function showStartScreen() {
    return new Promise(resolve => {
        const overlay = document.createElement('div')
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'gap: 60px',
            'background: #0a0000',
            'z-index: 9999',
        ].join(';')

        const title = document.createElement('div')
        title.textContent = 'DEAD CORRIDOR'
        title.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 48px',
            'color: #cc2200',
            'text-shadow: 4px 4px 0 black',
            'letter-spacing: 4px',
            'text-align: center',
        ].join(';')

        const btn = document.createElement('button')
        btn.textContent = 'PLAY'
        btn.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 24px',
            'color: white',
            'background: #cc2200',
            'border: none',
            'padding: 20px 60px',
            'cursor: pointer',
        ].join(';')
        btn.onclick = () => {
            overlay.remove()
            resolve()
        }

        overlay.appendChild(title)
        overlay.appendChild(btn)
        document.body.appendChild(overlay)
    })
}

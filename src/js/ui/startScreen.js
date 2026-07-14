import { Sfx } from '../audio.js'

// injected once: glitch-title keyframes + the full-page CRT overlay that stays
// on top of everything (canvas AND dom) for the whole session
function injectChrome() {
    if (document.getElementById('crt-style')) return

    const style = document.createElement('style')
    style.id = 'crt-style'
    style.textContent = `
        @keyframes title-glitch {
            0%, 86%, 100% { clip-path: inset(0); transform: none; }
            87% { clip-path: inset(12% 0 55% 0); transform: translateX(-4px); }
            89% { clip-path: inset(60% 0 8% 0); transform: translateX(4px) skewX(4deg); }
            91% { clip-path: inset(30% 0 30% 0); transform: translateX(-2px); }
            92% { clip-path: inset(0); }
        }
        @keyframes crt-flicker {
            0% { opacity: 0.92; } 50% { opacity: 1; } 100% { opacity: 0.96; }
        }
        .glitch-text { position: relative; }
        .glitch-text::before, .glitch-text::after {
            content: attr(data-text);
            position: absolute;
            inset: 0;
            animation: title-glitch 2.4s steps(1, end) infinite;
        }
        .glitch-text::before { color: #ff6a5a; transform: translateX(-2px); animation-delay: -1.2s; opacity: 0.6; }
        .glitch-text::after { color: #7a1400; transform: translateX(2px); opacity: 0.6; }
        #crt-overlay {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 10000;
            background:
                repeating-linear-gradient(to bottom, transparent 0 3px, rgba(10, 0, 0, 0.28) 3px 4px),
                radial-gradient(ellipse at center, transparent 55%, rgba(8, 2, 2, 0.6) 100%);
            animation: crt-flicker 90ms steps(2) infinite;
        }
    `
    document.head.appendChild(style)

    const crt = document.createElement('div')
    crt.id = 'crt-overlay'
    document.body.appendChild(crt)
}

export function showStartScreen(engine) {
    injectChrome()
    return new Promise(resolve => {
        const overlay = document.createElement('div')
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'gap: 40px',
            'background: #020402',
            'z-index: 9999',
        ].join(';')

        const feed = document.createElement('div')
        feed.textContent = 'OKKO VC-88 // SUBLVL-B SECURITY FEED // TAPE 4 OF 4'
        feed.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 10px',
            'color: #8f6d6d',
            'letter-spacing: 2px',
        ].join(';')

        const title = document.createElement('div')
        title.textContent = 'DEAD CORRIDOR'
        title.className = 'glitch-text'
        title.dataset.text = 'DEAD CORRIDOR'
        title.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 48px',
            'color: #cc2200',
            'text-shadow: 4px 4px 0 black',
            'letter-spacing: 4px',
            'text-align: center',
        ].join(';')

        const controls = document.createElement('div')
        controls.innerHTML = 'WASD MOVE &nbsp;/&nbsp; MOUSE OR ARROWS LOOK<br><br>CLICK OR SPACE SHOOT &nbsp;/&nbsp; R RELOAD<br><br>FIND THE KEY - REACH THE EXIT'
        controls.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 11px',
            'color: #c87d7d',
            'text-shadow: 0 0 6px rgba(200,125,125,0.5)',
            'line-height: 1.6',
            'text-align: center',
        ].join(';')

        const btn = document.createElement('button')
        btn.textContent = '> INSERT TAPE <'
        btn.style.cssText = [
            'font-family: "Press Start 2P", monospace',
            'font-size: 20px',
            'color: #020402',
            'background: #cc2200',
            'border: none',
            'padding: 20px 48px',
            'cursor: pointer',
            'box-shadow: 0 0 24px rgba(204,34,0,0.6)',
        ].join(';')
        btn.onclick = () => {
            // real user gesture: unlock audio and grab the mouse right here
            Sfx.init()
            engine?.canvas?.requestPointerLock()
            overlay.remove()
            resolve()
        }

        overlay.appendChild(feed)
        overlay.appendChild(title)
        overlay.appendChild(controls)
        overlay.appendChild(btn)
        document.body.appendChild(overlay)
    })
}

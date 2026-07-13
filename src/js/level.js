// Single source of truth for the map grid.
// . = floor, # = wall, P = player spawn, Z = zombie spawn, A = ammo pickup, K = key, E = exit

export const TILE = 64
export const COLS = 20
export const ROWS = 11

export const MAP = [
    '####################',
    '#P....#.Z..Z..#.A.E#',
    '#.##..#.###.#.#.##.#',
    '#.#..Z..A.#.#..Z.#.#',
    '#.#.####..#.####.#.#',
    '#.ZA......Z....Z...#',
    '#.#.####Z.#.####.#.#',
    '#Z#.A..Z..#.#..Z.#.#',
    '#.##..#.###.#.#.##.#',
    '#..Z..#.Z..Z..#.A.K#',
    '####################',
]

export const Level = {
    cols: COLS,
    rows: ROWS,
    isWall(cx, cy) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true
        return MAP[cy][cx] === '#'
    },
    // line of sight between two points in tile units (for zombie aggro / hit checks)
    hasLineOfSight(x0, y0, x1, y1) {
        const dx = x1 - x0
        const dy = y1 - y0
        const dist = Math.hypot(dx, dy)
        if (dist < 0.001) return true
        const steps = Math.ceil(dist * 8)
        for (let i = 1; i < steps; i++) {
            const t = i / steps
            if (this.isWall(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t))) return false
        }
        return true
    },
}

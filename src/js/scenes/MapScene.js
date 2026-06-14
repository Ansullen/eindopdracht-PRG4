import { Scene, TileMap, Rectangle, Color, vec } from 'excalibur'
import { Player } from '../actors/Player.js'
import { Zombie } from '../actors/Zombie.js'
import { AmmoPickup } from '../actors/AmmoPickup.js'
import { Key } from '../actors/Key.js'
import { Exit } from '../actors/Exit.js'

const TILE = 64
const COLS = 20
const ROWS = 11

// . = floor, # = wall, P = player spawn, Z = zombie spawn, A = ammo pickup, K = key, E = exit
const MAP = [
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

const wallGraphic = new Rectangle({ width: TILE, height: TILE, color: Color.fromHex('#1a0000') })
const floorGraphic = new Rectangle({ width: TILE, height: TILE, color: Color.fromHex('#2a2a2a') })

export class MapScene extends Scene {
    onInitialize(engine) {
        const tilemap = new TileMap({
            pos: vec(0, 0),
            tileWidth: TILE,
            tileHeight: TILE,
            columns: COLS,
            rows: ROWS,
        })

        let playerSpawn = vec(TILE * 1.5, TILE * 1.5)
        const zombieSpawns = []
        const ammoSpawns = []
        const keySpawns = []
        const exitSpawns = []

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const char = MAP[row][col]
                const tile = tilemap.getTile(col, row)
                tile.solid = char === '#'
                tile.addGraphic(char === '#' ? wallGraphic : floorGraphic)
                const pos = vec(col * TILE + TILE / 2, row * TILE + TILE / 2)
                if (char === 'P') playerSpawn = pos
                if (char === 'Z') zombieSpawns.push(pos)
                if (char === 'A') ammoSpawns.push(pos)
                if (char === 'K') keySpawns.push(pos)
                if (char === 'E') exitSpawns.push(pos)
            }
        }

        this.tilemap = tilemap
        this.add(tilemap)

        const player = new Player(playerSpawn.x, playerSpawn.y)
        this.add(player)

        for (const pos of zombieSpawns) {
            this.add(new Zombie(pos.x, pos.y, player))
        }

        for (const pos of ammoSpawns) {
            this.add(new AmmoPickup(pos.x, pos.y))
        }

        for (const pos of keySpawns) {
            this.add(new Key(pos.x, pos.y))
        }

        for (const pos of exitSpawns) {
            this.add(new Exit(pos.x, pos.y, player))
        }

        this.camera.strategy.lockToActor(player)
        this.camera.zoom = 2
    }
}

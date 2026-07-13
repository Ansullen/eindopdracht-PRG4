import { Scene, TileMap, vec } from 'excalibur'
import { Player } from '../actors/Player.js'
import { Zombie } from '../actors/Zombie.js'
import { AmmoPickup } from '../actors/AmmoPickup.js'
import { Key } from '../actors/Key.js'
import { Exit } from '../actors/Exit.js'
import { RaycastView } from '../render/view.js'
import { WorldFX } from '../render/worldfx.js'
import { MAP, TILE, COLS, ROWS } from '../level.js'

export class MapScene extends Scene {
    onInitialize(engine) {
        WorldFX.reset()

        // solid tiles drive physics only — the world is drawn by the RaycastView
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
                tilemap.getTile(col, row).solid = char === '#'
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

        this.add(new RaycastView(player))
    }
}

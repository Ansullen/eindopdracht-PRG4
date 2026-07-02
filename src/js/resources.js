import { ImageSource } from 'excalibur'
import { DeadCorridorLoader } from './loader.js'

export const Res = {
    player:     new ImageSource('/assets/player.png'),
    zombie:     new ImageSource('/assets/zombie.png'),
    bullet:     new ImageSource('/assets/bullet.png'),
    ammo:       new ImageSource('/assets/ammo.png'),
    key:        new ImageSource('/assets/key.png'),
    exitLocked: new ImageSource('/assets/exit-locked.png'),
    exitOpen:   new ImageSource('/assets/exit-open.png'),
    wall:       new ImageSource('/assets/wall.png'),
    floor:      new ImageSource('/assets/floor.png'),
}

const ResourceLoader = new DeadCorridorLoader()
for (const img of Object.values(Res)) ResourceLoader.addResource(img)
export { ResourceLoader }

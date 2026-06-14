import { ImageSource, Sound, Resource } from 'excalibur'
import { DeadCorridorLoader } from './loader.js'

// voeg hier jouw eigen resources toe
const Resources = {
    Background: new ImageSource('images/background.png')
}




const ResourceLoader = new DeadCorridorLoader()
for (let res of Object.values(Resources)) {
    ResourceLoader.addResource(res)
}

export { Resources, ResourceLoader }
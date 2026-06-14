import '../css/style.css'
import { Engine, DisplayMode, Color } from "excalibur"
import { ResourceLoader } from './resources.js'
import { MapScene } from './scenes/MapScene.js'
import { showStartScreen } from './ui/startScreen.js'

export class Game extends Engine {

    constructor() {
        super({
            width: 1280,
            height: 704,
            maxFps: 60,
            displayMode: DisplayMode.FitScreen,
            backgroundColor: Color.fromHex('#050d05'),
         })

        this.addScene('map', new MapScene())
        this.start(ResourceLoader).then(() => showStartScreen()).then(() => this.goToScene('map'))
    }
}

new Game()

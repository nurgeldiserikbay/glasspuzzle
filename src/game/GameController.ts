import { IGameControllerOpt } from './interfaces'
import Scene from './Scene'
import Game from './Game'

class GameController {
	private _scene: Scene
	private _game: Game

	constructor({ canvas, option }: IGameControllerOpt) {
		this._scene = new Scene({ canvas })
		this._game = new Game({
			scene: this._scene,
			option,
		})
	}

	async init() {
		await this._scene.init()
		await this._game.init()
	}

	async start({
		img,
		level,
		width,
		height,
	}: {
		img: string
		level: number
		width: number
		height: number
	}) {
		this._scene.start()
		this._game.start({ img, level, width, height })
	}

	restart({
		img,
		level,
		width,
		height,
	}: {
		img: string
		level: number
		width: number
		height: number
	}) {
		this._game.start({ img, level, width, height })
	}
}

export default GameController

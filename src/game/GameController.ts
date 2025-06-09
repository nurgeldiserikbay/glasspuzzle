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
		difficulty,
	}: {
		img: string
		level: number
		width: number
		height: number
		difficulty: 'easy' | 'medium' | 'hard'
	}) {
		this._scene.start()
		this._game.start({ img, level, width, height, difficulty })
	}

	restart({
		img,
		level,
		width,
		height,
		difficulty,
	}: {
		img: string
		level: number
		width: number
		height: number
		difficulty: 'easy' | 'medium' | 'hard'
	}) {
		this._game.start({ img, level, width, height, difficulty })
	}

	destroy() {
		this._scene.destroy()
		this._game.destroy()
	}
}

export default GameController

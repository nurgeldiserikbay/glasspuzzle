import { IGameControllerOpt, Difficulty } from './interfaces'
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
		this._game.init()
		this._scene.start()
	}

	start({ img, difficulty }: { img: string; difficulty: Difficulty }) {
		return this._game.start({ img, difficulty })
	}

	peek(on: boolean) {
		this._game.peek(on)
	}

	debug() {
		return this._game.debug()
	}

	destroy() {
		this._game.destroy()
		this._scene.destroy()
	}
}

export default GameController

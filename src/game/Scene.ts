import * as PIXI from 'pixi.js'

import { ISceneOpt, ITicker } from './interfaces'

class Scene {
	canvas: HTMLCanvasElement
	app: PIXI.Application
	container: PIXI.Container
	private _updates: Map<string, (ticker: ITicker) => void>

	constructor({ canvas }: ISceneOpt) {
		this.canvas = canvas
		this.app = new PIXI.Application()
		this.container = new PIXI.Container()
		this._updates = new Map()

		this.app.stage.addChild(this.container)
	}

	async init() {
		this.canvas.width = this.canvas.clientWidth
		this.canvas.height = this.canvas.clientHeight

		await this.app.init({
			resolution: window.devicePixelRatio || 1,
			backgroundAlpha: 0,
			canvas: this.canvas,
			width: this.canvas.width,
			height: this.canvas.height,
			autoDensity: true,
			antialias: true,
		})
	}

	addElem(graphics: any) {
		if (graphics) this.container.addChild(graphics)
	}

	removeElem(graphics: any) {
		if (graphics) this.container.removeChild(graphics)
	}

	addUpdate(name: string, func: (ticker: ITicker) => void) {
		this._updates.set(name, func)
	}

	removeUpdate(name: string) {
		this._updates.delete(name)
	}

	render() {
		this.app.ticker.add((ticker: ITicker) => {
			for (let update of this._updates.values()) {
				update({
					deltaMS: ticker.deltaMS,
					lastTime: ticker.lastTime,
				})
			}
		})
	}

	start() {
		this.render()
	}

	destroy() {
		this.app.destroy(true)
		this.container.destroy({ children: true })
		this._updates.clear()
	}
}

export default Scene

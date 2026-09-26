import * as PIXI from 'pixi.js'

import { ISceneOpt, ITicker } from './interfaces'

class Scene {
	canvas: HTMLCanvasElement
	app: PIXI.Application
	container: PIXI.Container
	private _updates: Map<string, (ticker: ITicker) => void>
	private _resize: (() => void)[]
	private _observer?: ResizeObserver

	constructor({ canvas }: ISceneOpt) {
		this.canvas = canvas
		this.app = new PIXI.Application()
		this.container = new PIXI.Container()
		this._updates = new Map()
		this._resize = []

		this.app.stage.addChild(this.container)
	}

	/** Холст занимает место своего родителя — размер берём оттуда. */
	private get host() {
		return this.canvas.parentElement || this.canvas
	}

	async init() {
		await this.app.init({
			resolution: window.devicePixelRatio || 1,
			backgroundAlpha: 0,
			canvas: this.canvas,
			width: this.host.clientWidth,
			height: this.host.clientHeight,
			autoDensity: true,
			antialias: true,
		})
		this.fitCss()

		// Высота поля меняется после старта: рекламная полоса узнаёт настоящую
		// высоту баннера позже, чем монтируется страница. Окно при этом не
		// ресайзится, поэтому следим за самим контейнером.
		let last = `${this.host.clientWidth}x${this.host.clientHeight}`
		this._observer = new ResizeObserver(() => {
			const w = this.host.clientWidth
			const h = this.host.clientHeight
			if (!w || !h || `${w}x${h}` === last) return
			last = `${w}x${h}`
			this.app.renderer.resize(w, h)
			this.fitCss()
			this._resize.forEach((fn) => fn())
		})
		this._observer.observe(this.host)
	}

	/** autoDensity прибивает размер холста в пикселях — возвращаем его родителю. */
	private fitCss() {
		this.canvas.style.width = '100%'
		this.canvas.style.height = '100%'
	}

	onResize(fn: () => void) {
		this._resize.push(fn)
	}

	addUpdate(name: string, func: (ticker: ITicker) => void) {
		this._updates.set(name, func)
	}

	removeUpdate(name: string) {
		this._updates.delete(name)
	}

	start() {
		this.app.ticker.add((ticker: PIXI.Ticker) => {
			for (const update of this._updates.values()) {
				update({
					deltaMS: ticker.deltaMS,
					lastTime: ticker.lastTime,
				})
			}
		})
	}

	destroy() {
		this._observer?.disconnect()
		this._resize = []
		this._updates.clear()
		this.app.destroy(false, { children: true })
	}
}

export default Scene

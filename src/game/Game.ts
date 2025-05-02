import { Assets, BlurFilter, Graphics, Sprite, Texture } from 'pixi.js'
import { Delaunay } from 'd3-delaunay'

import Scene from './Scene'
import { IPoint, IAssetsSrc, IGameOpt, IControlOpt } from './interfaces'
import { Shard } from './Shard'
import { lerpPoint } from './helpers'
import { Grid } from './Grid'

class Game {
	_scene: Scene
	img?: string
	timerId: ReturnType<typeof setTimeout> | null
	timer: number

	gardenGrid: Grid
	level: number
	shards: Shard[]
	maxDivisions: number
	placedShards: number
	option: IControlOpt
	fullImg?: Sprite
	backPlace?: Graphics
	loadedAssets: { [key: string]: Texture }
	shift: {
		left: number
		top: number
	}
	viewBtn?: Sprite

	constructor({ scene, option }: IGameOpt) {
		this._scene = scene
		this.option = option
		this.loadedAssets = {}

		this.timerId = null
		this.timer = 2000
		this.shift = {
			left: 0,
			top: 0,
		}

		this.gardenGrid = new Grid(this._scene, this)
		this.level = 0
		this.shards = []
		this.maxDivisions = 3
		this.placedShards = 0
	}

	async init() {
		this._scene.addUpdate('background', () => {})
		this.gardenGrid.init()
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
		if (this.timerId) clearTimeout(this.timerId)
		this.timerId = null
		this.level = level
		this.placedShards = 0
		this.img = img

		const assets = this.getLevelAssets(img)
		this.loadedAssets = await this.preload(assets)
		this.viewButton()
		this.setWholeImage(this.loadedAssets[this.img], width, height)
	}

	viewButton() {
		if (this.viewBtn) return
		this.viewBtn = new Sprite(this.loadedAssets.show)
		this.viewBtn.anchor.set(0.5)
		this.viewBtn.width = this._scene.app.screen.width * 0.2
		this.viewBtn.height = this._scene.app.screen.width * 0.2
		this.viewBtn.interactive = true
		this.viewBtn.on('pointerdown', () => this.toggleImage(true))
		this.viewBtn.on('pointerup', () => this.toggleImage(false))
		this.viewBtn.on('pointerleave', () => this.toggleImage(false))
		this.viewBtn.y = this._scene.app.screen.height * 0.8
		this.viewBtn.x = this._scene.app.screen.width / 2
		this.viewBtn.zIndex = 50
		this._scene.addElem(this.viewBtn)
	}

	toggleImage(value: boolean) {
		if (!this.fullImg) return
		if (value) {
			this.fullImg.alpha = 1
			this.fullImg.zIndex = 500
		} else {
			this.fullImg.alpha = 0
			this.fullImg.zIndex = 0
		}
	}

	calcPlacedShards() {
		this.placedShards++
		console.log('placedShards', this.placedShards)
		if (this.placedShards === this.shards.length) {
			setTimeout(() => {
				console.log('placedShards', this.placedShards)
				this.option.endGame()
				this.gardenGrid.onMouseUp()
			}, 500)
		}
	}

	setWholeImage(image: Texture, width: number, height: number) {
		this.shards.forEach((shard) => {
			this.gardenGrid.grid.removeChild(shard.container)
		})
		if (this.fullImg) this.gardenGrid.grid.removeChild(this.fullImg)
		this.shards = []
		this.fullImg = new Sprite()
		this.fullImg.texture = image
		this.fullImg.interactive = false
		this.fullImg.width = width
		this.fullImg.height = height
		this.gardenGrid.setWidth(width, height)
		this.fullImg.x = (this.gardenGrid.grid.width - this.fullImg.width) / 2
		this.fullImg.y = (this.gardenGrid.grid.height - this.fullImg.height) / 2
		this.gardenGrid.grid.addChild(this.fullImg)

		this.shift = {
			left: (this.gardenGrid.grid.width - this.fullImg.width) / 2,
			top: (this.gardenGrid.grid.height - this.fullImg.height) / 2,
		}
		this.setBackPlace(this.fullImg)
		this._scene.addElem(this.gardenGrid.grid)

		const coord = {
			left: 0,
			right: this.fullImg.width,
			top: 0,
			bottom: this.fullImg.height,
		}

		setTimeout(() => {
			if (this.fullImg) this.fullImg.alpha = 0
			this.breakImage(image, coord)
			console.log('shards length', this.shards.length)
		}, 1000)
	}

	setBackPlace(fullImg: Sprite) {
		if (this.backPlace) this.gardenGrid.grid.addChild(this.backPlace)
		this.backPlace = new Graphics()
		this.backPlace.roundRect(
			this.shift.left,
			this.shift.top,
			fullImg.width,
			fullImg.height
		)
		this.backPlace.fill(0xd096d6)
		this.backPlace.alpha = 0.3
		this.backPlace.stroke(4)
		this.backPlace.setStrokeStyle({
			color: 0xd8ced9,
			alpha: 0.6,
		})
		this.backPlace.roundRect(
			this.shift.left,
			this.shift.top,
			fullImg.width,
			fullImg.height
		)
		const blurFilter = new BlurFilter({ strength: 5.6 })
		this.backPlace.filters = [blurFilter]
		this.gardenGrid.grid.addChild(this.backPlace)
	}

	breakImage(
		texture: Texture,
		coord: { left: number; right: number; top: number; bottom: number },
		count = { row: 4, col: 5 },
		offset = 40
	) {
		const width = texture.width || this.fullImg?.width || 400
		const height = texture.height || this.fullImg?.height || 400
		const minSizeCol = width / count.col
		const minSizeRow = height / count.row

		const points = []

		for (let c = 0; c < count.col; c++) {
			for (let r = 0; r < count.row; r++) {
				let x =
					coord.left +
					c * minSizeCol +
					Math.random() * (minSizeCol - offset * 2) +
					offset
				let y =
					coord.top +
					r * minSizeRow +
					Math.random() * (minSizeRow - offset * 2) +
					offset

				points.push({ x, y })
			}
		}

		points.push({ x: 0, y: 0 })
		points.push({ x: width, y: 0 })
		points.push({ x: width, y: height })
		points.push({ x: 0, y: height })

		const delaunay = Delaunay.from(points.map((p) => [p.x, p.y]))
		const triangles = delaunay.triangles

		for (let i = 0; i < triangles.length; i += 3) {
			let a = points[triangles[i]]
			let b = points[triangles[i + 1]]
			let c = points[triangles[i + 2]]

			this.shards.push(new Shard([a, b, c], texture, this))
		}
	}

	divide(
		a: IPoint,
		b: IPoint,
		c: IPoint,
		d: IPoint,
		i: number = 0,
		texture: Texture
	) {
		if (i < this.maxDivisions) {
			const range = 0.35 + Math.random() * 0.3
			let p0 = lerpPoint(a, b, range)
			let p1 = lerpPoint(c, d, range)
			let p2 = lerpPoint(a, d, range)
			let p3 = lerpPoint(b, c, range)

			if (i < 2) {
				this.divide(p0, p1, p3, p2, i + 1, texture)
			} else {
				this.shards.push(new Shard([a, p0, p2, d], texture, this))
				this.shards.push(new Shard([p0, b, c, p3], texture, this))
				this.shards.push(new Shard([p2, p3, c, d], texture, this))
			}
		} else {
			this.shards.push(new Shard([a, b, c, d], texture, this))
		}
	}

	getLevelAssets(img: string) {
		return [
			{
				alias: img,
				loader: 'loadTextures',
				crossOrigin: 'anonym',
				src: img,
			},
			{
				alias: 'arrow',
				loader: 'loadTextures',
				crossOrigin: 'anonym',
				src: '/img/arrow.png',
			},
			{
				alias: 'show',
				loader: 'loadTextures',
				crossOrigin: 'anonym',
				src: '/img/show.png',
			},
		]
	}

	async preload(assets: IAssetsSrc[]) {
		return await Assets.load(assets)
	}
}

export default Game

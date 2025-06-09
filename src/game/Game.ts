import { Assets, Graphics, Sprite, Texture } from 'pixi.js'
import { Delaunay } from 'd3-delaunay'

import Scene from './Scene'
import { IPoint, IAssetsSrc, IGameOpt, IControlOpt } from './interfaces'
import { Shard } from './Shard'
import {
	checkApproximatelyPoints,
	checkEdges,
	getTranslatedAndRotatedPoints,
	lerpPoint,
} from './helpers'
import { Grid } from './Grid'
import { rotations } from './helpers'

const DIFFICULTY_AREA = {
	easy: 80000,
	medium: 40000,
	hard: 20000,
}

class Game {
	_scene: Scene
	img?: string
	timerId: ReturnType<typeof setTimeout> | null
	timer: number
	gardenGrid: Grid
	level: number
	shards: Shard[]
	maxDivisions: number
	option: IControlOpt
	fullImg?: Sprite
	backPlace?: Graphics
	loadedAssets: { [key: string]: Texture }
	shift: {
		left: number
		top: number
	}
	viewBtn?: Sprite
	difficulty: 'easy' | 'medium' | 'hard'
	breakTimerId?: ReturnType<typeof setTimeout> | null

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
		this.difficulty = 'easy'
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
		difficulty,
	}: {
		img: string
		level: number
		width: number
		height: number
		difficulty: 'easy' | 'medium' | 'hard'
	}) {
		if (this.timerId) clearTimeout(this.timerId)
		this.timerId = null
		this.level = level
		this.img = img
		this.difficulty = difficulty

		const assets = this.getLevelAssets(img)
		this.loadedAssets = await this.preload(assets)
		this.viewButton()
		this.setWholeImage(this.loadedAssets[this.img], width, height)
	}

	viewButton() {
		if (this.viewBtn) {
			this._scene.removeElem(this.viewBtn)
		}
		this.viewBtn = new Sprite(this.loadedAssets.show)
		this.viewBtn.anchor.set(0.5)
		this.viewBtn.width = this._scene.app.screen.width * 0.15
		this.viewBtn.height = this._scene.app.screen.width * 0.15
		this.viewBtn.interactive = true
		this.viewBtn.on('pointerdown', () => this.toggleImage(true))
		this.viewBtn.on('pointerup', () => this.toggleImage(false))
		this.viewBtn.on('pointerleave', () => this.toggleImage(false))
		this.viewBtn.y = this._scene.app.screen.height * 0.85
		this.viewBtn.x = this._scene.app.screen.width * 0.85
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

	checkEndGame() {
		if (this.shards.length === 1) {
			setTimeout(() => {
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
		this.gardenGrid.setWidth()
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

		this.breakTimerId = setTimeout(() => {
			if (this.fullImg) this.fullImg.alpha = 0
			this.breakImage(image, coord)
		}, 1000)
	}

	setBackPlace(fullImg: Sprite) {
		if (this.backPlace) return
		this.backPlace = new Graphics()
		this.backPlace.roundRect(
			this.shift.left,
			this.shift.top,
			fullImg.width,
			fullImg.height
		)
		this.backPlace.fill(0xd792de)
		this.backPlace.alpha = 0.7
		this.backPlace.stroke(4)
		this.backPlace.setStrokeStyle({
			color: 0xd792de,
			alpha: 0.6,
		})
		this.backPlace.roundRect(
			this.shift.left,
			this.shift.top,
			fullImg.width,
			fullImg.height
		)
	}

	getNeighborsEdges(shard: Shard) {
		const rotateStep = rotations[shard.curRotateStep]
		const rotatedPoints = getTranslatedAndRotatedPoints(
			shard.points.map((p) => ({
				x: p.x * shard.scale,
				y: p.y * shard.scale,
			})),
			shard.container,
			{
				x: shard.correctX * shard.scale,
				y: shard.correctY * shard.scale,
			},
			rotateStep
		)

		return this.shards.filter((s) => {
			if (s === shard || shard.curRotateStep !== s.curRotateStep) return false

			const sRotatedPoints = getTranslatedAndRotatedPoints(
				s.points.map((p) => ({
					x: p.x * s.scale,
					y: p.y * s.scale,
				})),
				s.container,
				{
					x: s.correctX * s.scale,
					y: s.correctY * s.scale,
				},
				rotateStep
			)

			const matchingPoints = sRotatedPoints.filter((p) =>
				rotatedPoints.some((rp) => checkApproximatelyPoints(rp, p, 0.1))
			)

			return matchingPoints.length >= 2
		})
	}

	checkPlacement(shard: Shard) {
		const neighbors = this.getNeighborsEdges(shard)

		if (neighbors.length === 0) return

		const allShards = [shard, ...neighbors]

		// Get all points from all shards
		const mergedPoints: IPoint[] = []
		const allEdgeArrays = allShards.map((s) => [...s.edges]) // Create copy of edges

		// Process edges until no more matches can be found
		while (allEdgeArrays.some((edges) => edges.length > 0)) {
			let foundMatch = false

			// Find first array with edges
			const currentArrayIndex = allEdgeArrays.findIndex(
				(edges) => edges.length > 0
			)
			if (currentArrayIndex === -1) break

			const currentEdge = allEdgeArrays[currentArrayIndex][0]

			// Look for matching edge in other arrays
			for (let i = 0; i < allEdgeArrays.length; i++) {
				if (i === currentArrayIndex || !allEdgeArrays[i].length) continue

				const matchingEdgeIndex = allEdgeArrays[i].findIndex((edge) =>
					checkEdges(currentEdge, edge)
				)

				if (matchingEdgeIndex !== -1) {
					// Remove both matching edges
					allEdgeArrays[currentArrayIndex].splice(0, 1)
					allEdgeArrays[i].splice(matchingEdgeIndex, 1)
					foundMatch = true
					break
				}
			}

			if (!foundMatch) {
				// If no match found, add point and remove edge
				mergedPoints.push(currentEdge[0])
				allEdgeArrays[currentArrayIndex].splice(0, 1)
			}
		}

		// Add any remaining points
		allEdgeArrays.forEach((edges) => {
			edges.forEach((edge) => {
				mergedPoints.push(edge[0])
			})
		})

		// Create new merged shard
		const newShard = new Shard(
			clockWithSort(mergedPoints), // Sort points clockwise
			shard.sprite.texture,
			this
		)

		// Copy properties from original shard
		newShard.curRotateStep = shard.curRotateStep
		newShard.container.x = shard.container.x
		newShard.container.y = shard.container.y
		newShard.container.zIndex = shard.container.zIndex
		newShard.sprite.rotation = shard.sprite.rotation
		newShard.foreground.rotation = shard.foreground.rotation

		// Clean up old shards
		shard.container.destroy()
		neighbors.forEach((n) => n.container.destroy())

		this.shards = this.shards.filter(
			(s) => !neighbors.includes(s) && s !== shard
		)

		this.shards.push(newShard)
		this.checkEndGame()
	}

	breakImage(
		texture: Texture,
		coord: { left: number; right: number; top: number; bottom: number }
	) {
		const width = texture.width || this.fullImg?.width || 400
		const height = texture.height || this.fullImg?.height || 400

		const area = width * height
		const targetPieceArea = DIFFICULTY_AREA[this.difficulty]
		const totalPieces = Math.round(area / targetPieceArea)

		const aspectRatio = width / height
		const count = {
			col: Math.round(Math.sqrt(totalPieces * aspectRatio)),
			row: Math.round(Math.sqrt(totalPieces / aspectRatio)),
		}

		const minSizeCol = width / count.col
		const minSizeRow = height / count.row
		const offset = Math.min(minSizeCol, minSizeRow) * 0.2

		const points = []

		for (let c = 0; c < count.col; c++) {
			for (let r = 0; r < count.row; r++) {
				let x =
					coord.left +
					c * minSizeCol +
					minSizeCol / 2 +
					(Math.random() - 0.5) * (minSizeCol - offset * 2)
				let y =
					coord.top +
					r * minSizeRow +
					minSizeRow / 2 +
					(Math.random() - 0.5) * (minSizeRow - offset * 2)

				points.push({ x, y })
			}
		}

		points.push({ x: 0, y: 0 })
		points.push({ x: width, y: 0 })
		points.push({ x: width, y: height })
		points.push({ x: 0, y: height })

		for (let i = 1; i < count.col; i++) {
			points.push({ x: i * minSizeCol, y: 0 })
			points.push({ x: i * minSizeCol, y: height })
		}
		for (let i = 1; i < count.row; i++) {
			points.push({ x: 0, y: i * minSizeRow })
			points.push({ x: width, y: i * minSizeRow })
		}

		const delaunay = Delaunay.from(points.map((p) => [p.x, p.y]))
		const triangles = delaunay.triangles

		for (let i = 0; i < triangles.length; i += 3) {
			let a = points[triangles[i]]
			let b = points[triangles[i + 1]]
			let c = points[triangles[i + 2]]

			this.shards.push(new Shard([a, b, c], texture, this, true))
		}

		this.shards.forEach((shard) => {
			shard.placeRandomly()
		})
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

	destroy() {
		if (this.viewBtn) this.viewBtn.destroy()
		this.gardenGrid.destroy()
		this.shards.forEach((shard) => shard.destroy())
		this.fullImg?.destroy()
		this.backPlace?.destroy()
		this.timerId && clearTimeout(this.timerId)
		this.breakTimerId && clearTimeout(this.breakTimerId)
	}
}

export default Game

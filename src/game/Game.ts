import { Assets, Graphics, Sprite, Texture } from 'pixi.js'
import { Delaunay } from 'd3-delaunay'

import Scene from './Scene'
import { IPoint, IAssetsSrc, IGameOpt, IControlOpt } from './interfaces'
import { Shard } from './Shard'
import {
	checkApproximatelyPoints,
	checkEdges,
	getCenterOfTriangle,
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

		setTimeout(() => {
			if (this.fullImg) this.fullImg.alpha = 0
			this.breakImage(image, coord)
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
			shard.points,
			shard.container,
			{ x: shard.correctX, y: shard.correctY },
			rotateStep
		)

		return this.shards.filter((s) => {
			if (s === shard || shard.curRotateStep !== s.curRotateStep) return false

			const sRotatedPoints = getTranslatedAndRotatedPoints(
				s.points,
				s.container,
				{ x: s.correctX, y: s.correctY },
				rotateStep
			)

			const matchingPoints = sRotatedPoints.filter((p) =>
				rotatedPoints.some((rp) => checkApproximatelyPoints(rp, p, 10))
			)

			return matchingPoints.length >= 2
		})
	}

	checkPlacement(shard: Shard) {
		const neighbors = this.getNeighborsEdges(shard)

		if (neighbors.length === 0) return

		const mergedPoints: IPoint[] = []
		const stack: {
			arrayIndex: number
			edgeIndex: number
		}[] = []

		// Flatten edges array to work with individual edge arrays
		const allEdgeArrays = [shard.edges, ...neighbors.map((n) => n.edges)]

		let currentArrayIndex = 0
		let currentEdgeIndex = 0
		while (allEdgeArrays.some((edgeArray) => edgeArray.length > 0)) {
			let foundMatch = false

			// Find first non-empty array
			while (
				currentArrayIndex < allEdgeArrays.length &&
				allEdgeArrays[currentArrayIndex].length === 0
			) {
				if (stack.length) {
					const { arrayIndex, edgeIndex } = stack.pop() || {
						arrayIndex: 0,
						edgeIndex: 0,
					}
					currentArrayIndex = arrayIndex
					currentEdgeIndex = edgeIndex
				} else {
					currentArrayIndex++
				}
			}

			if (currentArrayIndex >= allEdgeArrays.length) break

			const currentEdge = allEdgeArrays[currentArrayIndex][currentEdgeIndex]

			// Look for matching edge in other arrays
			for (let i = 0; i < allEdgeArrays.length; i++) {
				if (i === currentArrayIndex || !allEdgeArrays[i].length) continue

				const matchingEdgeIndex = allEdgeArrays[i].findIndex((edge) =>
					checkEdges(currentEdge, edge)
				)

				if (matchingEdgeIndex !== -1) {
					// Remove both matching edges
					allEdgeArrays[currentArrayIndex].splice(currentEdgeIndex, 1)
					allEdgeArrays[i].splice(matchingEdgeIndex, 1)

					if (allEdgeArrays[currentArrayIndex].length) {
						stack.push({
							arrayIndex: currentArrayIndex,
							edgeIndex: allEdgeArrays[currentArrayIndex][currentEdgeIndex]
								? currentEdgeIndex
								: 0,
						})
					}

					// Continue from the array where we found the match
					currentArrayIndex = i
					currentEdgeIndex = matchingEdgeIndex
					if (
						allEdgeArrays[currentArrayIndex].length &&
						!allEdgeArrays[currentArrayIndex][currentEdgeIndex]
					) {
						currentEdgeIndex = 0
					}
					foundMatch = true
					break
				}
			}

			if (!foundMatch) {
				// If no match found, add first point and remove edge
				mergedPoints.push(currentEdge[0])
				allEdgeArrays[currentArrayIndex].splice(currentEdgeIndex, 1)

				if (
					allEdgeArrays[currentArrayIndex].length &&
					!allEdgeArrays[currentArrayIndex][currentEdgeIndex]
				) {
					currentEdgeIndex = 0
				}
			}
		}

		const newShard = new Shard(mergedPoints, shard.sprite.texture, this)
		const center = getCenterOfTriangle([
			...neighbors.map((n) => n.container),
			shard.container,
		])
		newShard.container.x = center.x
		newShard.container.y = center.y
		newShard.container.zIndex = shard.container.zIndex
		newShard.curRotateStep = shard.curRotateStep
		newShard.sprite.rotation = shard.sprite.rotation
		newShard.foreground.rotation = shard.foreground.rotation

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
}

export default Game

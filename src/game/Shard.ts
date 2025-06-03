import * as PIXI from 'pixi.js'

import { IPoint } from './interfaces'
import Game from './Game'
import {
	clockWithSort,
	getCenterOfTriangle,
	getEdges,
	rotations,
} from './helpers'

export class Shard {
	id: number
	game: Game
	scale: number
	correctX: number
	correctY: number
	container: PIXI.Container
	sprite: PIXI.Sprite
	curRotateStep: number
	moved: boolean
	foreground: PIXI.Graphics
	points: IPoint[]
	edges: [IPoint, IPoint][]
	startPos: {
		x: number
		y: number
	}
	offset?: {
		x: number
		y: number
	}

	constructor(
		points: IPoint[],
		texture: PIXI.Texture,
		game: Game,
		sort = false
	) {
		this.id = Math.random()
		this.game = game
		this.scale = (this.game.fullImg?.width || 640) / texture.width
		const [sortedPoints, edges] = this.setPoints(points, sort)
		this.points = sortedPoints
		this.edges = edges
		const center = getCenterOfTriangle(sortedPoints)
		this.correctX = center.x
		this.correctY = center.y
		this.container = new PIXI.Container()
		this.container.interactive = true
		this.container.eventMode = 'static'
		this.container.on('pointerdown', this.onMouseDown.bind(this))
		// this.container.scale.set(this.scale)
		this.sprite = new PIXI.Sprite(texture)
		this.sprite.pivot.set(this.correctX, this.correctY)
		this.sprite.x = this.correctX
		this.sprite.y = this.correctY
		this.container.addChild(this.sprite)
		this.curRotateStep = 0
		this.moved = false
		this.foreground = new PIXI.Graphics()
		this.foreground.pivot.set(this.correctX, this.correctY)
		this.foreground.x = this.correctX
		this.foreground.y = this.correctY
		this.foreground.zIndex = 5
		this.container.addChild(this.foreground)
		this.startPos = {
			x: this.container.x + this.game.shift.left,
			y: this.container.y + this.game.shift.top,
		}
		this.createMask(points)
		this.game.gardenGrid.grid.addChild(this.container)
	}

	setPoints(points: IPoint[], sort = false): [IPoint[], [IPoint, IPoint][]] {
		const sortedPoints = sort ? clockWithSort(points) : points
		const edges = getEdges(sortedPoints)

		return [sortedPoints, edges]
	}

	// cornerPoints(points: IPoint[]) {
	// 	let allPoints: IPoint[] = points
	// 	const center = {
	// 		x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
	// 		y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length,
	// 	}
	// 	allPoints.sort((a, b) => {
	// 		const angleA = Math.atan2(a.y - center.y, a.x - center.x)
	// 		const angleB = Math.atan2(b.y - center.y, b.x - center.x)
	// 		return angleB - angleA
	// 	})
	// 	const hull: IPoint[] = []
	// 	for (let i = 0; i < allPoints.length; i++) {
	// 		const p1 = allPoints[i]
	// 		const p2 = allPoints[(i + 1) % allPoints.length]
	// 		const p3 = allPoints[(i + 2) % allPoints.length]

	// 		const crossProduct =
	// 			(p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)

	// 		if (crossProduct >= 0) {
	// 			hull.push(p1)
	// 		}
	// 	}
	// 	allPoints = hull
	// 	console.log('allPoints', allPoints)
	// 	return allPoints
	// }

	createMask(points: IPoint[]) {
		const mask = new PIXI.Graphics()
		mask.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			mask.lineTo(points[i].x, points[i].y)
		}
		mask.closePath()
		mask.fill()
		this.sprite.mask = mask
		this.sprite.addChild(mask)

		this.foreground.clear()
		this.foreground.setStrokeStyle({
			width: 4,
			color: 0xffffff,
			alpha: 0.5,
		})
		const gradientFill = new PIXI.FillGradient({
			start: { x: this.correctX - 50, y: this.correctY - 50 },
			end: { x: this.correctX + 50, y: this.correctY + 50 },
			type: 'linear',
			colorStops: [
				{ offset: 0.4, color: 'rgba(255,255,255,0.1)' },
				{ offset: 0.5, color: 'rgba(255,255,255,0.8)' },
				{ offset: 0.6, color: 'rgba(255,255,255,0.1)' },
			],
		})
		this.foreground.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			this.foreground.lineTo(points[i].x, points[i].y)
		}
		this.foreground.closePath()
		this.foreground.stroke()
		this.foreground.fill(gradientFill)
	}

	placeRandomly() {
		const padding = 50
		const maxX =
			this.game.gardenGrid.grid.width - this.sprite.width * this.scale - padding
		const maxY =
			this.game.gardenGrid.grid.height -
			this.sprite.height * this.scale -
			padding
		this.curRotateStep = 2 || Math.floor(Math.random() * rotations.length)

		this.container.x = padding + Math.random() * maxX
		this.container.y = padding + Math.random() * maxY

		this.container.zIndex = 10
		this.sprite.rotation = rotations[this.curRotateStep]
		this.foreground.rotation = rotations[this.curRotateStep]
	}

	onMouseDown(event: PIXI.FederatedPointerEvent) {
		event.propagationImmediatelyStopped = true
		this.sprite.alpha = 0.6
		this.container.zIndex = 100
		this.moved = false
		const mousePos = event.global.clone()
		this.offset = {
			x: mousePos.x - this.container.x,
			y: mousePos.y - this.container.y,
		}
		this.game.gardenGrid.setDragItem(this)
	}

	onMouseUp() {
		this.sprite.alpha = 1
		this.container.zIndex = 10
		if (!this.moved) this.rotate(1)
		this.game.checkPlacement(this)
	}

	rotate(dir: number) {
		if (this.curRotateStep + dir < 0) this.curRotateStep = rotations.length - 1
		else if (this.curRotateStep + dir >= rotations.length)
			this.curRotateStep = 0
		else this.curRotateStep += dir

		this.sprite.rotation = rotations[this.curRotateStep]
		this.foreground.rotation = rotations[this.curRotateStep]
	}

	updateMousePos(event: PIXI.FederatedPointerEvent) {
		if (!this.moved) this.moved = true
		if (!this.offset) return
		const mousePos = event.global.clone()
		this.container.x = mousePos.x - this.offset.x
		this.container.y = mousePos.y - this.offset.y
	}
}

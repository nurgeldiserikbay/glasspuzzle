import { Container, FederatedPointerEvent, Graphics } from 'pixi.js'

import Scene from './Scene'
import { Shard } from './Shard'
import Game from './Game'

export class Grid {
	game: Game
	scene: Scene
	dragging: boolean
	grid: Container
	dragItem: null | Shard
	graphics?: Graphics
	mapBounds: {
		left: number
		right: number
		top: number
		bottom: number
	}
	offset?: {
		x: number
		y: number
	}

	constructor(scene: Scene, game: Game) {
		this.game = game
		this.scene = scene
		this.dragging = false
		this.grid = new Container()
		this.mapBounds = {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
		}
		this.dragItem = null
	}

	init() {
		this.grid.eventMode = 'static'

		this.grid.on('pointerdown', this.onMouseDown.bind(this))
		this.grid.on('pointerup', this.onMouseUp.bind(this))
		this.grid.on('pointermove', this.updateMousePos.bind(this))
	}

	setWidth(width: number, height: number) {
		const gridWidth = Math.max(this.scene.app.screen.width, width) * 2
		const gridHeight = Math.max(this.scene.app.screen.height, height) * 2

		if (this.graphics) {
			this.graphics.width = gridWidth
			this.graphics.height = gridHeight
			this.grid.width = gridWidth
			this.grid.height = gridHeight
		} else {
			this.graphics = new Graphics()
			this.graphics.rect(0, 0, gridWidth, gridHeight)
			this.graphics.fill(0x9b59b6)
			this.graphics.alpha = 0
			this.grid.addChild(this.graphics)
			this.grid.width = gridWidth
			this.grid.height = gridHeight
		}
		this.grid.x = (this.scene.app.screen.width - this.grid.width) / 2
		this.grid.y = (this.scene.app.screen.height - this.grid.height) / 2

		this.setMapBounds()
	}

	setMapBounds() {
		this.mapBounds = {
			left: Math.min(this.scene.app.screen.width - this.grid.width, 0),
			right: Math.max(this.scene.app.screen.width - this.grid.width, 0),
			top: Math.min(this.scene.app.screen.height - this.grid.height, 0),
			bottom: Math.max(this.scene.app.screen.height - this.grid.height, 0),
		}
	}

	setDragItem(dragItem: null | Shard) {
		this.dragItem = dragItem
	}

	onMouseDown(event: FederatedPointerEvent) {
		this.dragging = true
		const mousePos = event.global.clone()
		this.offset = {
			x: mousePos.x - this.grid.x,
			y: mousePos.y - this.grid.y,
		}
	}

	onMouseUp() {
		this.dragging = false
		if (this.dragItem) {
			this.dragItem.onMouseUp()
			this.setDragItem(null)
		}
	}

	updateMousePos(event: FederatedPointerEvent) {
		if (this.dragItem) return this.dragItem.updateMousePos(event)
		if (!this.dragging) return

		const mousePos = event.global.clone()
		if (!this.offset) return
		let x = mousePos.x - this.offset.x
		let y = mousePos.y - this.offset.y

		if (this.mapBounds.left - x > 0 || x - this.mapBounds.right > 0)
			x = this.grid.x
		if (this.mapBounds.top - y > 0 || y - this.mapBounds.bottom > 0)
			y = this.grid.y

		this.grid.x = x
		this.grid.y = y
	}
}

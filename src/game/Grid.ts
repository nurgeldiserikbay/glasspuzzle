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

	constructor(scene: Scene, game: Game) {
		this.game = game
		this.scene = scene
		this.dragging = false
		this.grid = new Container()
		this.dragItem = null
	}

	init() {
		this.grid.eventMode = 'static'

		this.grid.on('pointerdown', this.onMouseDown.bind(this))
		this.grid.on('pointerup', this.onMouseUp.bind(this))
		this.grid.on('pointermove', this.updateMousePos.bind(this))
	}

	setWidth() {
		const gridWidth = this.scene.canvas.clientWidth
		const gridHeight = this.scene.canvas.clientHeight

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
	}

	setDragItem(dragItem: null | Shard) {
		this.dragItem = dragItem
	}

	onMouseDown() {
		this.dragging = true
	}

	onMouseUp() {
		this.dragging = false
		if (this.dragItem) {
			this.dragItem.onMouseUp()
			this.setDragItem(null)
		}
	}

	updateMousePos(event: FederatedPointerEvent) {
		if (this.dragItem) this.dragItem.updateMousePos(event)
	}

	destroy() {
		this.grid.destroy({ children: true })
		this.graphics?.destroy()
	}
}

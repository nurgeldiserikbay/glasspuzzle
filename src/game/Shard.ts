import * as PIXI from 'pixi.js'

import { IPoint } from './interfaces'
import Game from './Game'

const rotations: number[] = [0, Math.PI / 2, Math.PI, Math.PI / -2]

const vertexSrc = `
	attribute vec2 aPosition;
	varying vec2 vUv;
	
	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
		vUv = aPosition * 0.5 + 0.5;
	}
`

const glassFrag = `
	precision mediump float;
	
	varying vec2 vTextureCoord;
	uniform sampler2D uSampler;
	uniform float time;
	
	void main() {
		vec2 uv = vTextureCoord;
		
		// Create distortion
		vec2 distortion = vec2(
			sin(uv.y * 30.0 + time) * 0.01,
			cos(uv.x * 30.0 + time) * 0.01
		);
		
		// Add cracks
		float cracks = 0.0;
		if (mod(uv.x * 50.0, 1.0) > 0.98 || mod(uv.y * 50.0, 1.0) > 0.98) {
			cracks = 0.3;
		}
		
		vec4 color = texture2D(uSampler, uv + distortion);
		color.rgb += cracks;
		color.a = 0.7;
		
		gl_FragColor = color;
	}
`

export class Shard {
	id: number
	game: Game
	correctX: number
	correctY: number
	container: PIXI.Container
	sprite: PIXI.Sprite
	curRotateStep: number
	shardLine?: PIXI.Graphics
	edgeGlow?: PIXI.Graphics
	startPos: {
		x: number
		y: number
	}
	offset?: {
		x: number
		y: number
	}
	scale: number
	moved: boolean

	constructor(points: IPoint[], texture: PIXI.Texture, game: Game) {
		this.id = Math.random()
		this.game = game
		this.correctX = points.reduce((sum, p) => sum + p.x, 0) / points.length
		this.correctY = points.reduce((sum, p) => sum + p.y, 0) / points.length
		this.container = new PIXI.Container()
		this.startPos = {
			x: this.container.x + this.game.shift.left,
			y: this.container.y + this.game.shift.top,
		}
		this.container.interactive = true
		this.container.eventMode = 'static'
		this.container.on('pointerdown', this.onMouseDown.bind(this))
		this.curRotateStep = Math.floor(Math.random() * rotations.length)
		this.scale = (this.game.fullImg?.width || 640) / texture.width
		this.sprite = new PIXI.Sprite()
		this.sprite.texture = texture
		this.sprite.pivot.set(this.correctX, this.correctY)
		this.sprite.x = this.correctX
		this.sprite.y = this.correctY
		this.createMask(points)
		this.createLine(points)
		this.createEdgeGlow(points)
		this.container.addChild(this.sprite)
		this.container.scale.set(this.scale)
		this.moved = false
		this.placeRandomly()
		this.game.gardenGrid.grid.addChild(this.container)
	}

	placeRandomly() {
		let validPosition = false
		while (!validPosition) {
			this.container.x =
				Math.random() * this.game.gardenGrid.grid.width * 0.4 +
				this.game.gardenGrid.grid.width * 0.2
			this.container.y =
				Math.random() * this.game.gardenGrid.grid.height * 0.4 +
				this.game.gardenGrid.grid.height * 0.2
			validPosition = !this.game.shards.some((s) => this.isOverlapping(s))
		}
		this.container.zIndex = 10
		this.sprite.rotation = rotations[this.curRotateStep]
	}

	isOverlapping(otherShard: Shard) {
		if (!otherShard || otherShard === this) return false
		const dx = this.container.x - otherShard.container.x
		const dy = this.container.y - otherShard.container.y
		const distance = Math.sqrt(dx * dx + dy * dy)
		return distance < 50
	}

	createLine(points: IPoint[]) {
		this.shardLine = new PIXI.Graphics()
		this.shardLine.pivot.set(this.correctX, this.correctY)
		this.shardLine.setStrokeStyle({
			color: 0xffffff,
			alpha: 0.2,
			width: 5,
		})
		this.shardLine.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			this.shardLine.lineTo(points[i].x, points[i].y)
		}
		this.shardLine.filters = []
		this.shardLine.x = this.correctX
		this.shardLine.y = this.correctY
		this.shardLine.closePath()
		this.shardLine.stroke()
		this.shardLine.rotation = rotations[this.curRotateStep]
		this.container.addChild(this.shardLine)
	}

	createEdgeGlow(points: IPoint[]) {
		this.edgeGlow = new PIXI.Graphics()
		this.edgeGlow.pivot.set(this.correctX, this.correctY)
		this.edgeGlow.setStrokeStyle({
			color: 0xffffff,
			alpha: 0.7,
			width: 5,
		})
		this.edgeGlow.moveTo(points[0].x, points[0].y)

		for (let i = 1; i < points.length; i++) {
			this.edgeGlow.lineTo(points[i].x, points[i].y)
		}
		const glassFilter = new PIXI.Filter({
			resources: {
				uniforms: new PIXI.UniformGroup({
					time: {
						type: PIXI.UNIFORM_TYPES_VALUES[0],
						value: 0
					},
				})
			}
		})
		glassFilter.gpuProgram = new PIXI.GpuProgram({
			vertex: {
				source: vertexSrc
			},
			fragment: {
				source: glassFrag
			},
		})
		glassFilter.groups = []
		this.edgeGlow.filters = [glassFilter]
		this.game._scene.addUpdate(`shard-${this.id}`, () => {
			glassFilter.resources.uniforms.time += 0.01
		})

		this.edgeGlow.x = this.correctX
		this.edgeGlow.y = this.correctY
		this.edgeGlow.closePath()
		this.edgeGlow.stroke()
		this.edgeGlow.rotation = rotations[this.curRotateStep]
		this.container.addChild(this.edgeGlow)
	}

	createMask(points: IPoint[]) {
		const mask = new PIXI.Graphics()
		mask.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			mask.lineTo(points[i].x, points[i].y)
		}
		mask.closePath()
		mask.fill(0xff0000)
		this.sprite.mask = mask
		this.sprite.addChild(mask)
	}

	onMouseDown(event: PIXI.FederatedPointerEvent) {
		event.propagationImmediatelyStopped = true
		this.sprite.alpha = 0.8
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
		else this.checkPlacement()
	}

	rotate(dir: number) {
		if (this.curRotateStep + dir < 0) this.curRotateStep = rotations.length - 1
		else if (this.curRotateStep + dir >= rotations.length)
			this.curRotateStep = 0
		else this.curRotateStep += dir

		this.sprite.rotation = rotations[this.curRotateStep]
		if (this.shardLine) this.shardLine.rotation = rotations[this.curRotateStep]
		if (this.edgeGlow) this.edgeGlow.rotation = rotations[this.curRotateStep]
	}

	checkPlacement() {
		if (
			Math.abs(this.container.x - this.startPos.x) < 20 &&
			Math.abs(this.container.y - this.startPos.y) < 20 &&
			this.sprite.rotation === 0
		) {
			this.container.x = this.startPos.x
			this.container.y = this.startPos.y
			this.sprite.rotation = 0
			this.container.interactive = false
			this.container.zIndex = 1
			if (this.shardLine) this.shardLine.alpha = 0
			if (this.edgeGlow) this.edgeGlow.alpha = 0
			this.game.calcPlacedShards()
		}
	}

	updateMousePos(event: PIXI.FederatedPointerEvent) {
		if (!this.moved) this.moved = true
		if (!this.offset) return
		const mousePos = event.global.clone()
		this.container.x = mousePos.x - this.offset.x
		this.container.y = mousePos.y - this.offset.y
	}
}

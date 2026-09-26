import { Container, Graphics } from 'pixi.js'
import gsap from 'gsap'

import { Piece } from './Piece'

// Палитра лотка: тёплое светлое дерево и кремовые ящики. Грани жёсткие —
// у каждого ящика кромка и плотная тень снизу, как у плитки.
const PANEL = 0xfff3dc
const PANEL_EDGE = 0xe9c58f
const BOX = 0xfffcf4
const BOX_EDGE = 0xecd6ae
const BOX_DEPTH = 0xe6c79a

const PAD = 12
const GAP = 10
const DEPTH = 5

interface ITrayItem {
	piece: Piece
	box: Container
}

/**
 * Нижний лоток: лента ящиков, в каждом по одному куску, листается пальцем.
 *
 * Ящик и кусок в нём двигаются вместе — кусок сидит внутри контейнера ящика.
 * Когда кусок забирают, его ящик схлопывается, а соседние съезжают на место;
 * когда кусок возвращают, ящик вырастает там, куда его бросили.
 */
export class Tray {
	view: Container
	items: ITrayItem[]
	/** Размер ящика и масштаб куска внутри него — задаются раскладкой игры. */
	box: number
	pieceScale: number
	x: number
	y: number
	width: number
	height: number

	private panel: Graphics
	private strip: Container
	private clip: Graphics
	private scroll: number
	private velocity: number

	constructor() {
		this.view = new Container()
		this.panel = new Graphics()
		this.panel.eventMode = 'static'
		this.strip = new Container()
		this.clip = new Graphics()
		this.strip.mask = this.clip
		this.view.addChild(this.panel, this.strip, this.clip)
		this.items = []
		this.box = 80
		this.pieceScale = 0.2
		this.x = 0
		this.y = 0
		this.width = 0
		this.height = 0
		this.scroll = 0
		this.velocity = 0
	}

	/** Касание пустого места лотка — начало прокрутки. */
	get background() {
		return this.panel
	}

	layout(x: number, y: number, width: number, height: number, pieceScale: number) {
		this.x = x
		this.y = y
		this.width = width
		this.height = height
		// Снизу у панели толщина в DEPTH пикселей — она тоже должна влезть в холст.
		this.box = height - DEPTH - PAD * 2
		this.pieceScale = pieceScale
		this.view.position.set(x, y)

		this.panel
			.clear()
			.roundRect(0, DEPTH, width, height - DEPTH, 22)
			.fill(PANEL_EDGE)
			.roundRect(0, 0, width, height - DEPTH, 22)
			.fill(PANEL)
			.stroke({ width: 2, color: PANEL_EDGE })
		this.clip.clear().roundRect(4, 0, width - 8, height - DEPTH, 18).fill(0xffffff)

		this.items.forEach((item) => this.drawBox(item.box))
		this.items.forEach((item) => item.piece.view.scale.set(pieceScale))
		this.setScroll(this.scroll)
		this.arrange(false)
	}

	private drawBox(box: Container) {
		const g = box.children[0] as Graphics
		const b = this.box
		g.clear()
			.roundRect(-b / 2, -b / 2 + 4, b, b, 14)
			.fill(BOX_DEPTH)
			.roundRect(-b / 2, -b / 2, b, b, 14)
			.fill(BOX)
			.stroke({ width: 2, color: BOX_EDGE })
	}

	private contentWidth(count = this.items.length) {
		return PAD * 2 + count * this.box + Math.max(0, count - 1) * GAP
	}

	/** Центр ящика по номеру, в координатах ленты. */
	private slotX(index: number) {
		// Пока ящики помещаются целиком, лента стоит по центру лотка, а не жмётся влево.
		const lead = Math.max(0, (this.width - this.contentWidth()) / 2)
		return lead + PAD + index * (this.box + GAP) + this.box / 2
	}

	/** Середина лотка по высоте — без толщины снизу. */
	private get midY() {
		return (this.height - DEPTH) / 2
	}

	private maxScroll() {
		return Math.max(0, this.contentWidth() - this.width)
	}

	setScroll(value: number) {
		this.scroll = Math.min(this.maxScroll(), Math.max(0, value))
		this.strip.x = -this.scroll
	}

	get scrollValue() {
		return this.scroll
	}

	/** Инерция после броска пальцем; вызывается каждый кадр. */
	update(deltaMS: number) {
		if (Math.abs(this.velocity) < 0.02) {
			this.velocity = 0
			return
		}
		this.setScroll(this.scroll + this.velocity * deltaMS)
		this.velocity *= Math.pow(0.992, deltaMS)
	}

	fling(velocity: number) {
		this.velocity = velocity
	}

	stop() {
		this.velocity = 0
	}

	/** Расставляет ящики по местам — плавно или сразу. */
	arrange(animate = true) {
		this.items.forEach((item, i) => {
			const x = this.slotX(i)
			const y = this.midY
			gsap.killTweensOf(item.box.position)
			if (animate)
				gsap.to(item.box.position, { x, y, duration: 0.25, ease: 'power2.out' })
			else item.box.position.set(x, y)
		})
	}

	/** Экранная точка, куда встанет кусок с этим номером, если лента не сдвинется. */
	globalSlot(index: number) {
		return {
			x: this.x + this.slotX(index) - this.scroll,
			y: this.y + this.midY,
		}
	}

	/** Номер ящика под экранной координатой x — туда и возвращается брошенный кусок. */
	indexAt(globalX: number) {
		const local = globalX - this.x + this.scroll
		const lead = Math.max(0, (this.width - this.contentWidth(this.items.length + 1)) / 2)
		const i = Math.round((local - lead - PAD - this.box / 2) / (this.box + GAP))
		return Math.min(this.items.length, Math.max(0, i))
	}

	private makeBox() {
		const box = new Container()
		box.addChild(new Graphics())
		this.drawBox(box)
		return box
	}

	/**
	 * Кладёт кусок в новый ящик. Кусок перевешивается в ящик с сохранением
	 * экранного положения и затем «доезжает» в центр — поэтому возврат
	 * выглядит как полёт, а не как телепорт.
	 */
	insert(piece: Piece, index: number, animate = true) {
		const box = this.makeBox()
		const at = Math.min(this.items.length, Math.max(0, index))
		this.items.splice(at, 0, { piece, box })
		this.strip.addChild(box)
		box.position.set(this.slotX(at), this.midY)

		const global = piece.view.getGlobalPosition()
		box.addChild(piece.view)
		const local = box.toLocal(global)
		piece.view.position.set(local.x, local.y)
		piece.place = 'tray'
		piece.setRaised(true)

		if (animate) {
			// Растёт только рамка ящика: кусок уже внутри, и масштаб контейнера
			// схлопнул бы его в точку.
			const frame = box.children[0]
			frame.scale.set(0)
			gsap.to(frame.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' })
			gsap.to(piece.view.position, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' })
			gsap.to(piece.view.scale, {
				x: this.pieceScale,
				y: this.pieceScale,
				duration: 0.3,
				ease: 'power2.out',
			})
		} else {
			piece.view.position.set(0, 0)
			piece.view.scale.set(this.pieceScale)
		}
		this.arrange(animate)
		this.setScroll(this.scroll)
	}

	/**
	 * Достаёт кусок из лотка. Кусок переезжает в parent с тем же экранным
	 * положением, ящик схлопывается. Возвращает номер, где кусок лежал.
	 */
	take(piece: Piece, parent: Container) {
		const at = this.items.findIndex((i) => i.piece === piece)
		if (at === -1) return -1
		const [{ box }] = this.items.splice(at, 1)

		const global = piece.view.getGlobalPosition()
		parent.addChild(piece.view)
		const local = parent.toLocal(global)
		piece.view.position.set(local.x, local.y)

		gsap.to(box.scale, {
			x: 0,
			y: 0,
			duration: 0.18,
			ease: 'power2.in',
			onComplete: () => box.destroy({ children: true }),
		})
		this.arrange(true)
		this.setScroll(this.scroll)
		return at
	}

	/** Все ящики разом: на старте, когда осколки ещё летят в лоток. */
	fill(pieces: Piece[]) {
		pieces.forEach((piece) => {
			const box = this.makeBox()
			box.scale.set(0)
			this.items.push({ piece, box })
			this.strip.addChild(box)
		})
		this.setScroll(0)
		this.arrange(false)
	}

	/** Ящик куска — чтобы стартовая анимация могла положить кусок внутрь. */
	boxOf(piece: Piece) {
		return this.items.find((i) => i.piece === piece)?.box
	}

	clear() {
		this.items.forEach(({ box }) => {
			gsap.killTweensOf([box.scale, box.position, box.children[0].scale])
			box.destroy({ children: true })
		})
		this.items = []
		this.scroll = 0
		this.velocity = 0
		this.strip.x = 0
	}

	destroy() {
		this.clear()
		this.view.destroy({ children: true })
	}
}

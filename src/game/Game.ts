import {
	Assets,
	Container,
	FederatedPointerEvent,
	Graphics,
	Sprite,
	Texture,
} from 'pixi.js'
import gsap from 'gsap'

import Scene from './Scene'
import { IGameOpt, IControlOpt, Difficulty, GamePhase } from './interfaces'
import { Piece } from './Piece'
import { Tray } from './Tray'
import { PIECE_COUNT, shatter } from './shatter'

/**
 * Что меняет сложность, кроме числа кусков. На лёгкой куски не нужно вращать
 * и под ними видна бледная картинка с контурами мест — это уровень для детей.
 * На сложной нет ни подсказки, ни контуров: остаётся только «подсмотреть».
 */
const RULES: Record<Difficulty, { rotate: boolean; ghost: number; outlines: boolean }> = {
	easy: { rotate: false, ghost: 0.32, outlines: true },
	medium: { rotate: true, ghost: 0.16, outlines: true },
	hard: { rotate: true, ghost: 0, outlines: false },
}

/**
 * Сколько кусков может одновременно лежать на поле не на своём месте.
 * Это «верстак»: кусок можно вынуть из лотка и отложить, чтобы подумать, но
 * не больше трёх. Иначе игрок вываливает весь лоток на поле, и лоток теряет
 * смысл, а поле превращается в свалку — ровно то, что было раньше.
 */
export const BENCH_LIMIT = 3

const BOARD_BG = 0xeaf5fb
const BOARD_EDGE = 0xffffff
const BOARD_DEPTH = 0xa9d3e6
const OUTLINE = 0xffffff

type Gesture =
	| { kind: 'tray-press'; piece: Piece; sx: number; sy: number }
	| { kind: 'bench-press'; piece: Piece; sx: number; sy: number; ox: number; oy: number }
	| { kind: 'scroll'; lastX: number; lastT: number; v: number }
	| {
			kind: 'drag'
			piece: Piece
			from: 'tray' | 'bench'
			trayIndex: number
			offset: { x: number; y: number }
	  }

class Game {
	private scene: Scene
	private option: IControlOpt
	private difficulty: Difficulty
	private phase: GamePhase
	private texture?: Texture
	private pieces: Piece[]

	/** Поле: всё внутри в пикселях картинки, на экран его выводит масштаб. */
	private board: Container
	private frame: Graphics
	private ghost: Sprite
	private outlines: Graphics
	private cracks: Graphics
	private locked: Container
	private full: Sprite
	/** Отложенные куски, кусок в руке, летящие куски и искры — в экранных координатах. */
	private bench: Container
	private top: Container
	private fx: Container
	private tray: Tray

	private scale: number
	private gesture: Gesture | null
	private pointer: { x: number; y: number }
	private layoutPending: boolean
	private tweens: Set<gsap.core.Animation>

	constructor({ scene, option }: IGameOpt) {
		this.scene = scene
		this.option = option
		this.difficulty = 'easy'
		this.phase = 'idle'
		this.pieces = []
		this.scale = 1
		this.gesture = null
		this.pointer = { x: 0, y: 0 }
		this.layoutPending = false
		this.tweens = new Set()

		this.board = new Container()
		this.frame = new Graphics()
		this.ghost = new Sprite()
		this.outlines = new Graphics()
		this.cracks = new Graphics()
		this.locked = new Container()
		this.full = new Sprite()
		this.board.addChild(
			this.frame,
			this.ghost,
			this.outlines,
			this.locked,
			this.cracks,
			this.full
		)
		this.bench = new Container()
		this.tray = new Tray()
		this.top = new Container()
		this.fx = new Container()
	}

	init() {
		const stage = this.scene.container
		stage.addChild(this.board, this.tray.view, this.bench, this.top, this.fx)

		const root = this.scene.app.stage
		root.eventMode = 'static'
		root.hitArea = this.scene.app.screen
		root.on('globalpointermove', this.onMove, this)
		root.on('pointerup', this.onUp, this)
		root.on('pointerupoutside', this.onUp, this)
		this.tray.background.on('pointerdown', this.onTrayDown, this)

		this.scene.addUpdate('tray', ({ deltaMS }) => {
			if (this.gesture?.kind !== 'scroll') this.tray.update(deltaMS)
			if (this.gesture?.kind === 'drag') {
				const { piece, offset } = this.gesture
				piece.view.position.set(
					this.pointer.x + offset.x,
					this.pointer.y + offset.y
				)
			}
		})
		this.scene.onResize(() => {
			if (this.phase === 'intro') this.layoutPending = true
			else this.layout()
		})
	}

	async start({ img, difficulty }: { img: string; difficulty: Difficulty }) {
		this.clear()
		this.difficulty = difficulty
		this.texture = await Assets.load<Texture>(img)
		// Пока грузилась картинка, игрок мог уйти со страницы.
		if (this.board.destroyed) return

		const tex = this.texture
		const shapes = shatter(PIECE_COUNT[difficulty], tex.width, tex.height)
		this.pieces = shapes.map((shape, i) => new Piece(shape, tex, i))
		this.pieces.forEach((piece) => {
			piece.view.on('pointerdown', (e: FederatedPointerEvent) =>
				this.onPieceDown(piece, e)
			)
		})

		this.ghost.texture = tex
		this.ghost.alpha = 0
		this.full.texture = tex
		this.full.alpha = 1
		this.full.visible = true
		this.drawOutlines()
		this.layout()
		this.intro()
	}

	// ─── Раскладка ─────────────────────────────────────────────────────────

	private layout() {
		const tex = this.texture
		if (!tex) return
		this.layoutPending = false
		const { width: W, height: H } = this.scene.app.screen

		const trayH = Math.round(Math.min(150, Math.max(96, W * 0.28)))
		const trayY = H - trayH
		// Над лотком оставлено место под плашку «стол», которую рисует страница.
		const areaH = trayY - 34
		const inset = 12
		this.scale = Math.min((W - inset * 2) / tex.width, (areaH - inset * 2) / tex.height)
		const bw = tex.width * this.scale
		const bh = tex.height * this.scale
		this.board.scale.set(this.scale)
		this.board.position.set((W - bw) / 2, (areaH - bh) / 2)

		const unit = 1 / this.scale
		this.frame
			.clear()
			.roundRect(-8 * unit, -8 * unit + 6 * unit, tex.width + 16 * unit, tex.height + 16 * unit, 18 * unit)
			.fill(BOARD_DEPTH)
			.roundRect(-8 * unit, -8 * unit, tex.width + 16 * unit, tex.height + 16 * unit, 18 * unit)
			.fill(BOARD_EDGE)
			.roundRect(0, 0, tex.width, tex.height, 8 * unit)
			.fill(BOARD_BG)
		this.drawOutlines()

		// Все куски в лотке одного масштаба, по самому крупному: иначе мелкий
		// кусок раздуло бы до размера крупного и размер перестал бы быть подсказкой.
		const maxRadius = Math.max(...this.pieces.map((p) => p.shape.radius))
		const box = trayH - 29
		const trayScale = (box * 0.86) / (2 * maxRadius)
		this.tray.layout(0, trayY, W, trayH, trayScale)

		this.pieces.forEach((piece) => {
			piece.draw(unit)
			if (piece.place === 'bench') {
				// Поле сжалось — кусок, лежавший над ним, мог оказаться за краем.
				// Место при этом не переписываем: вернётся размер — вернётся и кусок.
				const at = this.clampToPlay(piece, this.toScreen(piece.benchAt))
				piece.view.position.set(at.x, at.y)
				piece.view.scale.set(this.scale)
			}
		})
		this.emitState()
	}

	private drawOutlines() {
		this.outlines.clear()
		const rules = RULES[this.difficulty]
		if (!rules.outlines) return
		const unit = 1 / this.scale
		this.pieces.forEach((p) => this.outlines.poly(p.shape.points))
		this.outlines.stroke({ width: 1.5 * unit, color: OUTLINE, alpha: 0.9 })
	}

	private toScreen(p: { x: number; y: number }) {
		return {
			x: this.board.x + p.x * this.scale,
			y: this.board.y + p.y * this.scale,
		}
	}

	private toImage(p: { x: number; y: number }) {
		return {
			x: (p.x - this.board.x) / this.scale,
			y: (p.y - this.board.y) / this.scale,
		}
	}

	// ─── Анимации ──────────────────────────────────────────────────────────

	private tween(target: object, vars: gsap.TweenVars) {
		// Свой onComplete забираем заранее: gsap хранит колбэк в том же объекте
		// vars, и обёртка, читающая vars.onComplete, вызывала бы сама себя.
		const done = vars.onComplete
		const t = gsap.to(target, {
			...vars,
			onComplete: () => {
				this.tweens.delete(t)
				done?.()
			},
		})
		this.tweens.add(t)
		return t
	}

	private later(seconds: number, fn: () => void) {
		const t = gsap.delayedCall(seconds, () => {
			this.tweens.delete(t)
			fn()
		})
		this.tweens.add(t)
	}

	/**
	 * Целая картинка → трещины → осколки расходятся → улетают по ящикам.
	 * Игрок сначала видит, что собирать, и только потом получает куски.
	 */
	private intro() {
		this.setPhase('intro')
		const tex = this.texture!
		const unit = 1 / this.scale

		this.cracks.clear()
		this.pieces.forEach((p) => this.cracks.poly(p.shape.points))
		this.cracks.stroke({ width: 3 * unit, color: 0xffffff, join: 'round' })
		this.cracks.alpha = 0

		this.later(1.1, () => {
			// Трещины и короткая встряска поля.
			this.tween(this.cracks, { alpha: 1, duration: 0.12 })
			const bx = this.board.x
			this.tween(this.board, {
				x: bx + 5,
				duration: 0.05,
				repeat: 5,
				yoyo: true,
				ease: 'sine.inOut',
				onComplete: () => {
					this.board.x = bx
				},
			})
		})

		this.later(1.55, () => {
			this.full.visible = false
			this.pieces.forEach((piece) => {
				this.locked.addChild(piece.view)
				piece.place = 'fly'
				// Осколки чуть расходятся от центра — удар, а не нарезка.
				const c = piece.shape.center
				this.tween(piece.view.position, {
					x: c.x + (c.x - tex.width / 2) * 0.07,
					y: c.y + (c.y - tex.height / 2) * 0.07,
					duration: 0.3,
					ease: 'back.out(3)',
				})
			})
			this.tween(this.cracks, { alpha: 0, duration: 0.3 })
		})

		this.later(2.0, () => this.sendToTray())
	}

	private sendToTray() {
		const rules = RULES[this.difficulty]
		const order = shuffle([...this.pieces])
		order.forEach((piece) => {
			piece.rot = rules.rotate ? Math.floor(Math.random() * 4) : 0
			piece.setRaised(true)
		})
		// На вращаемых сложностях хоть один кусок да должен быть повёрнут.
		if (rules.rotate && order.every((p) => p.rot === 0)) order[0].rot = 1

		this.tray.fill(order)
		const trayRight = this.tray.x + this.tray.width
		const step = Math.min(0.06, 1.2 / order.length)

		order.forEach((piece, i) => {
			const global = piece.view.getGlobalPosition()
			this.top.addChild(piece.view)
			piece.view.position.set(global.x, global.y)
			piece.view.scale.set(this.scale)

			const slot = this.tray.globalSlot(i)
			// Ящики за правым краем не видны — туда кусок «ныряет» у края лотка.
			const hidden = slot.x > trayRight - this.tray.box * 0.3
			const tx = hidden ? trayRight - this.tray.box / 2 : slot.x
			const box = this.tray.boxOf(piece)!
			const delay = i * step

			this.tween(box.scale, { x: 1, y: 1, duration: 0.25, delay: delay + 0.3, ease: 'back.out(2)' })
			this.tween(piece.view, {
				rotation: (piece.rot * Math.PI) / 2,
				alpha: hidden ? 0 : 1,
				duration: 0.6,
				delay,
				ease: 'power2.inOut',
			})
			this.tween(piece.view.scale, {
				x: this.tray.pieceScale,
				y: this.tray.pieceScale,
				duration: 0.6,
				delay,
				ease: 'power2.inOut',
			})
			this.tween(piece.view.position, {
				x: tx,
				y: slot.y,
				duration: 0.6,
				delay,
				ease: 'power2.inOut',
				onComplete: () => {
					box.addChild(piece.view)
					piece.view.position.set(0, 0)
					piece.view.alpha = 1
					piece.place = 'tray'
				},
			})
		})

		const total = (order.length - 1) * step + 0.65
		this.later(total, () => {
			this.tween(this.ghost, { alpha: rules.ghost, duration: 0.4 })
			this.outlines.alpha = 0
			this.tween(this.outlines, { alpha: 1, duration: 0.4 })
			this.setPhase('play')
			if (this.layoutPending) this.layout()
		})
	}

	private sparkle(x: number, y: number) {
		const colors = [0xffd166, 0xff8fab, 0x8ecae6, 0xffffff]
		for (let i = 0; i < 8; i++) {
			const star = new Graphics()
				.star(0, 0, 5, 7, 3)
				.fill(colors[i % colors.length])
			star.position.set(x, y)
			this.fx.addChild(star)
			const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5
			const d = 34 + Math.random() * 26
			this.tween(star, {
				x: x + Math.cos(a) * d,
				y: y + Math.sin(a) * d,
				rotation: Math.random() * 3,
				alpha: 0,
				duration: 0.6,
				ease: 'power2.out',
				onComplete: () => star.destroy(),
			})
		}
	}

	// ─── Жесты ─────────────────────────────────────────────────────────────

	private onPieceDown(piece: Piece, e: FederatedPointerEvent) {
		if (this.phase !== 'play' || this.gesture) return
		e.stopPropagation()
		this.pointer = { x: e.global.x, y: e.global.y }
		this.tray.stop()
		if (piece.place === 'tray') {
			this.gesture = { kind: 'tray-press', piece, sx: e.global.x, sy: e.global.y }
		} else if (piece.place === 'bench') {
			this.gesture = {
				kind: 'bench-press',
				piece,
				sx: e.global.x,
				sy: e.global.y,
				ox: piece.view.x - e.global.x,
				oy: piece.view.y - e.global.y,
			}
		}
	}

	private onTrayDown(e: FederatedPointerEvent) {
		if (this.phase !== 'play' || this.gesture) return
		this.tray.stop()
		this.gesture = { kind: 'scroll', lastX: e.global.x, lastT: performance.now(), v: 0 }
	}

	private onMove(e: FederatedPointerEvent) {
		this.pointer = { x: e.global.x, y: e.global.y }
		const g = this.gesture
		if (!g) return

		if (g.kind === 'tray-press') {
			const dx = e.global.x - g.sx
			const dy = e.global.y - g.sy
			// Вверх — достать кусок, вбок — листать ленту. Порог по углу, а не
			// строгая вертикаль: ребёнок тянет наискосок.
			if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 0.8) this.lift(g.piece)
			else if (Math.abs(dx) > 10)
				this.gesture = { kind: 'scroll', lastX: e.global.x, lastT: performance.now(), v: 0 }
		} else if (g.kind === 'bench-press') {
			if (Math.hypot(e.global.x - g.sx, e.global.y - g.sy) > 6) {
				this.top.addChild(g.piece.view)
				g.piece.place = 'drag'
				this.gesture = {
					kind: 'drag',
					piece: g.piece,
					from: 'bench',
					trayIndex: -1,
					offset: { x: g.ox, y: g.oy },
				}
			}
		} else if (g.kind === 'scroll') {
			const now = performance.now()
			const dx = e.global.x - g.lastX
			this.tray.setScroll(this.tray.scrollValue - dx)
			g.v = -dx / Math.max(1, now - g.lastT)
			g.lastX = e.global.x
			g.lastT = now
		}
	}

	private onUp() {
		const g = this.gesture
		this.gesture = null
		if (!g) return

		if (g.kind === 'tray-press') this.rotate(g.piece)
		else if (g.kind === 'bench-press') {
			this.rotate(g.piece)
			if (this.fits(g.piece)) this.lock(g.piece)
		} else if (g.kind === 'scroll') this.tray.fling(g.v)
		else if (g.kind === 'drag') this.drop(g)
	}

	/** Кусок из лотка в руку: вырастает до размера поля и встаёт над пальцем. */
	private lift(piece: Piece) {
		const trayIndex = this.tray.take(piece, this.top)
		piece.place = 'drag'
		// Над пальцем, а не под ним: иначе палец закрывает как раз то, что надо видеть.
		const up = Math.min(piece.shape.radius * this.scale * 0.8, 70)
		const offset = {
			x: piece.view.x - this.pointer.x,
			y: piece.view.y - this.pointer.y,
		}
		this.tween(offset, { x: 0, y: -up, duration: 0.18, ease: 'power2.out' })
		this.tween(piece.view.scale, { x: this.scale, y: this.scale, duration: 0.18, ease: 'power2.out' })
		this.gesture = { kind: 'drag', piece, from: 'tray', trayIndex, offset }
	}

	private rotate(piece: Piece) {
		if (!RULES[this.difficulty].rotate) return
		piece.rot = (piece.rot + 1) % 4
		gsap.killTweensOf(piece.view, 'rotation')
		// Всегда крутим вперёд, накапливая угол, — без рывка назад на переходе 3→0.
		this.tween(piece.view, {
			rotation: Math.round(piece.view.rotation / (Math.PI / 2) + 1) * (Math.PI / 2),
			duration: 0.18,
			ease: 'back.out(2)',
			onComplete: () => {
				piece.view.rotation = (piece.rot * Math.PI) / 2
			},
		})
	}

	/** Лежит ли кусок достаточно близко к своему месту и правильно повёрнут. */
	private fits(piece: Piece) {
		if (piece.rot !== 0) return false
		const target = this.toScreen(piece.shape.center)
		// Допуск — треть радиуса куска: пальцем точнее не положить, а соседнее
		// место при равных кусках дальше целого радиуса.
		const tolerance = Math.max(16, piece.shape.radius * this.scale * 0.35)
		return Math.hypot(piece.view.x - target.x, piece.view.y - target.y) < tolerance
	}

	private drop(g: Extract<Gesture, { kind: 'drag' }>) {
		const { piece } = g
		const overTray = this.pointer.y > this.tray.y - 8

		if (overTray) return this.toTray(piece, this.tray.indexAt(this.pointer.x))
		if (this.fits(piece)) return this.lock(piece)

		const benchFull = this.pieces.filter((p) => p.place === 'bench').length >= BENCH_LIMIT
		if (g.from === 'tray' && benchFull) {
			this.toTray(piece, g.trayIndex)
			this.option.onBenchFull?.()
			return
		}
		this.toBench(piece)
	}

	/** Точка внутри игровой области над лотком — отложенный кусок не должен уезжать за край. */
	private clampToPlay(piece: Piece, p: { x: number; y: number }) {
		const { width: W } = this.scene.app.screen
		const r = piece.shape.radius * this.scale * 0.6
		return {
			x: Math.min(W - r, Math.max(r, p.x)),
			y: Math.min(this.tray.y - r * 0.6, Math.max(r * 0.6, p.y)),
		}
	}

	private toBench(piece: Piece) {
		const { x, y } = this.clampToPlay(piece, piece.view.position)
		this.bench.addChild(piece.view)
		piece.place = 'bench'
		piece.benchAt = this.toImage({ x, y })
		this.tween(piece.view.position, { x, y, duration: 0.15, ease: 'power2.out' })
		this.emitState()
	}

	private toTray(piece: Piece, index: number) {
		gsap.killTweensOf(piece.view.scale)
		this.tray.insert(piece, index)
		this.emitState()
	}

	private lock(piece: Piece) {
		const target = this.toScreen(piece.shape.center)
		piece.place = 'board'
		gsap.killTweensOf(piece.view.scale)
		this.top.addChild(piece.view)
		this.tween(piece.view.position, { x: target.x, y: target.y, duration: 0.14, ease: 'power2.out' })
		this.tween(piece.view.scale, {
			x: this.scale,
			y: this.scale,
			duration: 0.14,
			onComplete: () => {
				this.locked.addChild(piece.view)
				piece.view.position.set(piece.shape.center.x, piece.shape.center.y)
				piece.view.scale.set(1)
				piece.view.rotation = 0
				piece.view.eventMode = 'none'
				piece.setRaised(false)
				piece.setEdgeAlpha(0.45)
				this.sparkle(target.x, target.y)
				this.emitState()
				this.checkWin()
			},
		})
	}

	private checkWin() {
		if (this.pieces.some((p) => p.place !== 'board')) return
		this.setPhase('done')
		this.pieces.forEach((p) => this.tween(p.edgeGraphics, { alpha: 0, duration: 0.6 }))
		const { width, height } = this.scene.app.screen
		this.later(0.3, () => {
			for (let i = 0; i < 5; i++)
				this.later(i * 0.12, () =>
					this.sparkle(width * (0.2 + Math.random() * 0.6), height * (0.15 + Math.random() * 0.5))
				)
		})
		this.later(1.1, () => this.option.endGame())
	}

	// ─── Состояние наружу ──────────────────────────────────────────────────

	private setPhase(phase: GamePhase) {
		this.phase = phase
		document.body.dataset.phase = phase
		this.option.onPhase?.(phase)
		this.emitState()
	}

	private emitState() {
		this.option.onState?.({
			total: this.pieces.length,
			placed: this.pieces.filter((p) => p.place === 'board').length,
			bench: this.pieces.filter((p) => p.place === 'bench').length,
			benchLimit: BENCH_LIMIT,
			rotate: RULES[this.difficulty].rotate,
			trayTop: this.tray.y,
		})
	}

	/** Подсмотреть картинку, пока кнопка зажата. */
	peek(on: boolean) {
		if (this.phase !== 'play') return
		gsap.killTweensOf(this.full)
		this.full.visible = true
		this.tween(this.full, {
			alpha: on ? 1 : 0,
			duration: 0.15,
			onComplete: () => {
				this.full.visible = on
			},
		})
	}

	/**
	 * Ручки для скрипта съёмки экранов: сразу положить долю кусков на место
	 * и заполнить верстак. В игре не используются.
	 */
	debug() {
		return {
			/** Где каждый кусок на экране и где его место — чтобы тест водил мышью. */
			targets: () =>
				this.pieces.map((p) => {
					const at = p.view.getGlobalPosition()
					const to = this.toScreen(p.shape.center)
					return { i: p.index, place: p.place, rot: p.rot, x: at.x, y: at.y, tx: to.x, ty: to.y }
				}),
			solve: (fraction: number) => {
				const need = Math.ceil(this.pieces.length * fraction)
				const left = this.pieces.filter((p) => p.place !== 'board')
				let placed = this.pieces.length - left.length
				for (const piece of left) {
					if (placed >= need) break
					if (piece.place === 'tray') this.tray.take(piece, this.top)
					piece.rot = 0
					piece.view.rotation = 0
					this.lock(piece)
					placed++
				}
			},
			fillBench: () => {
				const { width: W } = this.scene.app.screen
				const trayPieces = this.pieces.filter((p) => p.place === 'tray')
				const spots = [0.22, 0.5, 0.78]
				trayPieces.slice(0, BENCH_LIMIT).forEach((piece, i) => {
					this.tray.take(piece, this.top)
					piece.view.scale.set(this.scale)
					piece.view.position.set(W * spots[i], this.board.y + 40 + (i % 2) * 60)
					this.toBench(piece)
				})
			},
		}
	}

	// ─── Уборка ────────────────────────────────────────────────────────────

	private clear() {
		this.tweens.forEach((t) => t.kill())
		this.tweens.clear()
		this.gesture = null
		this.pieces.forEach((p) => p.destroy())
		this.pieces = []
		this.tray.clear()
		this.fx.removeChildren().forEach((c) => c.destroy())
		this.cracks.clear()
		this.outlines.clear()
		this.full.visible = false
		this.texture = undefined
		this.phase = 'idle'
	}

	destroy() {
		this.clear()
		delete document.body.dataset.phase
		this.scene.removeUpdate('tray')
	}
}

function shuffle<T>(list: T[]) {
	for (let i = list.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[list[i], list[j]] = [list[j], list[i]]
	}
	return list
}

export default Game

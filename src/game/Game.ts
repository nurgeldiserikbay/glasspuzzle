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
import { IGameOpt, IControlOpt, Difficulty, GamePhase, IPoint } from './interfaces'
import { Piece } from './Piece'
import { Group } from './Group'
import { Tray } from './Tray'
import { PIECE_COUNT, neighbors, shatter } from './shatter'
import { sound } from '@/utils/sound'

/**
 * Главное правило: куски склеиваются друг с другом. Два куска (или две
 * группы) сливаются, если в картинке они были соседями, повёрнуты одинаково
 * и положены рядом так, как стояли в картинке. Уровень собран, когда всё
 * слилось в одну группу.
 *
 * Рамка — только опора для детей на лёгкой: там куски ещё и защёлкиваются
 * прямо на своё место в рамке, под которыми видна бледная картинка. На
 * средней и сложной рамки нет, всё поле над лотком — рабочий стол.
 */
const RULES: Record<
	Difficulty,
	{ rotate: boolean; frame: boolean; ghost: number; outlines: boolean }
> = {
	easy: { rotate: false, frame: true, ghost: 0, outlines: true },
	medium: { rotate: true, frame: false, ghost: 0, outlines: false },
	hard: { rotate: true, frame: false, ghost: 0, outlines: false },
}

/**
 * Сколько групп может одновременно лежать на столе. Считаются группы, а не
 * куски: чтобы достать из лотка новый кусок, иногда надо сначала что-то
 * склеить. Каждая склейка освобождает место — это и есть давление, из-за
 * которого нельзя вывалить весь лоток на поле и разбирать потом.
 */
export const BENCH_LIMIT = 3

// Рамка поля — кремовая оправа, как у карточек интерфейса.
const BOARD_BG = 0xe4f3fb
const BOARD_EDGE = 0xfffaf0
const BOARD_RIM = 0xecd6ae
const BOARD_DEPTH = 0xe0c08e
const OUTLINE = 0xffffff

type Gesture =
	| { kind: 'tray-press'; piece: Piece; sx: number; sy: number }
	| { kind: 'group-press'; group: Group; sx: number; sy: number; ox: number; oy: number }
	| { kind: 'scroll'; lastX: number; lastT: number; v: number }
	| {
			kind: 'drag'
			group: Group
			from: 'tray' | 'field'
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
	private groups: Group[]
	private adjacent: Set<number>[]

	/** Рамка: всё внутри в пикселях картинки, на экран её выводит масштаб. */
	private board: Container
	private frame: Graphics
	private ghost: Sprite
	private outlines: Graphics
	private locked: Container
	/** Целая картинка и трещины — над столом, чтобы «подсмотреть» было видно поверх кусков. */
	private peekLayer: Container
	private full: Sprite
	private cracks: Graphics
	/** Стол с группами, кусок в руке и летящие куски, искры — в экранных координатах. */
	private field: Container
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
		this.groups = []
		this.adjacent = []
		this.scale = 1
		this.gesture = null
		this.pointer = { x: 0, y: 0 }
		this.layoutPending = false
		this.tweens = new Set()

		this.board = new Container()
		this.frame = new Graphics()
		this.ghost = new Sprite()
		this.outlines = new Graphics()
		this.locked = new Container()
		this.board.addChild(this.frame, this.ghost, this.outlines, this.locked)
		this.peekLayer = new Container()
		this.full = new Sprite()
		this.cracks = new Graphics()
		this.peekLayer.addChild(this.full, this.cracks)
		this.field = new Container()
		this.tray = new Tray()
		this.top = new Container()
		this.fx = new Container()
	}

	init() {
		const stage = this.scene.container
		stage.addChild(this.board, this.tray.view, this.field, this.peekLayer, this.top, this.fx)

		const root = this.scene.app.stage
		root.eventMode = 'static'
		root.hitArea = this.scene.app.screen
		root.on('globalpointermove', this.onMove, this)
		root.on('pointerup', this.onUp, this)
		root.on('pointerupoutside', this.onUp, this)
		// Все касания ловит сцена, а кусок под пальцем ищем сами (см. pick).
		root.on('pointerdown', this.onDown, this)

		this.scene.addUpdate('tray', ({ deltaMS }) => {
			if (this.gesture?.kind !== 'scroll') this.tray.update(deltaMS)
			if (this.gesture?.kind === 'drag') {
				const { group, offset } = this.gesture
				group.view.position.set(this.pointer.x + offset.x, this.pointer.y + offset.y)
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
		this.adjacent = neighbors(shapes)
		this.pieces = shapes.map((shape, i) => new Piece(shape, tex, i))

		this.ghost.texture = tex
		this.ghost.alpha = 0
		this.full.texture = tex
		this.full.alpha = 1
		this.full.visible = true
		this.frame.alpha = 1
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
		this.peekLayer.scale.set(this.scale)
		this.peekLayer.position.copyFrom(this.board.position)

		const unit = 1 / this.scale
		// Толстая кремовая оправа с толщиной снизу, внутри — светлое «стекло».
		const b = 10 * unit
		this.frame
			.clear()
			.roundRect(-b, -b + 6 * unit, tex.width + 2 * b, tex.height + 2 * b, 20 * unit)
			.fill(BOARD_DEPTH)
			.roundRect(-b, -b, tex.width + 2 * b, tex.height + 2 * b, 20 * unit)
			.fill(BOARD_EDGE)
			.stroke({ width: 2 * unit, color: BOARD_RIM })
			.roundRect(0, 0, tex.width, tex.height, 10 * unit)
			.fill(BOARD_BG)
			.stroke({ width: 2 * unit, color: 0xffffff, alpha: 0.9 })
		this.drawOutlines()

		// Все куски в лотке одного масштаба, по самому крупному: иначе мелкий
		// кусок раздуло бы до размера крупного и размер перестал бы быть подсказкой.
		const maxRadius = Math.max(...this.pieces.map((p) => p.shape.radius))
		const box = trayH - 29
		this.tray.layout(0, trayY, W, trayH, (box * 0.86) / (2 * maxRadius))

		this.pieces.forEach((piece) => piece.draw(unit))
		this.groups.forEach((group) => {
			// Поле сжалось — группа, лежавшая у края, могла оказаться за ним.
			// Место при этом не переписываем: вернётся размер — вернётся и группа.
			const at = this.clampToField(group, this.toScreen(group.fieldAt))
			group.view.position.set(at.x, at.y)
			group.view.scale.set(this.scale)
			group.draw(unit)
		})
		this.emitState()
	}

	private drawOutlines() {
		this.outlines.clear()
		if (!RULES[this.difficulty].outlines) return
		const unit = 1 / this.scale
		this.pieces.forEach((p) => this.outlines.poly(p.shape.points))
		this.outlines.stroke({ width: 1.5 * unit, color: OUTLINE, alpha: 0.9 })
	}

	private toScreen(p: IPoint) {
		return { x: this.board.x + p.x * this.scale, y: this.board.y + p.y * this.scale }
	}

	private toImage(p: IPoint) {
		return { x: (p.x - this.board.x) / this.scale, y: (p.y - this.board.y) / this.scale }
	}

	/** Центр группы внутри стола над лотком; большая группа может свисать за край, но не уходит. */
	private clampToField(group: Group, p: IPoint) {
		const { width: W } = this.scene.app.screen
		const r = group.size > 1 ? 30 : group.radius * this.scale * 0.6
		const mx = Math.min(r, W / 2)
		const my = Math.min(r * 0.6, this.tray.y / 2)
		return {
			x: Math.min(W - mx, Math.max(mx, p.x)),
			y: Math.min(this.tray.y - my, Math.max(my, p.y)),
		}
	}

	/** Допуск склейки: пальцем точнее не положить, а чужое место дальше целого радиуса куска. */
	private get tolerance() {
		const avg = this.pieces.reduce((s, p) => s + p.shape.radius, 0) / this.pieces.length
		return Math.max(16, avg * this.scale * 0.35)
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
			sound.play('crack')
			this.tween(this.cracks, { alpha: 1, duration: 0.12 })
			const bx = this.board.x
			this.tween([this.board, this.peekLayer], {
				x: bx + 5,
				duration: 0.05,
				repeat: 5,
				yoyo: true,
				ease: 'sine.inOut',
				onComplete: () => {
					this.board.x = bx
					this.peekLayer.x = bx
				},
			})
		})

		this.later(1.55, () => {
			this.full.visible = false
			this.pieces.forEach((piece) => {
				this.locked.addChild(piece.view)
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
		sound.play('whoosh')
		const rules = RULES[this.difficulty]
		const order = shuffle([...this.pieces])
		order.forEach((piece) => {
			piece.rot = rules.rotate ? Math.floor(Math.random() * 4) : 0
			piece.drawThickness()
			piece.setRaised(true)
		})
		// На вращаемых сложностях хоть один кусок да должен быть повёрнут.
		if (rules.rotate && order.every((p) => p.rot === 0)) {
			order[0].rot = 1
			order[0].drawThickness()
		}

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
			const flight = { duration: 0.6, delay, ease: 'power2.inOut' }

			this.tween(box.scale, { x: 1, y: 1, duration: 0.25, delay: delay + 0.3, ease: 'back.out(2)' })
			this.tween(piece.view, { rotation: (piece.rot * Math.PI) / 2, alpha: hidden ? 0 : 1, ...flight })
			this.tween(piece.view.scale, { x: this.tray.pieceScale, y: this.tray.pieceScale, ...flight })
			this.tween(piece.view.position, {
				x: tx,
				y: slot.y,
				...flight,
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
			if (rules.frame) {
				this.tween(this.ghost, { alpha: rules.ghost, duration: 0.4 })
				this.outlines.alpha = 0
				this.tween(this.outlines, { alpha: 1, duration: 0.4 })
			} else {
				// Без рамки всё поле — стол; рамка вернётся в финале, когда в неё
				// ляжет собранная картинка.
				this.tween(this.frame, { alpha: 0, duration: 0.4 })
			}
			this.setPhase('play')
			if (this.layoutPending) this.layout()
		})
	}

	private sparkle(x: number, y: number) {
		const colors = [0xffd166, 0xff8fab, 0x8ecae6, 0xffffff]
		for (let i = 0; i < 8; i++) {
			const star = new Graphics().star(0, 0, 5, 7, 3).fill(colors[i % colors.length])
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

	private onDown(e: FederatedPointerEvent) {
		if (this.phase !== 'play' || this.gesture) return
		const piece = this.pick(e.global)
		if (piece) this.onPieceDown(piece, e)
		// Мимо кусков в полосе лотка — листание, в том числе между ящиками.
		else if (e.global.y >= this.tray.y) this.onTrayDown(e)
	}

	/**
	 * Кусок под пальцем. Считаем сами по свежей матрице, а не встроенной
	 * проверкой Pixi: после переноса группы из руки на стол та иногда
	 * промахивалась мимо лежащего куска — касание уходило в пустоту, и тап не
	 * поворачивал, а кусок не брался. Сверху вниз: стол, затем лоток.
	 */
	private pick(p: IPoint) {
		const hit = (piece: Piece) => {
			const local = piece.view.toLocal(p)
			return piece.contains(local.x, local.y)
		}
		const views = [...this.field.children].reverse()
		for (const view of views) {
			const group = this.groups.find((g) => g.view === view)
			const piece = group?.pieces.find(hit)
			if (piece) return piece
		}
		const inStrip = p.y >= this.tray.y && p.x > this.tray.x + 4 && p.x < this.tray.x + this.tray.width - 4
		if (inStrip) return this.pieces.find((q) => q.place === 'tray' && hit(q)) || null
		return null
	}

	private onPieceDown(piece: Piece, e: FederatedPointerEvent) {
		this.pointer = { x: e.global.x, y: e.global.y }
		this.tray.stop()
		if (piece.place === 'tray') {
			this.gesture = { kind: 'tray-press', piece, sx: e.global.x, sy: e.global.y }
		} else if (piece.place === 'group' && piece.group) {
			const group = piece.group
			this.gesture = {
				kind: 'group-press',
				group,
				sx: e.global.x,
				sy: e.global.y,
				ox: group.view.x - e.global.x,
				oy: group.view.y - e.global.y,
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
		} else if (g.kind === 'group-press') {
			if (Math.hypot(e.global.x - g.sx, e.global.y - g.sy) > 6) {
				this.top.addChild(g.group.view)
				this.gesture = {
					kind: 'drag',
					group: g.group,
					from: 'field',
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

		if (g.kind === 'tray-press') this.rotatePiece(g.piece)
		else if (g.kind === 'group-press') {
			this.rotateGroup(g.group)
			// Поворот мог как раз подогнать группу к соседу.
			this.settle(g.group, 'field', -1)
		} else if (g.kind === 'scroll') this.tray.fling(g.v)
		else if (g.kind === 'drag') this.drop(g)
	}

	/** Кусок из лотка в руку: становится группой из одного куска и встаёт над пальцем. */
	private lift(piece: Piece) {
		const at = piece.view.getGlobalPosition()
		const from = piece.view.scale.x
		const trayIndex = this.tray.take(piece, this.top)
		const group = new Group(piece)
		sound.play('pick')
		this.top.addChild(group.view)
		group.view.position.set(at.x, at.y)
		group.view.scale.set(from)
		group.draw(1 / this.scale)

		// Над пальцем, а не под ним: иначе палец закрывает как раз то, что надо видеть.
		const up = Math.min(piece.shape.radius * this.scale * 0.8, 70)
		const offset = { x: at.x - this.pointer.x, y: at.y - this.pointer.y }
		this.tween(offset, { x: 0, y: -up, duration: 0.18, ease: 'power2.out' })
		this.tween(group.view.scale, { x: this.scale, y: this.scale, duration: 0.18, ease: 'power2.out' })
		this.gesture = { kind: 'drag', group, from: 'tray', trayIndex, offset }
	}

	private rotatePiece(piece: Piece) {
		if (!RULES[this.difficulty].rotate) return
		sound.play('rotate')
		piece.rot = (piece.rot + 1) % 4
		piece.drawThickness()
		this.spin(piece.view, piece.rot)
	}

	private rotateGroup(group: Group) {
		if (!RULES[this.difficulty].rotate) return
		sound.play('rotate')
		group.rot = (group.rot + 1) % 4
		group.drawUnder()
		this.spin(group.view, group.rot)
	}

	/** Всегда крутим вперёд, накапливая угол, — без рывка назад на переходе 3→0. */
	private spin(view: Container, rot: number) {
		gsap.killTweensOf(view, 'rotation')
		this.tween(view, {
			rotation: Math.round(view.rotation / (Math.PI / 2) + 1) * (Math.PI / 2),
			duration: 0.18,
			ease: 'back.out(2)',
			onComplete: () => {
				view.rotation = (rot * Math.PI) / 2
			},
		})
	}

	private drop(g: Extract<Gesture, { kind: 'drag' }>) {
		const { group } = g
		// Решает, где сам кусок, а не палец: кусок висит над пальцем, и кусок,
		// положенный у нижнего края поля, иначе считался бы брошенным в лоток.
		if (group.view.y > this.tray.y - 12) {
			// В лоток возвращается только одиночный кусок: собранное не разбираем.
			if (group.size === 1) return this.toTray(group, this.tray.indexAt(this.pointer.x))
			return this.toField(group)
		}
		this.settle(group, g.from, g.trayIndex)
	}

	/**
	 * Куда девается брошенная группа: в рамку (на лёгкой), в соседа или просто
	 * на стол. Новый кусок из лотка, который ни к чему не прилип, при полном
	 * столе возвращается в свой ящик.
	 */
	private settle(group: Group, from: 'tray' | 'field', trayIndex: number) {
		if (RULES[this.difficulty].frame && this.fitsFrame(group)) return this.lock(group)
		const merged = this.merge(group)
		if (merged) return this.afterMerge(merged)

		const others = this.groups.filter((g) => g !== group).length
		if (from === 'tray' && others >= BENCH_LIMIT) {
			sound.play('full')
			this.toTray(group, trayIndex)
			this.option.onBenchFull?.()
			return
		}
		this.toField(group)
	}

	private fitsFrame(group: Group) {
		if (group.rot !== 0) return false
		const target = this.toScreen(group.view.pivot)
		return Math.hypot(group.view.x - target.x, group.view.y - target.y) < this.tolerance
	}

	/** Были ли в картинке соседями хоть два куска из этих групп. */
	private touching(a: Group, b: Group) {
		return a.pieces.some((p) => b.pieces.some((q) => this.adjacent[p.index].has(q.index)))
	}

	/**
	 * Приклеивает группу ко всем подходящим соседям. Сосед подходит, если
	 * повёрнут так же, граничит в картинке и лежит почти там, где должен
	 * лежать относительно группы. Возвращает то, во что всё слилось.
	 */
	private merge(group: Group): Group | null {
		let current = group
		let merged = false
		for (;;) {
			const partner = this.groups.find((other) => {
				if (other === current || other.rot !== current.rot) return false
				if (!this.touching(current, other)) return false
				// Где должна стоять current, чтобы продолжить картинку other.
				const want = other.pointAt(current.view.pivot)
				return Math.hypot(current.view.x - want.x, current.view.y - want.y) < this.tolerance
			})
			if (!partner) break
			// Меньшая встаёт к большей: большая группа не дёргается под пальцем.
			const [keep, give] =
				partner.size >= current.size ? [partner, current] : [current, partner]
			this.field.addChild(keep.view)
			const want = keep.pointAt(give.view.pivot)
			give.view.position.set(want.x, want.y)
			this.groups = this.groups.filter((g) => g !== give)
			keep.absorb(give)
			if (!this.groups.includes(keep)) this.groups.push(keep)
			current = keep
			merged = true
		}
		return merged ? current : null
	}

	private afterMerge(group: Group) {
		sound.play('join', group.size)
		this.field.addChild(group.view)
		group.fieldAt = this.toImage(group.view.position)
		group.view.scale.set(this.scale * 1.06)
		this.tween(group.view.scale, { x: this.scale, y: this.scale, duration: 0.25, ease: 'back.out(3)' })
		const c = group.view.position
		this.sparkle(c.x, c.y)
		this.emitState()
		this.checkWin()
	}

	private toField(group: Group) {
		// Звук — только когда группу положили рукой, а не когда она уже лежала.
		if (group.view.parent === this.top) sound.play('drop')
		const { x, y } = this.clampToField(group, group.view.position)
		this.field.addChild(group.view)
		if (!this.groups.includes(group)) this.groups.push(group)
		group.fieldAt = this.toImage({ x, y })
		this.tween(group.view.position, { x, y, duration: 0.15, ease: 'power2.out' })
		this.emitState()
	}

	/** Одиночный кусок обратно в ящик: группа распускается, кусок уносит свой поворот. */
	private toTray(group: Group, index: number) {
		const piece = group.pieces[0]
		const at = group.view.position.clone()
		const scale = group.view.scale.x
		piece.rot = group.rot
		this.groups = this.groups.filter((g) => g !== group)
		gsap.killTweensOf(group.view.scale)
		group.pieces = []
		this.top.addChild(piece.view)
		group.destroy()

		piece.group = null
		piece.view.position.set(at.x, at.y)
		piece.view.rotation = (piece.rot * Math.PI) / 2
		piece.view.scale.set(scale)
		piece.setEdgeAlpha(1)
		piece.drawThickness()
		this.tray.insert(piece, index)
		this.emitState()
	}

	/** Лёгкая: группа встаёт в рамку и там и остаётся. */
	private lock(group: Group) {
		const target = this.toScreen(group.view.pivot)
		this.groups = this.groups.filter((g) => g !== group)
		this.top.addChild(group.view)
		gsap.killTweensOf(group.view.scale)
		this.tween(group.view.scale, { x: this.scale, y: this.scale, duration: 0.14 })
		this.tween(group.view.position, {
			x: target.x,
			y: target.y,
			duration: 0.14,
			ease: 'power2.out',
			onComplete: () => {
				const pieces = group.pieces
				group.pieces = []
				group.destroy()
				for (const piece of pieces) {
					this.locked.addChild(piece.view)
					piece.group = null
					piece.place = 'board'
					piece.view.position.set(piece.shape.center.x, piece.shape.center.y)
					piece.view.eventMode = 'none'
					piece.setEdgeAlpha(0.45)
				}
				sound.play('join', this.pieces.filter((p) => p.place === 'board').length + 1)
				this.sparkle(target.x, target.y)
				this.emitState()
				this.checkWin()
			},
		})
	}

	private checkWin() {
		if (this.pieces.some((p) => p.place === 'tray' || p.place === 'fly')) return
		const inFrame = this.pieces.every((p) => p.place === 'board')
		const whole = this.groups.length === 1 && this.groups[0].size === this.pieces.length
		if (!inFrame && !whole) return
		this.setPhase('done')
		this.later(0.35, () => sound.play('win'))

		if (whole) {
			// Собранная картинка встаёт в рамку ровно, как была до разбития.
			const group = this.groups[0]
			const target = this.toScreen(group.view.pivot)
			const turn = Math.round(group.view.rotation / (Math.PI * 2)) * Math.PI * 2
			this.field.addChild(group.view)
			this.tween(this.frame, { alpha: 1, duration: 0.4 })
			this.tween(group.view, { rotation: turn, duration: 0.5, ease: 'power2.inOut' })
			this.tween(group.view.scale, { x: this.scale, y: this.scale, duration: 0.5 })
			this.tween(group.view.position, { x: target.x, y: target.y, duration: 0.5, ease: 'power2.inOut' })
			this.later(0.5, () => group.flatten(0.5))
		} else {
			this.pieces.forEach((p) => p.setEdgeAlpha(0))
		}

		const { width, height } = this.scene.app.screen
		this.later(0.5, () => {
			for (let i = 0; i < 5; i++)
				this.later(i * 0.12, () =>
					this.sparkle(width * (0.2 + Math.random() * 0.6), height * (0.15 + Math.random() * 0.5))
				)
		})
		this.later(1.4, () => this.option.endGame())
	}

	// ─── Состояние наружу ──────────────────────────────────────────────────

	private setPhase(phase: GamePhase) {
		this.phase = phase
		document.body.dataset.phase = phase
		this.option.onPhase?.(phase)
		this.emitState()
	}

	private emitState() {
		// «Собрано» — куски, которые уже с кем-то склеены или стоят в рамке.
		// Одинокий кусок на столе ещё не собран.
		const placed = this.pieces.filter(
			(p) => p.place === 'board' || (p.group !== null && p.group.size > 1)
		).length
		this.option.onState?.({
			total: this.pieces.length,
			placed,
			bench: this.groups.length,
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
	 * Ручки для скрипта съёмки экранов и теста жестов: сразу собрать долю
	 * кусков, заполнить стол, узнать, где что лежит. В игре не используются.
	 */
	debug() {
		/** Кусок из лотка — на стол одиночной группой в точку p, без поворота. */
		const place = (piece: Piece, p: IPoint) => {
			this.tray.take(piece, this.top)
			piece.rot = 0
			const group = new Group(piece)
			this.top.addChild(group.view)
			group.view.position.set(p.x, p.y)
			group.view.scale.set(this.scale)
			group.draw(1 / this.scale)
			return group
		}
		return {
			targets: () => ({
				scale: this.scale,
				pieces: this.pieces.map((p) => {
					const at = p.group ? p.group.pointAt(p.shape.center) : p.view.getGlobalPosition()
					const to = this.toScreen(p.shape.center)
					return {
						i: p.index,
						place: p.place,
						rot: p.group ? p.group.rot : p.rot,
						size: p.group ? p.group.size : 0,
						x: at.x,
						y: at.y,
						tx: to.x,
						ty: to.y,
						cx: p.shape.center.x,
						cy: p.shape.center.y,
						r: p.shape.radius,
						// Картинка куска там, где её место в группе, без остаточного сдвига,
						// масштаба и поворота — иначе она «отстала» от контура.
						intact: !p.group || (() => {
							const v = p.view.getGlobalPosition()
							return Math.hypot(v.x - at.x, v.y - at.y) < 0.5 && p.view.scale.x === 1 && p.view.rotation === 0
						})(),
						near: [...this.adjacent[p.index]],
					}
				}),
			}),
			/** Собрать долю кусков в одну группу прямо в рамке (на лёгкой — защёлкнуть). */
			solve: (fraction: number) => {
				// Сколько кусков достать из лотка — считаем сразу: на лёгкой кусок
				// защёлкивается анимацией, и счётчик «собрано» догоняет с опозданием.
				const count = Math.ceil(this.pieces.length * fraction) -
					this.pieces.filter((p) => p.place !== 'tray').length
				const taken: Piece[] = []
				for (let n = 0; n < count; n++) {
					const inTray = this.pieces.filter((p) => p.place === 'tray')
					if (!inTray.length) break
					// Берём соседа уже взятого — чтобы группа росла связно.
					const next =
						inTray.find((p) => taken.some((q) => this.adjacent[p.index].has(q.index))) ||
						inTray[0]
					taken.push(next)
					this.settle(place(next, this.toScreen(next.shape.center)), 'field', -1)
				}
				// Отложенное на стол тоже встаёт на своё место — и склеивается.
				for (const g of [...this.groups]) {
					if (!this.groups.includes(g)) continue
					g.rot = 0
					g.view.rotation = 0
					g.drawUnder()
					const at = this.toScreen(g.view.pivot)
					g.view.position.set(at.x, at.y)
					this.settle(g, 'field', -1)
				}
			},
			fillBench: () => {
				const { width: W } = this.scene.app.screen
				const spots = [0.2, 0.5, 0.8]
				const free = BENCH_LIMIT - this.groups.length
				this.pieces
					.filter((p) => p.place === 'tray')
					.slice(0, Math.max(0, free))
					.forEach((piece, i) => {
						const group = place(piece, { x: W * spots[i], y: this.tray.y - 70 - (i % 2) * 50 })
						this.toField(group)
					})
			},
		}
	}

	// ─── Уборка ────────────────────────────────────────────────────────────

	private clear() {
		this.tweens.forEach((t) => t.kill())
		this.tweens.clear()
		this.gesture = null
		this.groups.forEach((g) => {
			g.pieces = []
			g.destroy()
		})
		this.groups = []
		this.pieces.forEach((p) => p.destroy())
		this.pieces = []
		this.adjacent = []
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

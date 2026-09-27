import { Container, Graphics } from 'pixi.js'
import gsap from 'gsap'

import { Piece, THICKNESS, THICKNESS_EDGE, thicknessOffset } from './Piece'
import { IPoint } from './interfaces'

const EDGE = 0xffffff

/**
 * Склеенные куски, которые двигаются и вращаются как один.
 *
 * Внутри группы всё в координатах картинки: каждый кусок стоит в точке своего
 * центра, как в целой картинке. Поэтому склейка — это просто перенос кусков
 * из одной группы в другую без пересчёта: их взаимное положение уже верное.
 * На экран группу выводит масштаб поля, поворот — шагами по 90° вокруг pivot.
 *
 * Слоёв три: толщина всех кусков разом, сами куски и общий внешний контур.
 * Толщина отдельным слоем, иначе подложка одного куска легла бы на картинку
 * соседа; контур общий, чтобы группа читалась одним предметом, а швы внутри
 * только угадывались.
 */
export class Group {
	pieces: Piece[]
	view: Container
	rot: number
	/** Где группа лежит на поле — в координатах картинки, чтобы пережить смену размера. */
	fieldAt: IPoint

	private under: Graphics
	private body: Container
	private outline: Graphics
	private unit: number

	constructor(piece: Piece) {
		this.pieces = []
		this.rot = piece.rot
		this.fieldAt = { x: 0, y: 0 }
		this.unit = 1
		this.view = new Container()
		this.under = new Graphics()
		this.body = new Container()
		this.outline = new Graphics()
		this.view.addChild(this.under, this.body, this.outline)
		this.add([piece])
		this.view.pivot.set(piece.shape.center.x, piece.shape.center.y)
		this.view.rotation = (this.rot * Math.PI) / 2
	}

	get size() {
		return this.pieces.length
	}

	/** Центр группы в координатах картинки — вокруг него она вращается. */
	get center(): IPoint {
		const n = this.pieces.length
		return {
			x: this.pieces.reduce((s, p) => s + p.shape.center.x, 0) / n,
			y: this.pieces.reduce((s, p) => s + p.shape.center.y, 0) / n,
		}
	}

	/** Самая дальняя вершина от pivot — радиус группы при любом повороте. */
	get radius() {
		const c = this.view.pivot
		let r = 0
		for (const p of this.pieces)
			for (const v of p.shape.points) r = Math.max(r, Math.hypot(v.x - c.x, v.y - c.y))
		return r
	}

	private add(pieces: Piece[]) {
		for (const piece of pieces) {
			// Кусок мог прийти прямо из анимации лотка (возврат в ящик, поворот):
			// недоигранная анимация продолжила бы двигать и сжимать картинку уже
			// внутри группы, и она отстала бы от своего контура.
			piece.stopTweens()
			this.pieces.push(piece)
			piece.group = this
			piece.place = 'group'
			piece.rot = 0
			piece.setRaised(false)
			piece.view.rotation = 0
			piece.view.scale.set(1)
			piece.view.position.set(piece.shape.center.x, piece.shape.center.y)
			this.body.addChild(piece.view)
		}
	}

	/**
	 * Забирает куски другой группы. Экранное положение этой группы не
	 * меняется: pivot переезжает в новый центр, а позиция сдвигается ровно
	 * настолько, чтобы картинка осталась на месте.
	 */
	absorb(other: Group) {
		this.add(other.pieces)
		other.pieces = []
		other.destroy()
		this.recenter()
		this.draw(this.unit)
	}

	/** pivot в центр кусков без сдвига на экране. */
	recenter() {
		const c = this.center
		const parent = this.view.parent
		if (parent) {
			const at = parent.toLocal(this.view.toGlobal(c))
			this.view.pivot.set(c.x, c.y)
			this.view.position.set(at.x, at.y)
		} else this.view.pivot.set(c.x, c.y)
	}

	/** Экранная точка (в координатах родителя) для точки картинки. */
	pointAt(p: IPoint) {
		return this.view.parent
			? this.view.parent.toLocal(this.view.toGlobal(p))
			: { x: p.x, y: p.y }
	}

	draw(unit: number) {
		this.unit = unit
		this.drawUnder()
		// Внешний контур — рёбра, которых нет у соседа по группе. У соседних
		// ячеек Вороного общие вершины совпадают до бита, поэтому ключ точный.
		const key = (a: IPoint, b: IPoint) => `${a.x},${a.y}|${b.x},${b.y}`
		const inner = new Set<string>()
		for (const p of this.pieces) {
			const pts = p.shape.points
			for (let i = 0; i < pts.length; i++) inner.add(key(pts[i], pts[(i + 1) % pts.length]))
		}
		this.outline.clear()
		for (const p of this.pieces) {
			const pts = p.shape.points
			for (let i = 0; i < pts.length; i++) {
				const a = pts[i]
				const b = pts[(i + 1) % pts.length]
				if (inner.has(key(b, a))) continue
				this.outline.moveTo(a.x, a.y).lineTo(b.x, b.y)
			}
			// Швы внутри группы остаются едва заметными — видно, что собрано.
			p.setEdgeAlpha(this.pieces.length > 1 ? 0.3 : 0)
		}
		this.outline.stroke({ width: 2.5 * unit, color: EDGE, alpha: 0.95, cap: 'round', join: 'round' })
	}

	/** Толщина — вниз по экрану, поэтому зависит от поворота. */
	drawUnder() {
		const off = thicknessOffset(this.rot, 5 * this.unit)
		this.under.clear()
		for (const p of this.pieces)
			this.under.poly(p.shape.points.map((v) => ({ x: v.x + off.x, y: v.y + off.y })))
		this.under
			.fill({ color: THICKNESS, alpha: 0.9 })
			.stroke({ width: 1.5 * this.unit, color: THICKNESS_EDGE, alpha: 0.6 })
	}

	/** Прячет объём и контур — для финала, когда картинка сливается в одну. */
	flatten(duration: number) {
		gsap.to([this.under, this.outline], { alpha: 0, duration })
		this.pieces.forEach((p) => p.setEdgeAlpha(0))
	}

	destroy() {
		gsap.killTweensOf([this.view, this.view.position, this.view.scale, this.under, this.outline])
		// Куски группе не принадлежат: либо уже переехали, либо их уничтожит игра.
		this.body.removeChildren()
		this.view.destroy({ children: true })
	}
}

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import gsap from 'gsap'

import { IPieceShape } from './shatter'

export type PiecePlace = 'tray' | 'bench' | 'board' | 'drag' | 'fly'

// Толщина стекла под куском — даёт тот «плиточный» объём, что в Tile Club:
// взятый в руку кусок стоит выше остальных. Цвет — холодное стекло, не чёрная
// тень: на светлом фоне тёмная подложка выглядела бы дыркой.
const EDGE = 0xffffff
const THICKNESS = 0x8fc4dc

/**
 * Один осколок: вырезанный из картинки многоугольник со светлой кромкой.
 *
 * Начало координат контейнера — центр масс осколка, поэтому поворот идёт
 * вокруг него, а «правильное место» — это просто совпадение центра с
 * shape.center при нулевом повороте. Внутри всё в пикселях картинки;
 * на экран кусок выводится масштабом контейнера.
 */
export class Piece {
	index: number
	shape: IPieceShape
	view: Container
	place: PiecePlace
	/** Поворот шагами по 90°. */
	rot: number
	/** Где лежит кусок на поле, пока он не на месте, — в координатах картинки. */
	benchAt: { x: number; y: number }

	private thickness: Graphics
	private edge: Graphics
	private local: { x: number; y: number }[]

	constructor(shape: IPieceShape, texture: Texture, index: number) {
		this.index = index
		this.shape = shape
		// Пока картинка не разбита, кусок нигде: на месте он считается только
		// после того, как игрок его туда поставил.
		this.place = 'fly'
		this.rot = 0
		this.benchAt = { x: shape.center.x, y: shape.center.y }
		this.local = shape.points.map((p) => ({
			x: p.x - shape.center.x,
			y: p.y - shape.center.y,
		}))

		this.view = new Container()
		this.view.eventMode = 'static'
		this.view.cursor = 'pointer'
		this.view.position.set(shape.center.x, shape.center.y)

		this.thickness = new Graphics()
		this.thickness.alpha = 0
		this.view.addChild(this.thickness)

		// Кусок получает свой кадр текстуры по габариту многоугольника, а не всю
		// картинку под маской: так в лотке уменьшается маленький спрайт.
		const xs = shape.points.map((p) => p.x)
		const ys = shape.points.map((p) => p.y)
		const x0 = Math.max(0, Math.floor(Math.min(...xs)))
		const y0 = Math.max(0, Math.floor(Math.min(...ys)))
		const x1 = Math.min(texture.width, Math.ceil(Math.max(...xs)))
		const y1 = Math.min(texture.height, Math.ceil(Math.max(...ys)))
		const frame = new Rectangle(
			texture.frame.x + x0,
			texture.frame.y + y0,
			Math.max(1, x1 - x0),
			Math.max(1, y1 - y0)
		)
		const sprite = new Sprite(new Texture({ source: texture.source, frame }))
		sprite.position.set(x0 - shape.center.x, y0 - shape.center.y)

		const mask = new Graphics().poly(this.local).fill(0xffffff)
		sprite.mask = mask
		this.view.addChild(sprite, mask)

		this.edge = new Graphics()
		this.view.addChild(this.edge)
		this.view.hitArea = {
			contains: (x: number, y: number) => this.contains(x, y),
		}
	}

	/**
	 * Перерисовка кромки под текущий масштаб поля. unit — сколько пикселей
	 * картинки приходится на один экранный пиксель на поле.
	 */
	draw(unit: number) {
		const lift = 5 * unit
		this.thickness
			.clear()
			.poly(this.local.map((p) => ({ x: p.x, y: p.y + lift })))
			.fill({ color: THICKNESS, alpha: 0.9 })
			.stroke({ width: 1.5 * unit, color: 0x6aa8c4, alpha: 0.6 })
		this.edge
			.clear()
			.poly(this.local)
			.stroke({ width: 2.5 * unit, color: EDGE, alpha: 0.95, join: 'round' })
	}

	/** Поднят ли кусок над полем (в лотке, в руке, отложен) или уже лежит на месте. */
	setRaised(raised: boolean) {
		this.thickness.alpha = raised ? 1 : 0
	}

	setEdgeAlpha(alpha: number) {
		this.edge.alpha = alpha
	}

	get edgeGraphics() {
		return this.edge
	}

	/** Попадание в сам многоугольник, а не в габарит: соседние куски не перехватывают касание. */
	contains(x: number, y: number) {
		// Чуть расширяем фигуру к центру — пальцу нужен запас на кромке.
		const grow = 1.15
		let inside = false
		const pts = this.local
		for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
			const xi = pts[i].x * grow
			const yi = pts[i].y * grow
			const xj = pts[j].x * grow
			const yj = pts[j].y * grow
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
				inside = !inside
		}
		return inside
	}

	destroy() {
		gsap.killTweensOf([this.view, this.view.position, this.view.scale, this.edge])
		this.view.destroy({ children: true })
	}
}

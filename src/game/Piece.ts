import { Container, Graphics, Matrix, Texture } from 'pixi.js'
import gsap from 'gsap'

import { IPieceShape } from './shatter'

import type { Group } from './Group'

/**
 * tray — в ящике; group — на поле в составе группы (одиночный кусок — тоже
 * группа); board — защёлкнут в рамке (только на лёгкой); fly — в полёте.
 */
export type PiecePlace = 'tray' | 'group' | 'board' | 'fly'

// Толщина стекла под куском — даёт тот «плиточный» объём, что в Tile Club:
// взятый в руку кусок стоит выше остальных. Цвет — холодное стекло, не чёрная
// тень: на светлом фоне тёмная подложка выглядела бы дыркой.
const EDGE = 0xffffff
export const THICKNESS = 0x8fc4dc
export const THICKNESS_EDGE = 0x6aa8c4

/** Сдвиг «вниз по экрану» в системе координат, повёрнутой на rot шагов по 90°. */
export function thicknessOffset(rot: number, lift: number) {
	const a = (-rot * Math.PI) / 2
	return { x: -Math.sin(a) * lift, y: Math.cos(a) * lift }
}

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
	/** Группа, в которой кусок лежит на поле. */
	group: Group | null

	private thickness: Graphics
	private edge: Graphics
	private unit: number
	/** Вершины относительно центра куска. */
	readonly local: { x: number; y: number }[]

	constructor(shape: IPieceShape, texture: Texture, index: number) {
		this.index = index
		this.unit = 1
		this.shape = shape
		// Пока картинка не разбита, кусок нигде: на месте он считается только
		// после того, как игрок его туда поставил.
		this.place = 'fly'
		this.rot = 0
		this.group = null
		this.local = shape.points.map((p) => ({
			x: p.x - shape.center.x,
			y: p.y - shape.center.y,
		}))

		this.view = new Container()
		// Попадание считает игра (Game.pick), встроенная проверка Pixi не нужна.
		this.view.eventMode = 'none'
		this.view.position.set(shape.center.x, shape.center.y)

		this.thickness = new Graphics()
		this.thickness.visible = false
		this.view.addChild(this.thickness)

		// Картинка — заливка самого многоугольника текстурой, без маски. С маской
		// (спрайт-прямоугольник, обрезанный многоугольником) на части устройств
		// обрезка не срабатывала: кусок показывал весь свой прямоугольник, да ещё
		// со сдвигом. Матрица переводит точку куска в пиксель картинки: точка
		// (x, y) относительно центра — это пиксель (x + cx, y + cy).
		const body = new Graphics().poly(this.local).fill({
			texture,
			textureSpace: 'global',
			matrix: new Matrix().translate(-shape.center.x, -shape.center.y),
		})
		this.view.addChild(body)

		this.edge = new Graphics()
		this.view.addChild(this.edge)
	}

	/**
	 * Перерисовка кромки под текущий масштаб поля. unit — сколько пикселей
	 * картинки приходится на один экранный пиксель на поле.
	 */
	draw(unit: number) {
		this.unit = unit
		this.edge
			.clear()
			.poly(this.local)
			.stroke({ width: 2.5 * unit, color: EDGE, alpha: 0.95, join: 'round' })
		this.drawThickness()
	}

	/**
	 * Толщина рисуется вниз по экрану при любом повороте: сдвиг задаётся в
	 * системе куска, поэтому его разворачиваем обратно на угол поворота.
	 */
	drawThickness() {
		const off = thicknessOffset(this.rot, 5 * this.unit)
		this.thickness
			.clear()
			.poly(this.local.map((p) => ({ x: p.x + off.x, y: p.y + off.y })))
			.fill({ color: THICKNESS, alpha: 0.9 })
			.stroke({ width: 1.5 * this.unit, color: THICKNESS_EDGE, alpha: 0.6 })
	}

	/**
	 * Своя толщина нужна куску только в одиночку — в лотке и в полёте. В группе
	 * толщину рисует группа: иначе подложка одного куска легла бы поверх
	 * картинки соседа.
	 */
	setRaised(raised: boolean) {
		this.thickness.visible = raised
	}

	setEdgeAlpha(alpha: number) {
		this.edge.alpha = alpha
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

	/** Остановить все анимации куска — перед тем как у него сменится хозяин. */
	stopTweens() {
		gsap.killTweensOf([this.view, this.view.position, this.view.scale])
	}

	destroy() {
		gsap.killTweensOf([this.view, this.view.position, this.view.scale, this.edge])
		this.view.destroy({ children: true })
	}
}

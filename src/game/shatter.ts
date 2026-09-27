import { Delaunay } from 'd3-delaunay'

import { IPoint } from './interfaces'

export interface IPieceShape {
	/** Вершины многоугольника в координатах картинки, по кругу. */
	points: IPoint[]
	/** Центр масс — точка, вокруг которой кусок вращается и ставится на место. */
	center: IPoint
	area: number
	/** Самая дальняя вершина от центра: радиус круга, в который кусок влезает при любом повороте. */
	radius: number
}

/** Сколько кусков на каждой сложности. */
export const PIECE_COUNT = {
	easy: 12,
	medium: 20,
	hard: 30,
}

// Раньше картинку резали триангуляцией Делоне по дрожащей сетке, и площадь
// треугольников гуляла в десятки раз: рядом с краем выходили иглы, в середине —
// куски в пол-экрана. Теперь это ячейки Вороного, выровненные релаксацией
// Ллойда: каждая ячейка тянется к своему центру масс, и площади сходятся.
// Двух итераций хватает, чтобы убрать и крошки, и гиганты, но форма ещё не
// превращается в правильные соты — осколки остаются осколками.
const RELAX_STEPS = 2
// Сколько разбиений пробовать и оставить самое ровное.
const ATTEMPTS = 6

export function polygonArea(points: IPoint[]) {
	let sum = 0
	for (let i = 0; i < points.length; i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		sum += a.x * b.y - b.x * a.y
	}
	return Math.abs(sum) / 2
}

export function polygonCentroid(points: IPoint[]): IPoint {
	let cx = 0
	let cy = 0
	let sum = 0
	for (let i = 0; i < points.length; i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		const cross = a.x * b.y - b.x * a.y
		sum += cross
		cx += (a.x + b.x) * cross
		cy += (a.y + b.y) * cross
	}
	if (Math.abs(sum) < 1e-9) return points[0]
	return { x: cx / (3 * sum), y: cy / (3 * sum) }
}

function cells(seeds: IPoint[], width: number, height: number) {
	const voronoi = Delaunay.from(seeds.map((p) => [p.x, p.y])).voronoi([
		0,
		0,
		width,
		height,
	])
	return seeds.map((_, i) => {
		const ring = voronoi.cellPolygon(i) || []
		const points: IPoint[] = []
		// d3 замыкает кольцо повтором первой вершины — убираем его. Короткие рёбра
		// не трогаем: соседняя ячейка держит ту же вершину, и склейка дала бы щель.
		for (const [x, y] of ring) {
			const last = points[points.length - 1]
			if (last && Math.hypot(last.x - x, last.y - y) < 1e-6) continue
			points.push({ x, y })
		}
		const first = points[0]
		const last = points[points.length - 1]
		if (points.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-6)
			points.pop()
		return points
	})
}

function attempt(count: number, width: number, height: number): IPieceShape[] {
	const cols = Math.max(2, Math.round(Math.sqrt((count * width) / height)))
	const rows = Math.max(2, Math.round(count / cols))
	const cw = width / cols
	const ch = height / rows

	let seeds: IPoint[] = []
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			seeds.push({
				x: (c + 0.5 + (Math.random() - 0.5) * 0.8) * cw,
				y: (r + 0.5 + (Math.random() - 0.5) * 0.8) * ch,
			})
		}
	}

	let polygons = cells(seeds, width, height)
	for (let step = 0; step < RELAX_STEPS; step++) {
		seeds = polygons.map((p) => polygonCentroid(p))
		polygons = cells(seeds, width, height)
	}

	return polygons.map((points) => {
		const center = polygonCentroid(points)
		return {
			points,
			center,
			area: polygonArea(points),
			radius: Math.max(
				...points.map((p) => Math.hypot(p.x - center.x, p.y - center.y))
			),
		}
	})
}

/** Отношение самого большого куска к самому маленькому. */
export function spread(pieces: IPieceShape[]) {
	const areas = pieces.map((p) => p.area)
	return Math.max(...areas) / Math.min(...areas)
}

/** Режет прямоугольник width x height на count примерно равных выпуклых осколков. */
export function shatter(count: number, width: number, height: number) {
	let best: IPieceShape[] = []
	let bestSpread = Infinity
	for (let i = 0; i < ATTEMPTS; i++) {
		const pieces = attempt(count, width, height)
		if (pieces.some((p) => p.points.length < 3)) continue
		const s = spread(pieces)
		if (s < bestSpread) {
			best = pieces
			bestSpread = s
		}
	}
	return best
}

/**
 * Кто с кем граничит по стороне. У соседних ячеек Вороного общие вершины
 * совпадают до бита, так что две общие вершины — это общая сторона. Одной
 * мало: куски, сошедшиеся углом, соседями не считаются, их не склеить.
 */
export function neighbors(pieces: IPieceShape[]) {
	const owners = new Map<string, number[]>()
	pieces.forEach((piece, i) => {
		for (const p of piece.points) {
			const key = `${p.x},${p.y}`
			const list = owners.get(key)
			if (list) list.push(i)
			else owners.set(key, [i])
		}
	})
	const shared = pieces.map(() => new Map<number, number>())
	for (const list of owners.values())
		for (const a of list)
			for (const b of list) if (a !== b) shared[a].set(b, (shared[a].get(b) || 0) + 1)
	return shared.map((m) => new Set([...m].filter(([, n]) => n >= 2).map(([j]) => j)))
}

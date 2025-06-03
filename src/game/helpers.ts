import { IPoint } from './interfaces'

export const MS_HOUR = 60 * 60 * 10
export const MS_MIN = 60 * 10
export const MS_SEC = 10
export const rotations: number[] = [0, Math.PI / 2, Math.PI, Math.PI / -2]

export function setTimerValue(time: number) {
	let reminder = time
	const h = Math.floor(time / MS_HOUR)
	reminder = reminder % MS_HOUR
	const m = Math.floor(reminder / MS_MIN)
	reminder = reminder % MS_MIN
	const s = Math.floor(reminder / MS_SEC)
	const ms = reminder % MS_SEC

	return `${h ? `${addZero(h)}:` : ''}${m ? `${addZero(m)}:` : ''}${addZero(
		s
	)}:${addZero(ms)}`
}

export function addZero(num: number) {
	if (!num) return `00`
	else if (num < 10) return `0${num}`
	else return num
}

export function lerpPoint(a: IPoint, b: IPoint, range: number) {
	let t = Math.random() * (0.5 + range - (0.5 - range)) + (0.5 - range)
	return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

export function clockWithSort(points: IPoint[]) {
	const center = {
		x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
		y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
	}
	points.sort((a, b) => {
		const angleA = Math.atan2(a.y - center.y, a.x - center.x)
		const angleB = Math.atan2(b.y - center.y, b.x - center.x)
		return angleB - angleA
	})
	return points
}

export function getEdges(points: IPoint[]) {
	const edges: [IPoint, IPoint][] = []
	for (let i = 0; i < points.length; i++) {
		if (i === points.length - 1) {
			edges.push([points[i], points[0]])
		} else {
			edges.push([points[i], points[i + 1]])
		}
	}
	return edges
}

export function checkPoints(points1: IPoint, points2: IPoint) {
	return points1.x === points2.x && points1.y === points2.y
}

export function checkEdges(edge1: [IPoint, IPoint], edge2: [IPoint, IPoint]) {
	return (
		(checkApproximatelyPoints(edge1[0], edge2[0], 0.1) &&
			checkApproximatelyPoints(edge1[1], edge2[1], 0.1)) ||
		(checkApproximatelyPoints(edge1[0], edge2[1], 0.1) &&
			checkApproximatelyPoints(edge1[1], edge2[0], 0.1))
	)
}

export function getTranslatedPoints(
	points: IPoint[],
	center: { x: number; y: number }
) {
	return points.map((point) => {
		return {
			x: point.x + center.x,
			y: point.y + center.y,
		}
	})
}

export function getRotatedPoints(
	points: IPoint[],
	center: { x: number; y: number },
	angle: number
) {
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)

	return points.map((point) => {
		const dx = point.x - center.x
		const dy = point.y - center.y

		return {
			x: center.x + dx * cos - dy * sin,
			y: center.y + dx * sin + dy * cos,
		}
	})
}

export function getTranslatedAndRotatedPoints(
	points: IPoint[],
	offset: { x: number; y: number },
	center: { x: number; y: number },
	angle: number
) {
	return getTranslatedPoints(getRotatedPoints(points, center, angle), offset)
}

export function checkApproximatelyPoints(
	points1: IPoint,
	points2: IPoint,
	tolerance: number
) {
	return (
		Math.abs(points1.x - points2.x) < tolerance &&
		Math.abs(points1.y - points2.y) < tolerance
	)
}

export function getCenterOfTriangle(points: IPoint[]) {
	const center = {
		x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
		y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
	}
	return center
}

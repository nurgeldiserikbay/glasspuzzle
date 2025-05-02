import { IPoint } from "./interfaces"

export const MS_HOUR = 60 * 60 * 10
export const MS_MIN = 60 * 10
export const MS_SEC = 10

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

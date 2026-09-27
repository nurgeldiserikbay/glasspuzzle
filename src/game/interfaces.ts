import Scene from './Scene'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** intro — картинка целая и разбивается; play — можно собирать; done — собрано. */
export type GamePhase = 'idle' | 'intro' | 'play' | 'done'

export interface IGameState {
	total: number
	placed: number
	/** Сколько групп лежит на столе (одиночный кусок — тоже группа). */
	bench: number
	benchLimit: number
	/** Вращаются ли куски на этой сложности — от этого зависит подсказка. */
	rotate: boolean
	/** Верх лотка в пикселях холста — над ним страница ставит плашку «стол». */
	trayTop: number
}

export interface IControlOpt {
	endGame: () => void
	onState?: (state: IGameState) => void
	onPhase?: (phase: GamePhase) => void
	/** Попытка отложить четвёртый кусок: он вернулся в лоток. */
	onBenchFull?: () => void
}

export interface IGameOpt {
	scene: Scene
	option: IControlOpt
}

export interface IGameControllerOpt {
	canvas: HTMLCanvasElement
	option: IControlOpt
}

export interface ISceneOpt {
	canvas: HTMLCanvasElement
}

export interface ITicker {
	deltaMS: number
	lastTime: number
}

export interface IPoint {
	x: number
	y: number
}

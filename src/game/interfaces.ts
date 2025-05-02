import { Container } from 'pixi.js'

import Scene from './Scene'

export interface IPixiContainer extends Container {
	anchor: {
		set: (x: number, y: number) => void
	}
}

// Game and Builder
export interface IControlOpt {
	endGame: () => void
}

export interface IGameOpt {
	scene: Scene
	option: IControlOpt
}

// GameController
export interface IGameControllerOpt {
	canvas: HTMLCanvasElement
	option: IControlOpt
}

// Scene
export interface ISceneOpt {
	canvas: HTMLCanvasElement
}

//Commons
export interface ITicker {
	deltaMS: number
	lastTime: number
}

export interface IAssetsSrc {
	alias: string
	loader: string
	src: string
}

export interface IPoint {
	x: number
	y: number
}

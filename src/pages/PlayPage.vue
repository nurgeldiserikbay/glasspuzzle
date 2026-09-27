<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

import BackLink from '@/components/BackLink.vue'
import ResultTable from '@/components/ResultTable.vue'
import AdSlot from '@/components/AdSlot.vue'
import OtherGames from '@/components/OtherGames.vue'
import UiIcon from '@/components/UiIcon.vue'

import LEVELS from '@/game/levels'

import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import Admob from '@/utils/admob'
import { GameController } from '@/game/index'
import { setTimerValue } from '@/game/helpers'
import type { GamePhase, IGameState } from '@/game/interfaces'

const pageStore = usePageStore()
const gameStore = useGameStore()

let timer: ReturnType<typeof setInterval> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null
const isWin = ref<boolean>(false)
const isOtherGames = ref(false)

let gameController: GameController | null = null
const canvas = ref<HTMLCanvasElement>()

const phase = ref<GamePhase>('idle')
const state = ref<IGameState>({
	total: 0,
	placed: 0,
	bench: 0,
	benchLimit: 3,
	rotate: false,
	trayTop: 0,
})
/** Короткая подсказка над лотком: как вращать или почему кусок вернулся. */
const hint = ref('')
const benchShake = ref(false)

const time = ref(0)
const getTime = computed(() => setTimerValue(time.value))
const getLevel = computed(() => LEVELS[gameStore.currentLevel])
const hasNext = computed(() => gameStore.currentLevel < LEVELS.length - 1)

onMounted(async () => {
	start()
	document.addEventListener('visibilitychange', handleVisibilityChange)
	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	clearTimer()
	if (hintTimer) clearTimeout(hintTimer)
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
	window.removeEventListener('glass:debug', onDebug)
	gameController?.destroy()
	gameController = null
})

function handleVisibilityChange() {
	if (document.hidden) clearTimer()
	else if (phase.value === 'play') setTimer()
}

function showHint(text: string, ms = 2600) {
	hint.value = text
	if (hintTimer) clearTimeout(hintTimer)
	hintTimer = setTimeout(() => (hint.value = ''), ms)
}

async function start() {
	if (!canvas.value) return
	const controller = new GameController({
		canvas: canvas.value,
		option: {
			endGame: () => {
				isWin.value = true
				clearTimer()
				gameStore.updateGameStat(
					getLevel.value.id,
					new Date().toString(),
					getTime.value
				)

				// Уровень пройден, экран итога уже показан — естественная пауза.
				// Раньше показ висел на кнопке перехода: объявление выходило в момент
				// начала следующего уровня, и сам уровень ждал его закрытия. Частоту
				// (каждый 3-й переход) по-прежнему считает рекламный модуль.
				if (Capacitor.getPlatform() === 'android') {
					void Admob.interstitial()
				}
			},
			onState: (s) => (state.value = s),
			onPhase: (p) => {
				phase.value = p
				// Секундомер идёт только пока можно собирать: разбивание картинки
				// в счёт времени не входит.
				if (p === 'play') {
					setTimer()
					// Сначала — как собирать, потом — как вращать, если вращать нужно.
					showHint('Join pieces that fit together')
					if (state.value.rotate)
						hintTimer = setTimeout(() => showHint('Tap a piece to turn it'), 2800)
				} else clearTimer()
			},
			onBenchFull: () => {
				benchShake.value = false
				requestAnimationFrame(() => (benchShake.value = true))
				showHint('Table is full: join pieces first')
			},
		},
	})
	gameController = controller
	await controller.init()
	// Хук для скрипта съёмки экранов (_docs/design/make-design-shots.mjs).
	// Через событие DOM, а не глобальную переменную: браузер скрипта исполняет
	// свой код в изолированном мире и переменных страницы не видит.
	if (import.meta.env.VITE_APP_MODE !== 'PROD')
		window.addEventListener('glass:debug', onDebug)
	startLevel()
}

function onDebug(e: Event) {
	// Строкой JSON: объект из изолированного мира до страницы не доходит.
	const { cmd, arg } = JSON.parse((e as CustomEvent).detail || '{}')
	const tools = gameController?.debug()
	if (cmd === 'solve') tools?.solve(arg)
	if (cmd === 'fillBench') tools?.fillBench()
	if (cmd === 'targets')
		document.body.dataset.debug = JSON.stringify(tools?.targets() || [])
}

function startLevel() {
	if (!gameController) return
	isWin.value = false
	time.value = 0
	hint.value = ''
	gameController.start({
		img: getLevel.value.src,
		difficulty: gameStore.difficulty,
	})
}

function nextLevel() {
	// Никакой рекламы на этом пути: переход на следующий уровень запускает игрок.
	// Показ перенесён на завершение уровня (см. option.endGame).
	if (!hasNext.value) return
	gameStore.currentLevel++
	startLevel()
}

function peek(on: boolean) {
	gameController?.peek(on)
}

function setTimer() {
	clearTimer()
	timer = setInterval(() => {
		time.value += 1
	}, 100)
}

function clearTimer() {
	if (timer) clearInterval(timer)
	timer = null
}
</script>

<template>
	<div class="page play-page">
		<div class="play-page__head">
			<BackLink />
			<div class="pill pill--progress">
				<UiIcon name="shard" />
				<span>{{ state.placed }} / {{ state.total }}</span>
			</div>
			<div class="pill pill--time">
				<UiIcon name="clock" />
				<span>{{ getTime }}</span>
			</div>
			<button
				class="peek"
				aria-label="Peek at the picture"
				:disabled="phase !== 'play'"
				@pointerdown="peek(true)"
				@pointerup="peek(false)"
				@pointerleave="peek(false)"
				@pointercancel="peek(false)"
			>
				<UiIcon name="eye" />
			</button>
		</div>

		<div class="play-page__stage">
			<canvas id="canvas" ref="canvas" />

			<!-- «Стол»: сколько кусков сейчас отложено на поле не на своём месте. -->
			<div
				v-show="phase === 'play' && state.trayTop"
				class="bench"
				:class="{ 'bench--shake': benchShake, 'bench--full': state.bench >= state.benchLimit }"
				:style="{ top: `${state.trayTop - 30}px` }"
				@animationend="benchShake = false"
			>
				<span class="bench__label">Table</span>
				<i
					v-for="n in state.benchLimit"
					:key="n"
					class="bench__slot"
					:class="{ 'bench__slot--used': n <= state.bench }"
				/>
			</div>

			<Transition name="hint">
				<div
					v-if="hint"
					class="hint"
					:style="{ top: `${state.trayTop - 74}px` }"
				>
					<UiIcon v-if="hint.startsWith('Tap')" name="rotate" />
					<span>{{ hint }}</span>
				</div>
			</Transition>
		</div>

		<ResultTable
			v-if="isWin"
			:img="getLevel.src"
			:time="getTime"
			:has-next="hasNext"
			@next="nextLevel"
			@close="pageStore.toBackLink(PAGES.START)"
		/>

		<AdSlot :interactive="isWin" @open="isOtherGames = true" />

		<OtherGames v-if="isOtherGames" @close="isOtherGames = false" />
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.play-page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	/* Окно в сад — нарочно тише стартового фона, чтобы куски на столе читались. */
	/* Светлая вуаль поверх фона — куски на столе должны читаться лучше сада. */
	background:
		linear-gradient(rgba(255, 250, 240, 0.3), rgba(255, 250, 240, 0.3)),
		url('@/assets/design/bg-play.webp') center bottom / cover no-repeat,
		var(--sky-bottom);
	/*
	   Низ отдан рекламной зоне: в ней либо баннер, либо кросс-промо, но пустой
	   она не бывает. Высоту диктует само объявление (--ad-band), а 12px —
	   обычный зазор, такой же как по бокам.
	*/
	padding: 12px 12px calc(var(--ad-band) + 12px);

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	/* Холст занимает всё между шапкой и рекламой — Pixi берёт размер отсюда. */
	&__stage {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
	}
}

#canvas {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
	touch-action: none;
}

.pill {
	@include chunky(var(--card), var(--card-edge), 4px);
	display: flex;
	align-items: center;
	gap: 6px;
	height: 40px;
	padding: 3px 12px 0;
	box-sizing: border-box;
	border-radius: 14px;
	font-size: 18px;
	letter-spacing: 1px;
	color: var(--ink);
	white-space: nowrap;

	&:active {
		transform: none;
		box-shadow: 0 4px 0 var(--card-edge);
	}

	.ui-icon {
		margin-top: -3px;
		color: var(--ink-soft);
	}

	&--progress {
		.ui-icon {
			color: var(--sky-deep);
		}
	}

	&--time {
		margin-left: auto;
		/* Цифры одинаковой ширины: таймер не дрожит на каждом тике. */
		font-variant-numeric: tabular-nums;
		min-width: 92px;
	}
}

.peek {
	@include gloss(var(--sun-light), var(--sun), var(--sun-deep));
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	padding: 0;
	border-radius: 14px;
	color: #fff;
	font-size: 26px;
	cursor: pointer;
	flex-shrink: 0;
	touch-action: none;
	user-select: none;
	-webkit-user-select: none;

	&:disabled {
		opacity: 0.5;
	}
}

.bench {
	@include chunky(var(--card), var(--card-edge), 3px);
	position: absolute;
	left: 14px;
	z-index: 20;
	display: flex;
	align-items: center;
	gap: 5px;
	height: 26px;
	padding: 2px 8px 0 10px;
	box-sizing: border-box;
	border-radius: 10px 10px 0 0;
	border-bottom: none;
	pointer-events: none;

	&__label {
		font-size: 13px;
		letter-spacing: 1px;
		color: var(--ink-soft);
		margin-right: 2px;
	}

	&__slot {
		width: 13px;
		height: 13px;
		margin-top: -2px;
		border-radius: 4px;
		border: 2px solid var(--card-edge);
		background: #fff;
		transition: background 0.15s;

		&--used {
			background: var(--sky);
			border-color: var(--sky-deep);
		}
	}

	&--full &__slot--used {
		background: var(--coral);
		border-color: var(--coral-deep);
	}

	&--shake {
		animation: shake 0.4s;
	}
}

.hint {
	position: absolute;
	left: 50%;
	z-index: 30;
	display: flex;
	align-items: center;
	gap: 8px;
	max-width: calc(100% - 28px);
	padding: 9px 14px 6px;
	box-sizing: border-box;
	border-radius: 14px;
	background: var(--ink);
	color: #fff;
	font-size: 15px;
	letter-spacing: 0.5px;
	white-space: nowrap;
	transform: translateX(-50%);
	pointer-events: none;

	.ui-icon {
		margin-top: -3px;
		font-size: 18px;
	}
}

.hint-enter-active,
.hint-leave-active {
	transition:
		opacity 0.2s,
		transform 0.2s;
}
.hint-enter-from,
.hint-leave-to {
	opacity: 0;
	transform: translate(-50%, 8px);
}

@keyframes shake {
	20%,
	60% {
		transform: translateX(-5px);
	}
	40%,
	80% {
		transform: translateX(5px);
	}
}
</style>

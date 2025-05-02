<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

import BackLink from '@/components/BackLink.vue'
import ResultTable from '@/components/ResultTable.vue'

import LEVELS from '@/game/levels'

import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'
import { useGameStore } from '@/store/gameStore'

import Admob from '@/utils/admob'
import { GameController } from '@/game/index'
import { setTimerValue } from '@/game/helpers'

const pageStore = usePageStore()
const adsStore = useAdsStore()
const gameStore = useGameStore()

let timers: { [key: string]: ReturnType<typeof setTimeout> } = {}
const isWin = ref<boolean>(false)

let gameController: GameController
const canvas = ref<HTMLCanvasElement>()

const time = ref(0)
const getTime = computed(() => setTimerValue(time.value))
const getLevel = computed(() => {
	return LEVELS[gameStore.currentLevel]
})

onMounted(async () => {
	start()
	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	clearTimers()
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

function calculateRatio(width: number, height: number) {
	if (!canvas.value) return 1
	const WH = canvas.value.clientHeight * 0.8
	const WW = canvas.value.clientWidth * 0.8

	if (WW / WH < width / height) return WW / width
	return WH / height
}

async function start() {
	if (canvas.value) {
		gameController = new GameController({
			canvas: canvas.value,
			option: {
				endGame: () => {
					isWin.value = true
					clearTimers()
					gameStore.updateGameStat(
						getLevel.value.id,
						new Date().toString(),
						getTime.value
					)
				},
			},
		})

		await gameController.init()

		const ratio = calculateRatio(getLevel.value.width, getLevel.value.height)
		const width = Math.floor(getLevel.value.width * ratio)
		const height = Math.floor(getLevel.value.height * ratio)

		gameController.start({
			img: getLevel.value.src,
			level: getLevel.value.id,
			width: width,
			height: height,
		})

		setTimer()
	}
}

function startLevel() {
	if (!canvas.value) return
	isWin.value = false
	time.value = 0

	const ratio = calculateRatio(getLevel.value.width, getLevel.value.height)
	const width = Math.floor(getLevel.value.width * ratio)
	const height = Math.floor(getLevel.value.height * ratio)

	gameController.restart({
		img: getLevel.value.src,
		level: getLevel.value.id,
		width: width,
		height: height,
	})
	setTimer()
}

function nextLevel() {
	if (Capacitor.getPlatform() === 'android') {
		if (adsStore.loading) return
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => {
				adsStore.toggleLoading(false)

				startLevel()
			},
		})
	} else {
		startLevel()
	}
}

function setTimer() {
	timers['timer'] = setInterval(() => {
		time.value += 1
	}, 100)
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
			<div class="page__info">
				<div class="info time">
					<span>{{ getTime }}</span>
				</div>
			</div>
		</div>

		<canvas id="canvas" ref="canvas" class="w-full" />

		<ResultTable
			v-if="isWin"
			@next="nextLevel"
			@close="pageStore.toBackLink(PAGES.START)"
		/>
	</div>
</template>

<style lang="scss" scoped>
.page {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 15px 15px 95px;

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		width: 100%;
		box-sizing: border-box;
		padding: 0 10px;
		margin-bottom: 10px;
	}

	&__info {
		width: 30%;
		padding: 2px 5px 2px 15px;
		box-sizing: border-box;
		flex-shrink: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 15px;
		color: #fff;
		font-size: 16px;
		letter-spacing: 2px;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(3px);
		border-radius: 5px;
	}
}

#canvas {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 10;
	width: 100%;
	height: 100dvh;
	box-sizing: border-box;
}
</style>

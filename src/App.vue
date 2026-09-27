<script lang="ts" setup>
import { onMounted } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { useAdsStore } from '@/store/adsStore'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { sound } from '@/utils/sound'

const adsStore = useAdsStore()
const pageStore = usePageStore()
const gameStore = useGameStore()

onMounted(async () => {
	// Звук можно включить только по касанию: первое касание создаёт аудио и,
	// если музыка не выключена, запускает её. Нажатие кнопки — тихий щелчок.
	document.addEventListener(
		'pointerdown',
		(e) => {
			sound.unlock()
			const target = e.target as HTMLElement | null
			if (target?.closest?.('button, .level')) sound.play('click')
		},
		{ capture: true }
	)

	// Load saved progress on every platform (web included), not just Android
	gameStore.loadData()

	if (Capacitor.getPlatform() === 'android') {
		// Подписку ставим до initialize(): первое событие баннера может прийти
		// раньше, чем страница успеет смонтироваться, и потеряться.
		Admob.onBannerChange((live, height) => adsStore.setBanner(live, height))

		void Admob.initialize().catch(() => {})
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()

		App.addListener('backButton', () => {
			App.exitApp()
		})
	}
})
</script>

<template>
	<component :is="pageStore.currentPageComponent" />
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: 100dvh;
}
</style>

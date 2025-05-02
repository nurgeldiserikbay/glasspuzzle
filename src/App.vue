<script lang="ts" setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import Admob from '@/utils/admob'

const pageStore = usePageStore()
const gameStore = useGameStore()

onMounted(async () => {
	if (Capacitor.getPlatform() === 'android') {
		Admob.initialize()
	}

	if (Capacitor.getPlatform() === 'android') {
		gameStore.loadData()
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()
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

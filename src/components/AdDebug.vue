<script lang="ts" setup>
/**
 * Диагностика рекламной полосы — только в сборке с VITE_AD_DEBUG=1, в выпуск
 * не попадает. Показывает поверх игры, из чего страница считает место под
 * баннер, что сообщает Android, и когда что происходило (мс от открытия
 * экрана). Нужна, чтобы по записи экрана с телефона понять, какое звено
 * опаздывает или врёт.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'

const t0 = performance.now()
const now = () => Math.round(performance.now() - t0)
const log = ref<string[]>([])
const vars = ref<string[]>([])
const add = (s: string) => {
	log.value = [...log.value.slice(-11), `${now()} ${s}`]
}

const probe = ref<HTMLElement>()
const inset = ref<HTMLElement>()
let timer: ReturnType<typeof setInterval> | undefined
let observer: MutationObserver | undefined
const handles: PluginListenerHandle[] = []
let last = ''

function read() {
	const root = document.documentElement
	const style = root.style
	const get = (n: string) => style.getPropertyValue(n) || '—'
	const stage = document.querySelector('.play-page__stage') as HTMLElement | null
	const lines = [
		`band ${probe.value?.getBoundingClientRect().height ?? '?'}  stage ${stage?.clientHeight ?? '?'}`,
		`native ${get('--ad-native-band')}  saved ${get('--ad-band-saved')}`,
		`slot ${get('--ad-slot')}  cap-inset ${get('--safe-area-inset-bottom')}`,
		`inset→ ${inset.value?.getBoundingClientRect().height ?? '?'}px`,
		`inner ${innerHeight}  screen ${screen.height}  vv ${Math.round(visualViewport?.height ?? 0)}  dpr ${devicePixelRatio}`,
	]
	vars.value = lines
	const key = lines.slice(0, 3).join('|')
	if (key !== last) {
		last = key
		add(lines[0] + ' ' + lines[1])
	}
}

onMounted(async () => {
	add('mount')
	read()
	timer = setInterval(read, 50)
	observer = new MutationObserver(read)
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
	for (const [name, ev] of [
		['Loaded', BannerAdPluginEvents.Loaded],
		['Failed', BannerAdPluginEvents.FailedToLoad],
		['Size', BannerAdPluginEvents.SizeChanged],
	] as const)
		handles.push(
			await AdMob.addListener(ev as any, (info: any) =>
				add(`${name} ${info && info.height !== undefined ? info.width + 'x' + info.height : ''}`)
			)
		)
})

onBeforeUnmount(() => {
	if (timer) clearInterval(timer)
	observer?.disconnect()
	handles.forEach((h) => h.remove())
})
</script>

<template>
	<div class="ad-debug">
		<div ref="probe" class="ad-debug__probe" />
		<div ref="inset" class="ad-debug__inset" />
		<div v-for="(v, i) in vars" :key="'v' + i">{{ v }}</div>
		<hr />
		<div v-for="(l, i) in log" :key="'l' + i">{{ l }}</div>
	</div>
</template>

<style scoped>
.ad-debug {
	position: fixed;
	top: 64px;
	left: 4px;
	right: 4px;
	z-index: 5000;
	padding: 4px 6px;
	background: rgba(0, 0, 0, 0.72);
	color: #7fff9f;
	font: 11px/1.3 monospace;
	pointer-events: none;
	white-space: pre;
	overflow: hidden;
}
.ad-debug hr {
	border: 0;
	border-top: 1px solid #555;
	margin: 3px 0;
}
.ad-debug__probe,
.ad-debug__inset {
	position: absolute;
	width: 0;
	visibility: hidden;
}
.ad-debug__probe {
	height: var(--ad-band);
}
.ad-debug__inset {
	height: var(--ad-inset, 0px);
}
</style>

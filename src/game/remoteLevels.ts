import { computed, ref } from 'vue'

import LEVELS from './levels'

/**
 * Новые уровни с хостинга — без выпуска приложения.
 *
 * Встроенные 68 картинок лежат в самом приложении. Список дополнительных —
 * `levels.json` на GitHub Pages (репозиторий glasspuzzle-levels). Когда есть
 * интернет, игра скачивает список и все новые картинки в фоне и складывает их
 * в Cache Storage — поэтому без сети потом играется всё, что уже скачано.
 *
 * В список уровней попадает только готовое: скачанная картинка. Уровни идут
 * подряд: номер следующего — сразу за последним встроенным (68, 69, …), а если
 * какой-то не скачался, следующие ждут его — номер уровня остаётся его местом
 * в списке, и прогресс по номерам не съезжает.
 *
 * Хостинг недоступен, файл битый, нет Cache Storage — остаются встроенные
 * уровни и то, что скачано раньше. Ошибок игрок не видит.
 */

export interface ILevel {
	id: number
	src: string
	width: number
	height: number
}

/** Адрес списка; для проверки на своём сервере — VITE_LEVELS_URL при сборке. */
export const LEVELS_URL: string =
	import.meta.env.VITE_LEVELS_URL || 'https://nurgeldiserikbay.github.io/glasspuzzle-levels/levels.json'

const CACHE = 'glass-levels-v1'
/** Последний полученный список — чтобы без сети знать, что лежит в кэше. */
const LIST_KEY = 'glass.remoteLevels'

/** Скачанные уровни, готовые к игре; src — адрес картинки в памяти (blob:). */
const remote = ref<ILevel[]>([])

/** Все уровни: встроенные и скачанные. Номер уровня = его место в списке. */
export const allLevels = computed<ILevel[]>(() => [...LEVELS, ...remote.value])

/** Проверка записи из levels.json: чужой или битый файл не должен ронять игру. */
function valid(entry: any): entry is ILevel {
	return (
		entry &&
		Number.isInteger(entry.id) &&
		typeof entry.src === 'string' &&
		/\.(webp|jpe?g|png)$/i.test(entry.src) &&
		Number.isInteger(entry.width) &&
		Number.isInteger(entry.height) &&
		entry.width >= 100 &&
		entry.height >= 100 &&
		entry.width <= 4000 &&
		entry.height <= 4000
	)
}

/** Уровни подряд с первого номера после встроенных — дальше первой дыры не идём. */
function inOrder(list: ILevel[]) {
	const byId = new Map(list.map((l) => [l.id, l]))
	const out: ILevel[] = []
	for (let id = LEVELS.length; byId.has(id); id++) out.push(byId.get(id)!)
	return out
}

const absolute = (src: string) => new URL(src, LEVELS_URL).href

function readList(): ILevel[] {
	try {
		const list = JSON.parse(localStorage.getItem(LIST_KEY) || '[]')
		return Array.isArray(list) ? list.filter(valid) : []
	} catch {
		return []
	}
}

function writeList(list: ILevel[]) {
	try {
		localStorage.setItem(LIST_KEY, JSON.stringify(list))
	} catch {
		// Нет хранилища — без сети скачанное просто не покажется.
	}
}

const blobUrls = new Map<string, string>()

/** Картинка из кэша как адрес в памяти, или null, если её там нет. */
async function fromCache(cache: Cache, url: string) {
	if (blobUrls.has(url)) return blobUrls.get(url)!
	const hit = await cache.match(url)
	if (!hit) return null
	const blob = await hit.blob()
	if (!blob.size) return null
	const local = URL.createObjectURL(blob)
	blobUrls.set(url, local)
	return local
}

/** Выставить в игру всё, что из списка уже лежит в кэше, — подряд, без дыр. */
async function publish(cache: Cache, list: ILevel[]) {
	const ready: ILevel[] = []
	for (const level of inOrder(list)) {
		const local = await fromCache(cache, absolute(level.src))
		if (!local) break
		ready.push({ ...level, src: local })
	}
	remote.value = ready
}

let started = false

/**
 * Запуск при старте приложения: сразу — скачанное раньше (работает и без
 * сети), затем, если сеть есть, свежий список и докачка нового.
 */
export async function initRemoteLevels() {
	if (started || typeof caches === 'undefined') return
	started = true
	try {
		const cache = await caches.open(CACHE)
		// Просим браузер не вычищать кэш при нехватке места, где это умеют.
		void navigator.storage?.persist?.().catch(() => {})

		await publish(cache, readList())

		const res = await fetchWithTimeout(LEVELS_URL, 10000, { cache: 'no-store' })
		if (!res?.ok) return
		const data = await res.json().catch(() => null)
		// Не JSON или не та структура — файл целиком не в счёт: остаётся прежний
		// список и всё скачанное. Иначе битый файл стёр бы уже скачанные уровни.
		if (!data || !Array.isArray(data.levels)) return
		const list: ILevel[] = data.levels.filter(valid)
		writeList(list)

		// Докачка по порядку: каждый готовый уровень сразу появляется в игре.
		for (const level of inOrder(list)) {
			const url = absolute(level.src)
			if (!(await cache.match(url))) {
				const img = await fetchWithTimeout(url, 20000)
				if (!img?.ok || !(img.headers.get('content-type') || '').startsWith('image/')) break
				await cache.put(url, img)
			}
			await publish(cache, list)
		}

		// Убранные из списка картинки — из кэша вон.
		const keep = new Set(list.map((l) => absolute(l.src)))
		for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req)
		await publish(cache, list)
	} catch {
		// Сеть, квота, битый ответ — остаётся то, что уже есть.
	}
}

async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}) {
	const ctrl = new AbortController()
	const timer = setTimeout(() => ctrl.abort(), ms)
	try {
		return await fetch(url, { ...init, signal: ctrl.signal, mode: 'cors' })
	} catch {
		return null
	} finally {
		clearTimeout(timer)
	}
}

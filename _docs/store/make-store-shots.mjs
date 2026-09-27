// Скриншоты для карточки Google Play: телефон, 7" и 10" планшет.
//
// У Play три отдельных слота под скриншоты; пустые планшетные он читает как
// «не рассчитано на планшеты», и приложение теряет планшетную выдачу. Поэтому
// снимаем все три класса.
//
// Соотношение строго 9:16 (портрет), стороны 320…3840 — за 5:8 соседняя игра
// уже получала отказ. Рекламная полоса убрана из кадра целиком (и баннер, и
// кросс-промо): витрина показывает игру, а своё промо Play тоже читает как
// рекламу. Вёрстка при этом занимает освободившееся место, а не оставляет
// пустую полосу.
//
// Нужна сборка вне прод-режима — для автосборки пазла скрипт пользуется
// отладочным событием glass:debug, которого в прод-сборке нет:
//   node node_modules/vite/bin/vite.js build --mode development
//   node _docs/store/make-store-shots.mjs

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WEB = path.join(ROOT, 'docs')
const OUT = path.join(import.meta.dirname, 'screenshots')

const DEVICES = [
	{ dir: 'phone', width: 360, height: 640, scale: 3 }, //       1080x1920
	{ dir: 'tablet7', width: 720, height: 1280, scale: 2 }, //    1440x2560
	{ dir: 'tablet10', width: 900, height: 1600, scale: 2 }, //   1800x3200
]

function findPatchright() {
	const root = 'C:/Users/nurik/.vscode/extensions'
	const hit = fs
		.readdirSync(root)
		.filter((d) => d.startsWith('danielsanmedium.dscodegpt-'))
		.sort()
		.reverse()
		.map((d) => path.join(root, d, 'standalone/node_modules/patchright/index.mjs'))
		.find((p) => fs.existsSync(p))
	if (!hit) throw new Error('patchright не найден в расширениях VSCode')
	return 'file:///' + hit.replaceAll(String.fromCharCode(92), '/')
}

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
}
const server = http.createServer((req, res) => {
	const rel = decodeURIComponent(req.url.split('?')[0])
	let file = path.join(WEB, rel === '/' ? 'index.html' : rel)
	if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
		file = path.join(WEB, 'index.html')
	res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
	fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const URL_BASE = `http://127.0.0.1:${server.address().port}/`

const { chromium } = await import(findPatchright())
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const errors = []
const made = []

for (const device of DEVICES) {
	const out = path.join(OUT, device.dir)
	fs.rmSync(out, { recursive: true, force: true })
	fs.mkdirSync(out, { recursive: true })
	const context = await browser.newContext({
		viewport: { width: device.width, height: device.height },
		deviceScaleFactor: device.scale,
		isMobile: true,
		hasTouch: true,
	})
	// Три пройденные картинки — на экране выбора видно и «пройдено», и «дальше».
	await context.addInitScript(() => {
		const done = { date: new Date().toString(), time: '01:12:04' }
		localStorage.setItem('CapacitorStorage.gameStats', JSON.stringify({ 0: done, 1: done, 2: done }))
		// Музыку и звук не трогаем: в кадре они не видны, но кнопки — включены.
	})
	const page = await context.newPage()
	page.on('pageerror', (e) => errors.push(`${device.dir}: ${e}`))
	const hideAds = () =>
		page.addStyleTag({ content: ':root{--ad-slot:0px!important;--ad-inset:0px!important}.slot{display:none!important}' })
	const debug = (cmd, arg) =>
		page.evaluate(
			([cmd, arg]) => window.dispatchEvent(new CustomEvent('glass:debug', { detail: JSON.stringify({ cmd, arg }) })),
			[cmd, arg]
		)
	const shot = async (n, name) => {
		const file = path.join(out, `${n}-${name}.png`)
		await page.screenshot({ path: file })
		made.push(file)
	}
	const wait = (ms) => page.waitForTimeout(ms)
	const play = async (card, mode) => {
		await page.goto(URL_BASE)
		await hideAds()
		await page.click('.ui-button')
		await page.waitForSelector('.level-page__levels')
		await page.locator('.level-page__levels .level').nth(card).click()
		await page.locator(mode).click()
		await page.waitForFunction(() => document.body.dataset.phase === 'play', null, { timeout: 15000 })
		// Подсказки над лотком: «как собирать», затем «как вращать» — ждём, пока
		// погаснут обе, иначе вторая закрывает кусок в кадре.
		await wait(6200)
	}

	// 1. Старт.
	await page.goto(URL_BASE)
	await hideAds()
	await page.waitForSelector('.start-page')
	await wait(800)
	await shot(1, 'start')

	// 2. Сборка на средней: склеенная группа и отдельные куски на столе.
	await play(1, '.mode--sky')
	await debug('solve', 0.45)
	await debug('fillBench')
	await wait(900)
	await shot(2, 'join-pieces')

	// 3. Лёгкая: куски встают в рамку с контурами.
	await play(0, '.mode--mint')
	await debug('solve', 0.5)
	await wait(900)
	await shot(3, 'easy-frame')

	// 4. Разбитая картинка — осколки в лотке.
	await play(2, '.mode--mint')
	await shot(4, 'tray')

	// 5. Выбор картинки и сложности.
	await page.goto(URL_BASE)
	await hideAds()
	await page.click('.ui-button')
	await page.waitForSelector('.level-page__levels')
	await wait(800)
	await shot(5, 'pictures')
	await page.locator('.level-page__levels .level').nth(3).click()
	await page.waitForSelector('.modal')
	await wait(400)
	await shot(6, 'difficulty')

	// 7. Победа.
	await play(3, '.mode--mint')
	await debug('solve', 1)
	await page.waitForSelector('.result', { timeout: 15000 })
	await wait(1600)
	await shot(7, 'win')

	await context.close()
}

await browser.close()
server.close()

// Проверка: у каждого кадра ровно тот размер, что задумывался, и 9:16.
let bad = 0
for (const file of made) {
	const buf = fs.readFileSync(file)
	const w = buf.readUInt32BE(16)
	const h = buf.readUInt32BE(20)
	const ok = w * 16 === h * 9 && Math.min(w, h) >= 320 && Math.max(w, h) <= 3840
	if (!ok) bad++
	console.log(ok ? 'ok ' : 'BAD', path.relative(ROOT, file), `${w}x${h}`)
}
if (errors.length) console.log('Ошибки на странице:', errors)
if (bad || errors.length) process.exitCode = 1

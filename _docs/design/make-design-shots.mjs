// Снимает экраны игры для брифа дизайнеру (или GPT) — телефон 9:16, 1080x1920.
//
// Кадры нужны не для витрины Play, а как «что есть сейчас»: по ним рисуют
// новый стиль, сохраняя расположение элементов. Поэтому рекламная полоса
// оставлена на месте — дизайн должен учитывать, что низ экрана занят.
//
// Запуск из корня проекта после сборки (vite build кладёт её в docs/):
//   node _docs/design/make-design-shots.mjs [имя-папки]
// Кадры лягут в _docs/design/screens/<имя-папки>/ (по умолчанию "current").

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WEB = path.join(ROOT, 'docs')
const OUT = path.join(import.meta.dirname, 'screens', process.argv[2] || 'current')
const VIEWPORT = { width: 360, height: 640 }
const SCALE = 3

/** Путь до patchright внутри расширения — версия меняется, поэтому ищем сами. */
function findPatchright() {
	const root = 'C:/Users/nurik/.vscode/extensions'
	const hit = fs
		.readdirSync(root)
		.filter((d) => d.startsWith('danielsanmedium.dscodegpt-'))
		.sort()
		.reverse()
		.map((d) =>
			path.join(root, d, 'standalone/node_modules/patchright/index.mjs')
		)
		.find((p) => fs.existsSync(p))
	if (!hit) throw new Error('patchright не найден в расширениях VSCode')
	return 'file:///' + hit.split(String.fromCharCode(92)).join('/')
}

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
}

const server = http.createServer((req, res) => {
	const rel = decodeURIComponent(req.url.split('?')[0])
	let file = path.join(WEB, rel === '/' ? 'index.html' : rel)
	if (
		!file.startsWith(WEB) ||
		!fs.existsSync(file) ||
		fs.statSync(file).isDirectory()
	)
		file = path.join(WEB, 'index.html')
	res.writeHead(200, {
		'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
	})
	fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const URL_BASE = `http://127.0.0.1:${server.address().port}/`

const { chromium } = await import(findPatchright())
// Расширение обновляет patchright раньше, чем докачивает под него браузер, —
// тогда берём установленный Chrome.
const browser = await chromium
	.launch()
	.catch(() => chromium.launch({ channel: 'chrome' }))
const errors = []
fs.mkdirSync(OUT, { recursive: true })

const context = await browser.newContext({
	viewport: VIEWPORT,
	deviceScaleFactor: SCALE,
	isMobile: true,
	hasTouch: true,
})
// Два пройденных уровня, чтобы на экране выбора были все три состояния
// карточки: пройден, доступен, закрыт.
await context.addInitScript(() => {
	localStorage.setItem(
		'CapacitorStorage.gameStats',
		JSON.stringify({
			0: { date: new Date().toString(), time: '01:12:04' },
			1: { date: new Date().toString(), time: '02:40:31' },
		})
	)
})
const page = await context.newPage()
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const shot = async (name) => {
	await page.screenshot({ path: path.join(OUT, `${name}.png`) })
	console.log('  ', name)
}
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(URL_BASE)
await page.waitForSelector('.start-page')
await wait(600)
await shot('01-start')

await page.click('.ui-button')
await page.waitForSelector('.level-page__levels, .page__levels')
await wait(800)
await shot('02-levels')

// Третья карточка — первая непройденная, её и открываем.
await page.locator('.level-page__levels .level, .page__level').nth(2).click()
await page.waitForSelector('.modal')
await wait(300)
await shot('03-difficulty')

await page.locator('.modal__buttons button').first().click()
await page.waitForSelector('#canvas')
// Сначала показывается целая картинка, потом она разбивается. Отсчёт — от
// отметки фазы intro на body (её ставит игра); в старой версии её нет, там
// просто ждём.
await page
	.waitForFunction(() => document.body.dataset.phase === 'intro', null, { timeout: 6000 })
	.catch(() => {})
await wait(500)
await shot('04-play-whole')
// Промежуточные кадры разбития — по времени от начала, это анимация, а не
// игровой таймер: трещины на ~1.2 с, осколки в полёте на ~2.4 с.
await wait(800)
await shot('04b-play-cracks')
await wait(1000)
await shot('04c-play-flying')
await page
	.waitForFunction(() => document.body.dataset.phase === 'play', null, {
		timeout: 6000,
	})
	.catch(() => {})
await wait(2500)
await shot('05-play-broken')

// Дальнейшие кадры снимаются, только если игра даёт хук для автопрохода —
// событие glass:debug (его слушает PlayPage вне прод-сборки). Узнаём о нём по
// отметке фазы на body: в старой версии её нет, и кадры кончаются здесь.
const debug = (cmd, arg) =>
	page.evaluate(
		([cmd, arg]) =>
			window.dispatchEvent(
				new CustomEvent('glass:debug', { detail: JSON.stringify({ cmd, arg }) })
			),
		[cmd, arg]
	)
const hasHook = await page.evaluate(() => document.body.dataset.phase === 'play')
if (hasHook) {
	await debug('solve', 0.45)
	await wait(1200)
	await shot('06-play-progress')
	await debug('fillBench')
	await wait(900)
	await shot('07-play-bench-full')
	await debug('solve', 1)
	await page.waitForSelector('.result', { timeout: 15000 })
	await wait(1500)
	await shot('08-win')
}

await browser.close()
server.close()
if (errors.length) {
	console.log('Ошибки на странице:')
	for (const e of errors) console.log('  ', e)
	process.exitCode = 1
}

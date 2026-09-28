// Проверка подгрузки уровней с хостинга: игра не ломается ни при каком ответе.
//
// Поднимает два сервера: игру (docs/) и «хостинг» с levels.json, который по
// команде отдаёт правильный список, битый JSON, чужую структуру, ошибочные
// записи, 404 и HTML вместо картинки, зависает или вовсе выключен. В каждом
// случае игра должна открыться, показать верное число уровней, не потерять
// скачанное и сыграть уровень с хостинга.
//
// Сборка с адресом тестового хостинга (порт фиксированный):
//   VITE_LEVELS_URL=http://127.0.0.1:8765/levels.json node node_modules/vite/bin/vite.js build --mode development
//   node _docs/levels/check-remote-levels.mjs

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WEB = path.join(ROOT, 'docs')
const BUILT_IN = 68
// Три «новые» картинки — берём из встроенных, для проверки содержимое неважно.
const IMAGES = fs.readdirSync(path.join(ROOT, 'public/img')).filter((f) => f.endsWith('.webp')).slice(0, 3)
const entry = (i, over = {}) => ({ id: BUILT_IN + i, src: `img/${IMAGES[i]}`, width: 640, height: 427, ...over })

let mode = 'good'
const MODES = {
	good: () => ({ levels: [0, 1, 2].map((i) => entry(i)) }),
	// id 69 с невозможным размером, id 70 валиден — но после дыры в игру не идёт.
	badEntries: () => ({ levels: [entry(0), entry(1, { width: 99999 }), entry(2), { id: 'x' }, null, 5] }),
	wrongShape: () => ({ foo: 1 }),
}

const remote = http.createServer((req, res) => {
	const cors = { 'Access-Control-Allow-Origin': '*' }
	const url = decodeURIComponent(req.url.split('?')[0])
	if (mode === 'hang') return // никогда не отвечаем — у игры таймаут
	if (url === '/levels.json') {
		if (mode === 'broken') {
			res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
			return res.end('{"levels": [ {"id": 68, "src": "img/')
		}
		const body = (MODES[mode] || MODES.good)()
		res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
		return res.end(JSON.stringify(body))
	}
	const file = path.join(ROOT, 'public', url)
	if (mode === 'img404' && url.endsWith(IMAGES[1])) {
		res.writeHead(404, cors)
		return res.end()
	}
	if (mode === 'html' && url.startsWith('/img/')) {
		res.writeHead(200, { ...cors, 'Content-Type': 'text/html' })
		return res.end('<html>not an image</html>')
	}
	if (!fs.existsSync(file)) {
		res.writeHead(404, cors)
		return res.end()
	}
	res.writeHead(200, { ...cors, 'Content-Type': 'image/webp' })
	fs.createReadStream(file).pipe(res)
})
let remoteUp = false
const remoteStart = () =>
	new Promise((ok) => {
		if (remoteUp) return ok()
		remote.listen(8765, '127.0.0.1', () => {
			remoteUp = true
			ok()
		})
	})
const remoteStop = () =>
	new Promise((ok) => {
		if (!remoteUp) return ok()
		remote.closeAllConnections?.()
		remote.close(() => {
			remoteUp = false
			ok()
		})
	})

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' }
const app = http.createServer((req, res) => {
	const rel = decodeURIComponent(req.url.split('?')[0])
	let file = path.join(WEB, rel === '/' ? 'index.html' : rel)
	if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB, 'index.html')
	res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
	fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => app.listen(0, '127.0.0.1', ok))
const APP = `http://127.0.0.1:${app.address().port}/`

const root = 'C:/Users/nurik/.vscode/extensions'
const ext = fs.readdirSync(root).filter((d) => d.startsWith('danielsanmedium.dscodegpt-')).sort().reverse()[0]
const { chromium } = await import(
	'file:///' + path.join(root, ext, 'standalone/node_modules/patchright/index.mjs').replaceAll(String.fromCharCode(92), '/')
)
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} ${extra}`)
const errors = []

/** Открыть игру, дойти до выбора картинок и подождать фоновую загрузку. */
async function levels(page, waitMs = 6000) {
	await page.goto(APP)
	await page.click('.ui-button')
	await page.waitForSelector('.level-page__levels')
	await page.waitForTimeout(waitMs)
	return page.locator('.level-page__levels .level').count()
}

async function session(name, fn) {
	const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } })
	const page = await ctx.newPage()
	page.on('pageerror', (e) => errors.push(`${name}: ${e}`))
	await fn(page)
	await ctx.close()
}

// Одна «установка» — хранилище живёт между перезапусками, как на телефоне.
await session('основной', async (page) => {
	await remoteStart()
	mode = 'good'
	check('есть сеть — скачаны новые уровни', (await levels(page)) === BUILT_IN + 3, `(${await page.locator('.level').count()})`)

	// Все встроенные пройдены — открыт первый скачанный; играем его.
	await page.evaluate((n) => {
		const done = { date: new Date().toString(), time: '00:10:00' }
		const stats = {}
		for (let i = 0; i < n; i++) stats[i] = done
		localStorage.setItem('CapacitorStorage.gameStats', JSON.stringify(stats))
	}, BUILT_IN)
	await levels(page, 1500)
	await page.locator('.level-page__levels .level').nth(BUILT_IN).click()
	await page.locator('.mode--mint').click()
	const played = await page
		.waitForFunction(() => document.body.dataset.phase === 'play', null, { timeout: 15000 })
		.then(() => true, () => false)
	check('скачанный уровень играется', played)

	await remoteStop()
	check('нет интернета — скачанное на месте', (await levels(page, 3000)) === BUILT_IN + 3)

	await remoteStart()
	mode = 'broken'
	check('битый JSON — ничего не потеряно', (await levels(page)) === BUILT_IN + 3)
	mode = 'wrongShape'
	check('чужая структура — ничего не потеряно', (await levels(page)) === BUILT_IN + 3)
	mode = 'hang'
	check('хостинг завис — игра открылась, скачанное на месте', (await levels(page, 3000)) === BUILT_IN + 3)
	// Даём таймауту (10 с) сработать и убеждаемся, что после него тоже всё цело.
	await page.waitForTimeout(9000)
	check('после таймаута — всё цело', (await page.locator('.level-page__levels .level').count()) === BUILT_IN + 3)

	mode = 'badEntries'
	check(
		'ошибочные записи и дыра — только годное и подряд',
		(await levels(page)) === BUILT_IN + 1,
		`(${await page.locator('.level').count()})`
	)
	mode = 'good'
	check('список починили — уровни вернулись', (await levels(page)) === BUILT_IN + 3)
})

// Новые «установки» — чтобы в кэше не было скачанного раньше.
await session('404', async (page) => {
	mode = 'img404'
	check('картинка 404 — дальше неё не идёт, остальное работает', (await levels(page)) === BUILT_IN + 1)
})
await session('html', async (page) => {
	mode = 'html'
	check('вместо картинки HTML — не принимается', (await levels(page)) === BUILT_IN)
})
await session('offline', async (page) => {
	await remoteStop()
	check('первый запуск без интернета — встроенные уровни', (await levels(page, 3000)) === BUILT_IN)
})

await browser.close()
app.close()
await remoteStop()
console.log(results.join('\n'))
if (errors.length) console.log('ОШИБКИ НА СТРАНИЦЕ:', errors)
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exitCode = 1

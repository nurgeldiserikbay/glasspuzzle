// Проверка настоящих жестов мышью на средней сложности (с поворотом): достать
// кусок, отложить, повернуть тапом, поставить на место, упереться в лимит
// стола, вернуть в лоток, пролистать ленту, пережить ресайз.
//
// Запуск из корня проекта после сборки (vite build --mode development):
//   node _docs/design/check-gestures.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const WEB = path.resolve(import.meta.dirname, '../../docs')
const root = 'C:/Users/nurik/.vscode/extensions'
const ext = fs.readdirSync(root).filter((d) => d.startsWith('danielsanmedium.dscodegpt-')).sort().reverse()[0]
const { chromium } = await import('file:///' + path.join(root, ext, 'standalone/node_modules/patchright/index.mjs').split('\\').join('/'))

const server = http.createServer((req, res) => {
	const rel = decodeURIComponent(req.url.split('?')[0])
	let file = path.join(WEB, rel === '/' ? 'index.html' : rel)
	if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB, 'index.html')
	const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }
	res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
	fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage({ viewport: { width: 360, height: 640 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`http://127.0.0.1:${server.address().port}/`)
await page.click('.ui-button')
await page.locator('.level-page__levels .level').first().click()
await page.locator('.mode--sky').click() // medium
await page.waitForFunction(() => document.body.dataset.phase === 'play', null, { timeout: 10000 })
await page.waitForTimeout(300)

const box = await page.locator('#canvas').boundingBox()
const targets = async () => {
	await page.evaluate(() => window.dispatchEvent(new CustomEvent('glass:debug', { detail: JSON.stringify({ cmd: 'targets' }) })))
	return JSON.parse(await page.evaluate(() => document.body.dataset.debug))
}
const benchCount = () => page.locator('.bench__slot--used').count()
const progress = () => page.locator('.pill--progress span').innerText()
const abs = (p) => ({ x: box.x + p.x, y: box.y + p.y })
async function drag(from, to, steps = 12) {
	const a = abs(from), b = abs(to)
	await page.mouse.move(a.x, a.y)
	await page.mouse.down()
	// сначала строго вверх — чтобы жест распознался как «достать», а не «листать»
	await page.mouse.move(a.x, a.y - 30, { steps: 4 })
	await page.mouse.move(b.x, b.y, { steps })
	await page.mouse.up()
	await page.waitForTimeout(450)
}
async function tap(p) {
	const a = abs(p)
	await page.mouse.click(a.x, a.y)
	await page.waitForTimeout(300)
}
const visibleTray = (t) => t.filter((p) => p.place === 'tray' && p.x > 20 && p.x < box.width - 20)
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} ${extra}`)

// 1. Достать кусок и положить не на место → он на «столе».
let t = await targets()
check('20 кусков на средней', t.length === 20, `(${t.length})`)
check('есть повёрнутые', t.some((p) => p.rot !== 0))
let p = visibleTray(t)[0]
// точка на поле подальше от его места
const far = { x: p.tx < box.width / 2 ? box.width * 0.8 : box.width * 0.2, y: p.ty < 250 ? 380 : 120 }
await drag(p, far)
check('отложен на стол', (await benchCount()) === 1, `bench=${await benchCount()}`)

// 2. Тап по отложенному куску поворачивает его.
t = await targets()
let b = t.find((q) => q.i === p.i)
const rot0 = b.rot
await tap(b)
t = await targets()
b = t.find((q) => q.i === p.i)
check('тап поворачивает', b.rot === (rot0 + 1) % 4, `${rot0}→${b.rot}`)

// 3. Довернуть до нуля и поставить на место.
while (b.rot !== 0) {
	await tap(b)
	t = await targets()
	b = t.find((q) => q.i === p.i)
}
await page.waitForTimeout(250)
const bb = abs(b)
await page.mouse.move(bb.x, bb.y)
await page.mouse.down()
await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 3 })
await page.mouse.move(box.x + b.tx + 6, box.y + b.ty - 5, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(500)
t = await targets()
check('встал на место', t.find((q) => q.i === p.i).place === 'board', `progress=${await progress()} bench=${await benchCount()}`)

// 4. Заполнить стол тремя и попробовать четвёртый.
for (let k = 0; k < 3; k++) {
	t = await targets()
	const q = visibleTray(t)[0]
	const spot = { x: 60 + k * 110, y: 60 }
	// не на своё место
	if (Math.hypot(spot.x - q.tx, spot.y - q.ty) < 60) spot.y = 300
	await drag(q, spot)
}
check('на столе три', (await benchCount()) === 3, `bench=${await benchCount()}`)
t = await targets()
const trayBefore = t.filter((q) => q.place === 'tray').length
const fourth = visibleTray(t)[0]
await drag(fourth, { x: box.width / 2, y: 200 })
await page.waitForTimeout(300)
t = await targets()
check('четвёртый вернулся в лоток', t.filter((q) => q.place === 'tray').length === trayBefore && (await benchCount()) === 3)
check('показана подсказка про лимит', (await page.locator('.hint').count()) === 1, await page.locator('.hint').innerText().catch(() => ''))

// 5. Отложенный кусок можно вернуть в лоток.
t = await targets()
const onBench = t.find((q) => q.place === 'bench')
const bp = abs(onBench)
await page.mouse.move(bp.x, bp.y)
await page.mouse.down()
await page.mouse.move(bp.x + 5, bp.y + 10, { steps: 3 })
await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(500)
t = await targets()
check('вернулся со стола в лоток', t.find((q) => q.i === onBench.i).place === 'tray' && (await benchCount()) === 2, `bench=${await benchCount()}`)

// 6. Свайп вбок листает ленту и не достаёт кусок.
t = await targets()
const first = visibleTray(t)[1]
const before = t.filter((q) => q.place === 'tray').map((q) => q.x)
const s = abs(first)
await page.mouse.move(s.x, s.y)
await page.mouse.down()
await page.mouse.move(s.x - 160, s.y + 4, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(700)
t = await targets()
const after = t.filter((q) => q.place === 'tray').map((q) => q.x)
check('лента пролисталась', after[0] < before[0] - 100, `${before[0].toFixed(0)}→${after[0].toFixed(0)}`)
check('свайп не достал кусок', (await benchCount()) === 2 && t.every((q) => q.place !== 'drag'))

// 7. Подсмотреть: зажатая кнопка.
const eye = await page.locator('.peek').boundingBox()
await page.mouse.move(eye.x + 20, eye.y + 20)
await page.mouse.down()
await page.waitForTimeout(300)
await page.mouse.up()

// 8. Смена размера посреди партии.
await page.setViewportSize({ width: 360, height: 540 })
await page.waitForTimeout(600)
const box2 = await page.locator('#canvas').boundingBox()
t = await targets()
const lockedOk = t
	.filter((q) => q.place === 'board')
	.every((q) => Math.abs(q.x - q.tx) < 1 && Math.abs(q.y - q.ty) < 1)
const inside = t.filter((q) => q.place === 'bench').every((q) => q.y > 0 && q.y < box2.height)
check('после ресайза: на месте и внутри', lockedOk && inside, `canvas ${box2.height.toFixed(0)}px locked=${lockedOk} inside=${inside} ` + JSON.stringify(t.filter((q) => q.place !== 'tray').map((q) => [q.place, q.x | 0, q.y | 0, q.tx | 0, q.ty | 0])))

console.log(results.join('\n'))
if (errors.length) console.log('ОШИБКИ:', errors)
await browser.close()
server.close()

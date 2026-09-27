// Проверка настоящих жестов мышью на средней сложности (склейка и поворот):
// достать кусок, повернуть тапом, приклеить к соседу, подвинуть и повернуть
// группу целиком, упереться в лимит стола, приклеить кусок при полном столе,
// вернуть одиночный кусок в лоток, пролистать ленту, пережить ресайз, собрать.
//
// Запуск из корня проекта после сборки (vite build --mode development):
//   node _docs/design/check-gestures.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const WEB = path.resolve(import.meta.dirname, '../../docs')
const root = 'C:/Users/nurik/.vscode/extensions'
const ext = fs.readdirSync(root).filter((d) => d.startsWith('danielsanmedium.dscodegpt-')).sort().reverse()[0]
const { chromium } = await import(
	'file:///' + path.join(root, ext, 'standalone/node_modules/patchright/index.mjs').split('\\').join('/')
)

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

let box = await page.locator('#canvas').boundingBox()
// Команды игре — событием DOM: patchright исполняет evaluate в изолированном мире.
const debug = (cmd, arg) =>
	page.evaluate(
		([cmd, arg]) =>
			window.dispatchEvent(new CustomEvent('glass:debug', { detail: JSON.stringify({ cmd, arg }) })),
		[cmd, arg]
	)
let scale = 1
const targets = async () => {
	await debug('targets')
	const t = JSON.parse(await page.evaluate(() => document.body.dataset.debug))
	scale = t.scale
	return t.pieces
}
const benchCount = () => page.locator('.bench__slot--used').count()
const progress = () => page.locator('.pill--progress span').innerText()
const abs = (p) => ({ x: box.x + p.x, y: box.y + p.y })
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} ${extra}`)
const byId = (t, i) => t.find((q) => q.i === i)
const visibleTray = (t) =>
	t.filter((p) => p.place === 'tray' && p.x > 30 && p.x < box.width - 30).sort((a, b) => a.x - b.x)

/** Где должен стоять центр куска b, чтобы продолжить картинку куска a. */
function expected(a, b, rot) {
	const dx = (b.cx - a.cx) * scale
	const dy = (b.cy - a.cy) * scale
	const t = (rot * Math.PI) / 2
	return { x: a.x + dx * Math.cos(t) - dy * Math.sin(t), y: a.y + dx * Math.sin(t) + dy * Math.cos(t) }
}

/** Из лотка вверх и в точку; кусок висит над пальцем на up. */
async function fromTray(p, to) {
	const a = abs(p)
	const up = Math.min(p.r * scale * 0.8, 70)
	await page.mouse.move(a.x, a.y)
	await page.mouse.down()
	await page.mouse.move(a.x, a.y - 30, { steps: 4 })
	await page.mouse.move(box.x + to.x, box.y + to.y + up, { steps: 14 })
	await page.waitForTimeout(250)
	await page.mouse.up()
	await page.waitForTimeout(450)
}
/** Со стола: хватаем за центр куска, центр и едет в точку. */
async function fromField(p, to) {
	const a = abs(p)
	await page.mouse.move(a.x, a.y)
	await page.mouse.down()
	await page.mouse.move(a.x + 8, a.y + 8, { steps: 3 })
	await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 14 })
	await page.mouse.up()
	await page.waitForTimeout(450)
}
async function tap(p) {
	const a = abs(p)
	await page.mouse.click(a.x, a.y)
	await page.waitForTimeout(320)
}
/** Прокрутить ленту, пока кусок i не окажется в видимой части лотка. */
async function reveal(i) {
	for (let k = 0; k < 20; k++) {
		const q = byId(await targets(), i)
		if (q.x > 40 && q.x < box.width - 40) return
		const mid = abs({ x: box.width / 2, y: q.y })
		await page.mouse.move(mid.x, mid.y)
		await page.mouse.down()
		await page.mouse.move(mid.x + (q.x > box.width / 2 ? -1 : 1) * Math.min(200, Math.abs(q.x - box.width / 2)), mid.y, { steps: 8 })
		await page.mouse.up()
		await page.waitForTimeout(1200)
	}
}
async function turnInTray(i, rot) {
	for (let k = 0; k < 4; k++) {
		const q = byId(await targets(), i)
		if (q.rot === rot) return
		await tap(q)
	}
}

/** Кусок из лотка, которому не к чему приклеиться на столе, — уже в видимой части. */
async function pickLone() {
	const t = await targets()
	const onField = t.filter((q) => q.place === 'group')
	const q = t.find((p) => p.place === 'tray' && !onField.some((g) => p.near.includes(g.i)))
	await reveal(q.i)
	return byId(await targets(), q.i)
}

// 1. Кусок A на стол.
let t = await targets()
check('20 кусков на средней', t.length === 20, `(${t.length})`)
check('есть повёрнутые', t.some((p) => p.rot !== 0))
let A = visibleTray(t)[0]
await fromTray(A, { x: box.width * 0.35, y: 150 })
t = await targets()
A = byId(t, A.i)
check('кусок на столе', A.place === 'group' && (await benchCount()) === 1, `bench=${await benchCount()}`)

// 2. Тап поворачивает.
const rot0 = A.rot
await tap(A)
A = byId(await targets(), A.i)
check('тап поворачивает', A.rot === (rot0 + 1) % 4, `${rot0}→${A.rot}`)

// 3. Сосед B: довернуть в лотке под A, положить на стол подальше, потом приложить.
t = await targets()
let B = t.find((q) => q.place === 'tray' && A.near.includes(q.i))
await reveal(B.i)
await turnInTray(B.i, A.rot)
B = byId(await targets(), B.i)
check('в лотке тоже вращается', B.rot === A.rot, `B.rot=${B.rot}`)
await fromTray(B, { x: box.width * 0.75, y: 330 })
t = await targets()
A = byId(t, A.i)
B = byId(t, B.i)
check('B отдельно на столе', (await benchCount()) === 2 && B.size === 1, `bench=${await benchCount()}`)
await fromField(B, expected(A, B, A.rot))
t = await targets()
A = byId(t, A.i)
B = byId(t, B.i)
check('склеились в одну группу', A.size === 2 && B.size === 2 && (await benchCount()) === 1,
	`size=${A.size} bench=${await benchCount()} progress=${await progress()}`)
const fit = expected(A, B, A.rot)
check('встали стык в стык', Math.hypot(fit.x - B.x, fit.y - B.y) < 1, `off=${Math.hypot(fit.x - B.x, fit.y - B.y).toFixed(2)}`)

// 4. Группа едет целиком.
const dx = 40
await fromField(A, { x: A.x - dx, y: A.y + 30 })
t = await targets()
const A2 = byId(t, A.i)
const B2 = byId(t, B.i)
check('группа двигается целиком', Math.abs(B2.x - B.x - (A2.x - A.x)) < 1 && Math.abs(B2.y - B.y - (A2.y - A.y)) < 1)

// 5. Тап поворачивает всю группу, стык сохраняется.
await tap(A2)
await page.waitForTimeout(200)
t = await targets()
A = byId(t, A.i)
B = byId(t, B.i)
const fit2 = expected(A, B, A.rot)
check('группа поворачивается целиком', A.rot === B.rot && A.rot === (A2.rot + 1) % 4 && Math.hypot(fit2.x - B.x, fit2.y - B.y) < 1,
	`rot=${A.rot}`)

// 6. Группу в лоток не вернуть: брошенная на лоток, остаётся на столе.
await fromField(A, { x: box.width / 2, y: box.height - 40 })
t = await targets()
check('группа не уходит в лоток', byId(t, A.i).place === 'group' && byId(t, A.i).size === 2)

// 7. Стол: до трёх групп, четвёртый кусок возвращается.
const spots = [{ x: 50, y: 40 }, { x: box.width - 50, y: 40 }]
for (const s of spots) {
	const q = await pickLone()
	await fromTray(q, s)
}
check('на столе три группы', (await benchCount()) === 3, `bench=${await benchCount()}`)
t = await targets()
const trayBefore = t.filter((q) => q.place === 'tray').length
const lone = await pickLone()
await fromTray(lone, { x: box.width / 2, y: 60 })
t = await targets()
check('четвёртый вернулся в лоток', t.filter((q) => q.place === 'tray').length === trayBefore && (await benchCount()) === 3)
// Элементов подсказки может быть два: старая ещё гаснет, новая уже появилась.
check('подсказка про полный стол', (await page.locator('.hint', { hasText: 'Table is full' }).count()) >= 1)

// 8. Но кусок, который приклеивается, можно достать и при полном столе.
t = await targets()
A = byId(t, A.i)
let C = null
for (const q of t.filter((p) => p.place === 'tray')) {
	const host = t.find((g) => g.place === 'group' && g.size >= 2 && q.near.includes(g.i))
	if (host) {
		C = { q, host }
		break
	}
}
if (C) {
	await reveal(C.q.i)
	await turnInTray(C.q.i, C.host.rot)
	t = await targets()
	let host = byId(t, C.host.i)
	let q = byId(t, C.q.i)
	// Место для куска может оказаться за краем стола или над лотком — тогда,
	// как сделал бы игрок, сначала отодвигаем группу к середине стола.
	const fieldBottom = box.height - 96 - 30
	const w0 = expected(host, q, host.rot)
	if (w0.y > fieldBottom || w0.y < 20 || w0.x < 20 || w0.x > box.width - 20) {
		await fromField(host, { x: box.width / 2 + (host.x - w0.x), y: fieldBottom / 2 + (host.y - w0.y) })
		t = await targets()
		host = byId(t, C.host.i)
		q = byId(t, C.q.i)
	}
	await fromTray(q, expected(host, q, host.rot))
	t = await targets()
	check('при полном столе приклеился', byId(t, C.q.i).size === 3 && (await benchCount()) === 3,
		`size=${byId(t, C.q.i).size} bench=${await benchCount()}`)
} else check('при полном столе приклеился', false, 'нет подходящего куска')

// 9. Одиночный кусок со стола — обратно в лоток.
t = await targets()
const single = t.find((q) => q.place === 'group' && q.size === 1)
await fromField(single, { x: box.width / 2, y: box.height - 45 })
t = await targets()
check('одиночный вернулся в лоток', byId(t, single.i).place === 'tray' && (await benchCount()) === 2, `bench=${await benchCount()}`)

// 9б. Схватить кусок, пока он ещё доезжает в ящик, и сразу после тапа-поворота.
// Раньше недоигранная анимация лотка продолжала двигать и сжимать картинку
// уже в группе — она отставала от контура.
{
	const quick = async (first) => {
		const q = byId(await targets(), single.i)
		const a = abs(q)
		await page.mouse.move(a.x, a.y)
		await page.mouse.down()
		await page.mouse.move(a.x, a.y - 30, { steps: 3 })
		await page.mouse.move(box.x + box.width / 2, box.y + 250, { steps: 6 })
		await page.mouse.up()
		await page.waitForTimeout(500)
		t = await targets()
		check(first, t.every((p) => p.intact), JSON.stringify(t.filter((p) => !p.intact).map((p) => p.i)))
	}
	// Кусок в ящике (шаг 9). Достаём на стол, бросаем обратно в лоток и через
	// 60 мс, пока он ещё едет в ящик, хватаем снова.
	await reveal(single.i)
	await fromTray(byId(await targets(), single.i), { x: box.width / 2, y: 250 })
	const on = abs(byId(await targets(), single.i))
	await page.mouse.move(on.x, on.y)
	await page.mouse.down()
	await page.mouse.move(on.x + 6, on.y + 6, { steps: 2 })
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 40, { steps: 5 })
	await page.mouse.up()
	await page.waitForTimeout(60)
	await quick('схвачен, пока ехал в ящик')
	// Освободим место на столе: кусок обратно в лоток.
	await fromField(byId(await targets(), single.i), { x: box.width / 2, y: box.height - 40 })
	// Тап-поворот в лотке и сразу — наверх.
	const q2 = visibleTray(await targets())[0]
	const a2 = abs(q2)
	await page.mouse.click(a2.x, a2.y)
	await page.waitForTimeout(40)
	await page.mouse.move(a2.x, a2.y)
	await page.mouse.down()
	await page.mouse.move(a2.x, a2.y - 30, { steps: 3 })
	await page.mouse.move(box.x + 60, box.y + 250, { steps: 6 })
	await page.mouse.up()
	await page.waitForTimeout(500)
	t = await targets()
	check('схвачен сразу после поворота', t.every((p) => p.intact), JSON.stringify(t.filter((p) => !p.intact).map((p) => p.i)))
}

// 10. Свайп вбок листает и не достаёт кусок.
t = await targets()
const firstX = visibleTray(t)[0]
const benchBefore = await benchCount()
// Лента могла уже стоять у края — тогда листаем в другую сторону.
for (const dir of [-1, 1]) {
	const s = abs(visibleTray(await targets())[1])
	await page.mouse.move(s.x, s.y)
	await page.mouse.down()
	await page.mouse.move(s.x + dir * 160, s.y + 4, { steps: 10 })
	await page.mouse.up()
	await page.waitForTimeout(700)
	t = await targets()
	if (Math.abs(byId(t, firstX.i).x - firstX.x) > 60) break
}
check('лента пролисталась', Math.abs(byId(t, firstX.i).x - firstX.x) > 60, `${firstX.x.toFixed(0)}→${byId(t, firstX.i).x.toFixed(0)}`)
check('свайп не достал кусок', (await benchCount()) === benchBefore)

// 11. Смена размера: группы внутри стола, стыки целы.
await page.setViewportSize({ width: 360, height: 540 })
await page.waitForTimeout(600)
box = await page.locator('#canvas').boundingBox()
t = await targets()
A = byId(t, A.i)
B = byId(t, B.i)
const fit3 = expected(A, B, A.rot)
const inside = t.filter((q) => q.place === 'group').every((q) => q.y > -20 && q.y < box.height)
check('после ресайза: стык цел и всё внутри', Math.hypot(fit3.x - B.x, fit3.y - B.y) < 1 && inside,
	`canvas ${box.height.toFixed(0)}px fit=${Math.hypot(fit3.x - B.x, fit3.y - B.y).toFixed(1)} out=${JSON.stringify(
		t.filter((q) => q.place === 'group' && !(q.y > -20 && q.y < box.height)).map((q) => [q.i, q.size, q.x | 0, q.y | 0])
	)}`)

// 12. Собрать до конца — появляется экран победы.
await debug('solve', 1)
const won = await page.waitForSelector('.result', { timeout: 8000 }).then(() => true, () => false)
check('собрано → победа', won, `progress=${await progress()}`)

console.log(results.join('\n'))
if (errors.length) console.log('ОШИБКИ:', errors)
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exitCode = 1
await browser.close()
server.close()

// Записывает звук игры в WAV — послушать мелодии и эффекты без сборки APK.
//
// Звук синтезируется в src/utils/sound.ts; здесь он собирается esbuild в
// браузерный бандл, рендерится OfflineAudioContext в headless-браузере и
// сохраняется файлами. Заодно печатается пик и средняя громкость каждого
// файла: пик у 1.0 — перегруз, средняя около нуля — тишина.
//
// Запуск из корня проекта:
//   node _docs/design/render-sounds.mjs
// Файлы — в _docs/design/sounds/ (в git не кладутся).

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(import.meta.dirname, 'sounds')
const BUNDLE = path.join(OUT, 'sound.bundle.js')
fs.mkdirSync(OUT, { recursive: true })

const esbuild = fs
	.readdirSync(path.join(ROOT, 'node_modules/.pnpm'))
	.filter((d) => d.startsWith('esbuild@'))
	.map((d) => path.join(ROOT, 'node_modules/.pnpm', d, 'node_modules/esbuild/bin/esbuild'))
	.find((p) => fs.existsSync(p))
execFileSync(process.execPath, [
	esbuild,
	path.join(ROOT, 'src/utils/sound.ts'),
	'--bundle',
	'--format=iife',
	'--global-name=GlassSound',
	`--outfile=${BUNDLE}`,
	'--log-level=warning',
])

const root = 'C:/Users/nurik/.vscode/extensions'
const ext = fs.readdirSync(root).filter((d) => d.startsWith('danielsanmedium.dscodegpt-')).sort().reverse()[0]
const { chromium } = await import(
	'file:///' + path.join(root, ext, 'standalone/node_modules/patchright/index.mjs').replaceAll(String.fromCharCode(92), '/')
)
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage()
await page.setContent('<html><body></body></html>')
// Бандл выполняется внутри evaluate: patchright исполняет его в изолированном
// мире, и глобальные переменные страницы оттуда не видны.
const CODE = fs.readFileSync(BUNDLE, 'utf8')

const JOBS = [
	{ name: 'music-1-morning', what: 0, seconds: 40 },
	{ name: 'music-2-garden', what: 1, seconds: 40 },
	{ name: 'music-3-lullaby', what: 2, seconds: 40 },
	{ name: 'music-4-stream', what: 3, seconds: 40 },
	{ name: 'music-5-clouds', what: 4, seconds: 40 },
	{ name: 'music-6-evening', what: 5, seconds: 40 },
	{ name: 'sfx-all', what: 'sfx', seconds: 11 },
	{ name: 'win-over-music', what: 'win', seconds: 10 },
]

for (const job of JOBS) {
	// Рендер и перевод в 16-битный WAV — прямо в странице, наружу base64.
	const res = await page.evaluate(
		async ({ code, what, seconds }) => {
			const GlassSound = new Function(code + ';return GlassSound')()
			const started = performance.now()
			const buf = await GlassSound.renderSound(what, seconds)
			const cost = (performance.now() - started) / seconds
			const ch = [buf.getChannelData(0), buf.getChannelData(1)]
			let peak = 0
			let sum = 0
			for (const c of ch)
				for (let i = 0; i < c.length; i++) {
					const v = Math.abs(c[i])
					if (v > peak) peak = v
					sum += c[i] * c[i]
				}
			const rms = Math.sqrt(sum / (ch[0].length * 2))
			const n = buf.length
			const bytes = new DataView(new ArrayBuffer(44 + n * 4))
			const str = (o, s) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)))
			str(0, 'RIFF')
			bytes.setUint32(4, 36 + n * 4, true)
			str(8, 'WAVEfmt ')
			bytes.setUint32(16, 16, true)
			bytes.setUint16(20, 1, true)
			bytes.setUint16(22, 2, true)
			bytes.setUint32(24, buf.sampleRate, true)
			bytes.setUint32(28, buf.sampleRate * 4, true)
			bytes.setUint16(32, 4, true)
			bytes.setUint16(34, 16, true)
			str(36, 'data')
			bytes.setUint32(40, n * 4, true)
			for (let i = 0; i < n; i++)
				for (let c = 0; c < 2; c++)
					bytes.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i])) * 0x7fff, true)
			let bin = ''
			const u8 = new Uint8Array(bytes.buffer)
			for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000))
			return { peak, rms, cost, wav: btoa(bin) }
		},
		{ code: CODE, what: job.what, seconds: job.seconds }
	)
	fs.writeFileSync(path.join(OUT, `${job.name}.wav`), Buffer.from(res.wav, 'base64'))
	const verdict = res.peak >= 0.99 ? 'ПЕРЕГРУЗ' : res.rms < 0.005 ? 'ТИШИНА' : 'ok'
	// Нагрузка — сколько миллисекунд процессора уходит на секунду звука. Офлайн
	// на компьютере; на телефоне в разы больше, но соотношение то же.
	console.log(job.name.padEnd(18), 'пик', res.peak.toFixed(2), 'средняя', res.rms.toFixed(3), 'нагрузка', res.cost.toFixed(1), 'мс/с', verdict)
}

await browser.close()
fs.rmSync(BUNDLE)

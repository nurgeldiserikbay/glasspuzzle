// Готовит картинки от GPT для игры: _docs/design/assets/*.png → src/assets/design/*.webp.
//
// GPT отдаёт PNG по 1–2 МБ и с широкими пустыми полями вокруг прозрачных
// предметов (у самоцветов пусто до 70% кадра). Скрипт обрезает поля по
// содержимому, уменьшает до размера, в котором картинка реально видна на
// экране, и жмёт в WebP с альфой. Исходники остаются как есть — если GPT
// перерисует файл, достаточно заменить его и запустить скрипт снова.
//
// Запуск из корня проекта:
//   node _docs/design/make-assets.mjs

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_docs/design/assets')
const OUT = path.join(ROOT, 'src/assets/design')
const sharp = createRequire(path.join(ROOT, 'package.json'))(
	path.join(ROOT, 'node_modules/.pnpm/sharp@0.32.6/node_modules/sharp')
)

// width — наибольшая ширина на экране в CSS-пикселях x3 (плотность телефона),
// но не больше исходника: растягивать нечего.
const JOBS = [
	{ file: 'bg-start', width: 1080, trim: false, quality: 78 },
	{ file: 'bg-levels', width: 1080, trim: false, quality: 78 },
	{ file: 'bg-play', width: 1080, trim: false, quality: 78 },
	{ file: 'logo', width: 960, trim: true, quality: 88 },
	{ file: 'flowers-left', width: 360, trim: true, quality: 85 },
	{ file: 'flowers-right', width: 360, trim: true, quality: 85 },
	...[1, 2, 3, 4, 5, 6].map((n) => ({ file: `gem-${n}`, width: 240, trim: true, quality: 88 })),
]

fs.mkdirSync(OUT, { recursive: true })
let total = 0
for (const job of JOBS) {
	const from = path.join(SRC, `${job.file}.png`)
	if (!fs.existsSync(from)) {
		console.log('нет файла', `${job.file}.png`)
		process.exitCode = 1
		continue
	}
	let img = sharp(from)
	// Обрезка по альфе с небольшим запасом: тень под предметом полупрозрачная,
	// её не режем.
	if (job.trim) img = sharp(await img.trim({ threshold: 1 }).toBuffer())
	const meta = await img.metadata()
	const width = Math.min(job.width, meta.width)
	const to = path.join(OUT, `${job.file}.webp`)
	await img
		.resize({ width, withoutEnlargement: true })
		.webp({ quality: job.quality, alphaQuality: 90, effort: 6 })
		.toFile(to)
	const size = fs.statSync(to).size
	total += size
	const out = await sharp(to).metadata()
	console.log(job.file.padEnd(14), `${meta.width}x${meta.height} → ${out.width}x${out.height}`, `${(size / 1024).toFixed(0)} КБ`)
}
console.log('всего', `${(total / 1024).toFixed(0)} КБ`)

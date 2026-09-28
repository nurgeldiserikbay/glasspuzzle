// Добавить новые уровни на хостинг (репозиторий glasspuzzleimages).
//
//   node _docs/levels/add-levels.mjs путь/к/картинке1.jpg путь/к/картинке2.png ...
//
// Каждая картинка пережимается в WebP (длинная сторона — не больше 640, как у
// встроенных уровней), кладётся в ../glasspuzzleimages/img/ и дописывается в
// levels.json со следующим номером. Потом в папке glasspuzzleimages:
//   git add -A && git commit -m "Новые уровни" && git push
// — и у игроков они подтянутся при следующем запуске с интернетом.
//
// Номера идут подряд с 68 (встроенные — 0…67). Удалять уровень из середины
// нельзя: следующие за ним у игроков перестанут открываться. Заменить
// картинку можно — положите новую под другим именем и поправьте src.
//
// Картинки — только безопасные для детей и со свободной лицензией (как у
// встроенных: Unsplash, Pixabay): игра в семейном разделе Google Play.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '../..')
const REPO = path.resolve(ROOT, '../glasspuzzleimages')
const JSON_FILE = path.join(REPO, 'levels.json')
const BUILT_IN = 68
const sharp = createRequire(path.join(ROOT, 'package.json'))(
	path.join(ROOT, 'node_modules/.pnpm/sharp@0.32.6/node_modules/sharp')
)

const files = process.argv.slice(2)
if (!files.length) {
	console.log('Укажите картинки: node _docs/levels/add-levels.mjs a.jpg b.png ...')
	process.exit(1)
}
if (!fs.existsSync(JSON_FILE)) throw new Error(`Нет ${JSON_FILE} — сначала склонируйте glasspuzzleimages рядом с игрой`)

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'))
if (!Array.isArray(data.levels)) throw new Error('levels.json: нет массива levels')
fs.mkdirSync(path.join(REPO, 'img'), { recursive: true })

let next = BUILT_IN + data.levels.length
for (const file of files) {
	const slug = path
		.basename(file, path.extname(file))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
	const name = `${next}-${slug || 'level'}.webp`
	const out = path.join(REPO, 'img', name)
	const info = await sharp(file)
		.rotate() // по EXIF: фото с телефона не лягут боком
		.resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82, effort: 6 })
		.toFile(out)
	if (info.width < 300 || info.height < 300) throw new Error(`${file}: слишком маленькая (${info.width}x${info.height})`)
	data.levels.push({ id: next, src: `img/${name}`, width: info.width, height: info.height })
	console.log(`уровень ${next}: img/${name} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} КБ`)
	next++
}

// Номера строго подряд — иначе игра остановится на первой дыре.
data.levels.forEach((l, i) => {
	if (l.id !== BUILT_IN + i) throw new Error(`levels.json: у записи ${i} номер ${l.id}, ожидался ${BUILT_IN + i}`)
})
fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, '\t') + '\n')
console.log(`levels.json: всего новых уровней ${data.levels.length}`)

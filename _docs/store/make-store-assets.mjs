// Иконка, заставка и обложка для Google Play из картинок GPT (_docs/design/assets).
//
// Что получается:
//   resources/icon-only.png        1024 — обычная иконка (старые лаунчеры, Play)
//   resources/icon-foreground.png  1024 — передний слой адаптивной иконки
//   resources/icon-background.png  1024 — её фон
//   resources/splash*.png          2732 — заставка при запуске
//   _docs/store/icon-512.png             — иконка для карточки в Play
//   _docs/store/feature-1024x500.png     — обложка карточки
// Затем из resources/ собираются все размеры для Android:
//   node node_modules/@capacitor/assets/bin/capacitor-assets generate --android
//
// Адаптивная иконка: лаунчер режет её маской любой формы (круг, сквикл,
// квадрат) и показывает только центральные 66% слоя. Поэтому круглый витраж
// вырезается из иконки и кладётся на передний слой целиком в эту зону, а фоном
// служит размытое небо той же картинки — край маски приходится на небо, а не
// на оправу витража.
//
// Запуск из корня проекта:
//   node _docs/store/make-store-assets.mjs

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_docs/design/assets')
const RES = path.join(ROOT, 'resources')
const STORE = path.join(ROOT, '_docs/store')
const sharp = createRequire(path.join(ROOT, 'package.json'))(
	path.join(ROOT, 'node_modules/.pnpm/sharp@0.32.6/node_modules/sharp')
)

const icon = path.join(SRC, 'icon.png')
const meta = await sharp(icon).metadata()
const S = 1024

// 1. Обычная иконка — картинка целиком.
await sharp(icon).resize(S, S).png().toFile(path.join(RES, 'icon-only.png'))
await sharp(icon).resize(512, 512).flatten({ background: '#aee0f5' }).png().toFile(path.join(STORE, 'icon-512.png'))

// 2. Передний слой: круг витража. Центр и радиус круга — в долях стороны
// иконки (замерено по картинке: оправа от 3.6% до 96.5% по ширине).
const cx = 0.5 * meta.width
const cy = 0.51 * meta.height
const r = 0.468 * meta.width
const size = Math.round(r * 2)
const circle = Buffer.from(
	`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
)
const disc = await sharp(icon)
	.extract({ left: Math.round(cx - r), top: Math.round(cy - r), width: size, height: size })
	.composite([{ input: circle, blend: 'dest-in' }])
	.png()
	.toBuffer()
// Диаметр витража — 60% слоя: видимая часть слоя — 66%, так что вокруг
// оправы остаётся полоска неба и круглая маска её не подрезает.
const inner = Math.round(S * 0.6)
await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
	.composite([{ input: await sharp(disc).resize(inner, inner).toBuffer(), gravity: 'center' }])
	.png()
	.toFile(path.join(RES, 'icon-foreground.png'))

// 3. Фон: чистое небо градиентом. Размытая иконка не годилась — в неё
// попадали жёлтые лепестки, и фон шёл пятнами.
await sharp(
	Buffer.from(
		`<svg width="${S}" height="${S}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
			`<stop offset="0" stop-color="#5fb8f0"/><stop offset="1" stop-color="#b9e6fb"/></linearGradient></defs>` +
			`<rect width="${S}" height="${S}" fill="url(#g)"/></svg>`
	)
)
	.png()
	.toFile(path.join(RES, 'icon-background.png'))

// 4. Заставка: небо градиентом и логотип по центру.
const W = 2732
const sky = Buffer.from(
	`<svg width="${W}" height="${W}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
		`<stop offset="0" stop-color="#aee0f5"/><stop offset="1" stop-color="#e4f6ea"/></linearGradient></defs>` +
		`<rect width="${W}" height="${W}" fill="url(#g)"/></svg>`
)
const logo = await sharp(path.join(SRC, 'logo.png')).trim({ threshold: 1 }).resize({ width: 1100 }).toBuffer()
for (const name of ['splash.png', 'splash-dark.png'])
	await sharp(sky).composite([{ input: logo, gravity: 'center' }]).png().toFile(path.join(RES, name))

// 5. Обложка Play 1024x500: картинка GPT и логотип в левой половине, которую
// GPT оставил пустой под него.
const feature = await sharp(path.join(SRC, 'feature.png')).resize(1024, 500, { fit: 'cover' }).toBuffer()
const logoSmall = await sharp(path.join(SRC, 'logo.png')).trim({ threshold: 1 }).resize({ width: 430 }).toBuffer()
const lm = await sharp(logoSmall).metadata()
await sharp(feature)
	.composite([{ input: logoSmall, left: 40, top: Math.round((500 - lm.height) / 2) }])
	.png()
	.toFile(path.join(STORE, 'feature-1024x500.png'))

for (const f of ['icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png'])
	console.log('resources/' + f, (await sharp(path.join(RES, f)).metadata()).width)
console.log('_docs/store/icon-512.png, _docs/store/feature-1024x500.png')

// 6. После `capacitor-assets generate --android`: заставка разложена в 26 PNG
// (плотности × ориентации × тёмная тема) общим весом ~8 МБ — больше самой
// игры. Android понимает WebP, поэтому пережимаем их с тем же именем ресурса.
// Запуск: node _docs/store/make-store-assets.mjs --shrink-splash
if (process.argv.includes('--shrink-splash')) {
	const res = path.join(ROOT, 'android/app/src/main/res')
	let before = 0
	let after = 0
	for (const dir of fs.readdirSync(res).filter((d) => d.startsWith('drawable'))) {
		const png = path.join(res, dir, 'splash.png')
		if (!fs.existsSync(png)) continue
		const webp = png.replace(/\.png$/, '.webp')
		await sharp(png).webp({ quality: 85, effort: 6 }).toFile(webp)
		before += fs.statSync(png).size
		after += fs.statSync(webp).size
		fs.rmSync(png) // два ресурса с одним именем Android не соберёт
	}
	console.log('заставка:', (before / 1048576).toFixed(1), 'МБ →', (after / 1048576).toFixed(1), 'МБ')
}

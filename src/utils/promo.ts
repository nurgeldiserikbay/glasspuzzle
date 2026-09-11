/**
 * Наши же игры — то, что стоит в рекламном слоте, пока настоящего объявления
 * там нет, и что перечислено в разделе «Другие игры».
 *
 * СГЕНЕРИРОВАНО: tools/sync-promo.mjs. Руками не правьте — список берётся из
 * tools/games.mjs, и следующий запуск скрипта затрёт правку. Добавили игру в
 * Play — добавьте её в реестр и перезапустите скрипт.
 *
 * Зачем это вообще: слот под баннер зарезервирован всегда, иначе появление
 * рекламы сдвигает вёрстку. Но пустая полоса — это потерянные пиксели и вид
 * сломанного экрана, поэтому в ней живёт кросс-промо: пока AdMob не отдал
 * объявление (не загрузился, нет заполнения, нет сети, или это веб-версия) —
 * показываем одну из своих игр.
 *
 * ВАЖНО, это детское приложение. Своя реклама для Families Policy — такая же
 * реклама, как чужая, и к ней те же требования:
 *  - она помечена, чтобы не выглядела частью интерфейса игры;
 *  - в списке только игры с возрастным рейтингом не выше нашего — иначе это
 *    ровно то «ad content is not consistent with the app's content rating»,
 *    по которому игру уже отклоняли (фильтр — в tools/games.mjs);
 *  - уход в Play только через родительский гейт (ParentGate.vue), чтобы
 *    случайное касание ребёнка не выбрасывало его из приложения.
 */
export interface I_PromoGame {
	/** Имя файла иконки в `assets/promo` без расширения. */
	slug: string
	title: string
	appId: string
}

export const PROMO_GAMES: I_PromoGame[] = [
	{ slug: 'chessknightpuzzles', title: 'Chess Knight Puzzles', appId: 'com.thelightcome.chessknightpuzzles' },
	{ slug: 'mazeofmouse', title: 'Maze Of Mouse', appId: 'com.thelightcome.mazeofmouse' },
	{ slug: 'mathboxes', title: 'Math Boxes', appId: 'com.thelightcome.mathboxes' },
	{ slug: 'fruitopao', title: 'Fruito Pao', appId: 'com.thelightcome.fruitopao' },
	{ slug: 'bughunt', title: 'Bug Hunt', appId: 'com.thelightcome.bughunt' },
	{ slug: 'pianonotes', title: 'Piano Notes', appId: 'com.thelightcome.pianonotes' },
	{ slug: 'bubbledefense', title: 'Bubble Defense', appId: 'com.thelightcome.bubbledefense' },
	{ slug: 'fruitmatchpuzzle', title: 'Fruit Match Puzzle', appId: 'com.thelightcome.fruitmatchpuzzle' },
	{ slug: 'stackdrop', title: 'Stack Drop', appId: 'com.thelightcome.stackdrop' },
	{ slug: 'neocube', title: 'Neo Cube', appId: 'com.thelightcome.neocube' },
	{ slug: 'avoidbullets', title: 'Avoid Bullets', appId: 'com.thelightcome.avoidbullets' },
	{ slug: 'cutitright', title: 'Cut It Right', appId: 'com.thelightcome.cutitright' },
	{ slug: 'flowblocks', title: 'FlowBlocks', appId: 'com.thelightcome.flowblocks' },
]

/** Откуда пришёл переход — чтобы в консоли Play было видно, что это кросс-промо. */
const REFERRER = 'utm_source%3Dglasspuzzle%26utm_medium%3Dhouse_banner'

export function storeUrl(game: I_PromoGame): string {
	return `https://play.google.com/store/apps/details?id=${game.appId}&referrer=${REFERRER}`
}

/** Иконки живут файлами; грузится только та, что понадобилась. */
const icons = import.meta.glob('../assets/promo/*.webp', {
	eager: true,
	query: '?url',
	import: 'default',
}) as Record<string, string>

export function promoIcon(game: I_PromoGame): string {
	return icons[`../assets/promo/${game.slug}.webp`] ?? ''
}

/** Одна игра на сеанс показа. Случайно — чтобы за несколько партий игрок
 *  увидел разные, а не одну и ту же первую из списка. */
export function pickPromo(): I_PromoGame {
	return PROMO_GAMES[Math.floor(Math.random() * PROMO_GAMES.length)]
}

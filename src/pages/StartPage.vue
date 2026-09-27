<script lang="ts" setup>
import { ref } from 'vue'

import OtherGames from '@/components/OtherGames.vue'
import OtherGamesIcon from '@/components/OtherGamesIcon.vue'
import SoundToggles from '@/components/SoundToggles.vue'

import { usePageStore } from '@/store/pageStore'

import UiButton from '@/components/UiButton.vue'
import UiIcon from '@/components/UiIcon.vue'

import { PAGES } from '@/utils/conts'

const pageStore = usePageStore()

const isOtherGames = ref(false)

/**
 * Самоцветы вокруг логотипа: где стоят (в долях блока логотипа), какого
 * размера и с какой задержкой покачиваются — чтобы не двигались в такт.
 */
const GEMS = [
	{ n: 3, x: 6, y: -8, w: 44, r: -12, d: 0 },
	{ n: 1, x: 80, y: -12, w: 56, r: 10, d: 0.8 },
	{ n: 2, x: 92, y: 52, w: 44, r: 8, d: 1.6 },
	{ n: 5, x: -6, y: 70, w: 50, r: -6, d: 2.2 },
	{ n: 4, x: 76, y: 96, w: 52, r: -14, d: 1.2 },
].map((g) => ({
	src: new URL(`../assets/design/gem-${g.n}.webp`, import.meta.url).href,
	style: {
		left: `${g.x}%`,
		top: `${g.y}%`,
		width: `${g.w}px`,
		'--r': `${g.r}deg`,
		animationDelay: `${g.d}s`,
	},
}))
</script>

<template>
	<div class="page start-page">
		<!-- Вход в «Другие игры»: небольшой значок в углу. Приглушён намеренно —
		     раздел не должен спорить за внимание с кнопкой Play. -->
		<button
			class="promo-games"
			aria-label="Other games"
			@click="isOtherGames = true"
		>
			<OtherGamesIcon />
		</button>

		<!-- Музыка и эффекты — в противоположном углу от «Других игр». -->
		<SoundToggles class="start-page__sound" />

		<div class="start-page__body">
			<div class="start-page__logo">
				<!-- Самоцветы парят вокруг логотипа; чисто декор, для экранных дикторов их нет. -->
				<img
					v-for="gem in GEMS"
					:key="gem.src"
					:src="gem.src"
					class="gem"
					:style="gem.style"
					alt=""
					aria-hidden="true"
				/>
				<img class="start-page__logo-img" src="@/assets/design/logo.webp" alt="Glass Puzzle" />
			</div>

			<div class="start-page__btns">
				<div class="start-page__play">
					<svg class="rays" viewBox="0 0 24 32" aria-hidden="true">
						<path d="M20 6 10 2M21 16H9M20 26l-10 4" />
					</svg>
					<UiButton @click="pageStore.routeTo(PAGES.LEVEL)">
						<span>Play</span>
						<UiIcon name="play" class="start-page__play-icon" />
					</UiButton>
					<svg class="rays rays--right" viewBox="0 0 24 32" aria-hidden="true">
						<path d="M20 6 10 2M21 16H9M20 26l-10 4" />
					</svg>
				</div>
				<a
					href="https://docs.google.com/document/d/1XWkr7Mxj0en79WtJNmbAkaQXNh6s6HMP8xc93GZc3_8/edit?usp=sharing"
					target="_blank"
					class="privacy"
					>Privacy Policy</a
				>
			</div>
		</div>

		<OtherGames v-if="isOtherGames" @close="isOtherGames = false" />
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 15px;
	/* Подоконник и витраж; низ картинки — подоконник, туда встаёт кнопка. */
	background: url('@/assets/design/bg-start.webp') center bottom / cover no-repeat,
		var(--sky-bottom);

	&__body {
		display: flex;
		justify-content: space-around;
		align-items: center;
		flex-direction: column;
		flex-grow: 1;
	}

	&__logo {
		position: relative;
		width: min(88%, 330px);
		margin-top: 16vh;
		margin-bottom: 4vh;
	}

	&__logo-img {
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		filter: drop-shadow(0 8px 14px rgba(120, 80, 30, 0.25));
	}

	&__btns {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		/* С запасом на оправу и толщину глянцевой кнопки: при 18px ссылка
		   почти прилипала к её нижнему краю. */
		gap: 34px;
		/* Кнопка стоит на подоконнике, как на макете. */
		margin-top: auto;
		margin-bottom: 15vh;
	}
}

/* Самоцветы покачиваются вокруг логотипа, каждый со своей задержкой. */
.gem {
	position: absolute;
	z-index: 2;
	height: auto;
	pointer-events: none;
	transform: rotate(var(--r));
	filter: drop-shadow(0 6px 6px rgba(120, 80, 30, 0.25));
	animation: bob 3.6s ease-in-out infinite;
}

@keyframes bob {
	50% {
		transform: translateY(-8px) rotate(calc(var(--r) + 6deg));
	}
}

@media (prefers-reduced-motion: reduce) {
	.gem {
		animation: none;
	}
}

.start-page__play {
	display: flex;
	align-items: center;
	gap: 10px;

	.rays {
		width: 22px;
		height: 30px;
		fill: none;
		stroke: #fff;
		stroke-width: 3.5;
		stroke-linecap: round;
		filter: drop-shadow(0 1px 0 rgba(58, 156, 204, 0.5));

		&--right {
			transform: scaleX(-1);
		}
	}
}

.start-page__play-icon {
	font-size: 0.8em;
	margin-top: -4px;
}

/*
   Ссылка — обычным жирным шрифтом, как на макете: декоративный
   Luckiest Guy тут читается как ещё одна кнопка.
*/
.privacy {
	width: fit-content;
	display: inline-block;
	margin: 0 auto;
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-weight: 800;
	font-size: 15px;
	color: var(--ink);
	text-decoration: none;
	letter-spacing: 1px;
	text-align: center;
	padding: 2px 15px;
	margin-bottom: 35px;
}

/*
   Вход в «Другие игры».

   position: fixed, а не absolute: экран одностраничный и на весь вьюпорт, и так
   значок не зависит от того, позиционирован ли предок.
*/
.start-page__sound {
	position: fixed;
	top: 12px;
	left: 12px;
	z-index: 5;
}

.promo-games {
	position: fixed;
	top: 12px;
	right: 12px;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: rgba(255, 250, 240, 0.85);
	box-shadow: 0 2px 0 var(--card-depth);
	opacity: 0.9;
	cursor: pointer;
	color: var(--ink);
}

.promo-games svg {
	width: 20px;
	height: 20px;
}

.promo-games:active {
	opacity: 0.85;
}
</style>

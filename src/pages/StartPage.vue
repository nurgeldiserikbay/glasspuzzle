<script lang="ts" setup>
import { ref } from 'vue'

import OtherGames from '@/components/OtherGames.vue'
import OtherGamesIcon from '@/components/OtherGamesIcon.vue'

import { usePageStore } from '@/store/pageStore'

import UiButton from '@/components/UiButton.vue'

import { PAGES } from '@/utils/conts'

const pageStore = usePageStore()

const isOtherGames = ref(false)
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

		<div class="start-page__body">
			<div class="start-page__logo">
				<img src="@/assets/img/logotype.png" alt="" />
			</div>

			<div class="start-page__btns">
				<UiButton @click="pageStore.routeTo(PAGES.LEVEL)">Play</UiButton>
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

	&__body {
		display: flex;
		justify-content: space-around;
		align-items: center;
		flex-direction: column;
		flex-grow: 1;
	}

	&__logo {
		max-width: 280px;
		position: relative;
		/* Логотип нарисован под тёмный фон; на небе ему нужна своя опора. */
		filter: drop-shadow(0 6px 0 rgba(58, 156, 204, 0.35));
		margin-bottom: 35px;

		img {
			display: block;
			width: 100%;
		}

	}

	&__btns {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
		margin-bottom: 85px;

	}
}

.privacy {
	width: fit-content;
	display: inline-block;
	margin: 0 auto;
	font-size: 16px;
	color: var(--ink-soft);
	text-decoration: none;
	letter-spacing: 3px;
	text-align: center;
	padding: 2px 15px;
	margin-bottom: 35px;
}

/*
   Вход в «Другие игры».

   position: fixed, а не absolute: экран одностраничный и на весь вьюпорт, и так
   значок не зависит от того, позиционирован ли предок.
*/
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
	background: rgba(59, 61, 107, 0.12);
	opacity: 0.7;
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

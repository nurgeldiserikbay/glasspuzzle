<script lang="ts" setup>
import { ref } from 'vue'

import ParentGate from '@/components/ParentGate.vue'

import { PROMO_GAMES, promoIcon, storeUrl } from '@/utils/promo'
import type { I_PromoGame } from '@/utils/promo'

/**
 * Раздел «Другие игры» — наши же игры одним списком.
 *
 * Единственное место, откуда можно уйти в Google Play: и кнопка в меню, и
 * полоса кросс-промо на игровом экране ведут сюда, а не наружу. Так случайное
 * касание стоит игроку закрытия модалки, а не ухода из приложения.
 *
 * Сам уход — только через родительский гейт (ParentGate.vue).
 *
 * СГЕНЕРИРОВАНО: tools/templates/OtherGames.vue → tools/rollout-promo.mjs.
 * Правьте шаблон, а не копию: следующий запуск скрипта затрёт правку.
 */
const $emits = defineEmits(['close'])

/** Игра, для которой открыт гейт. `null` — гейт закрыт. */
const pending = ref<I_PromoGame | null>(null)
</script>

<template>
	<div class="games" @click="$emits('close')">
		<div class="games__in" @click.stop="">
			<div class="games__head">
				<div class="games__title">Other games</div>
				<button class="games__close" @click="$emits('close')">&times;</button>
			</div>

			<div class="games__note">More games from us. Ask a grown-up to open one.</div>

			<div class="games__list">
				<button
					v-for="game in PROMO_GAMES"
					:key="game.appId"
					class="game"
					@click="pending = game"
				>
					<img
						class="game__icon"
						:src="promoIcon(game)"
						:alt="game.title"
						width="44"
						height="44"
						loading="lazy"
					/>
					<span class="game__title">{{ game.title }}</span>
					<span class="game__go">Open</span>
				</button>
			</div>
		</div>

		<ParentGate
			v-if="pending"
			:href="storeUrl(pending)"
			:title="pending.title"
			@close="pending = null"
		/>
	</div>
</template>

<style lang="scss" scoped>
.games {
	position: fixed;
	inset: 0;
	z-index: 1100;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	background: rgba(4, 6, 22, 0.9);

	&__in {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 400px;
		max-height: 84vh;
		padding: 16px 14px 8px;
		border-radius: 18px;
		background: linear-gradient(180deg, #1a2148, #0e1330);
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.1),
			0 18px 40px rgba(2, 4, 16, 0.7);
	}

	&__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 0 4px;
	}

	&__title {
		font-size: 17px;
		font-weight: 900;
		color: #fff;
	}

	&__close {
		flex: 0 0 30px;
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 9px;
		background: rgba(255, 255, 255, 0.1);
		cursor: pointer;
		font-size: 20px;
		line-height: 1;
		color: #fff;
	}

	&__note {
		margin-top: 5px;
		padding: 0 4px;
		font-size: 11px;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.5);
	}

	&__list {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
		padding: 0 2px 8px;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
}

.game {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	padding: 8px 10px;
	border: none;
	border-radius: 13px;
	background: rgba(255, 255, 255, 0.07);
	box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.07);
	cursor: pointer;
	text-align: left;

	&:active {
		background: rgba(255, 255, 255, 0.13);
	}

	&__icon {
		flex: 0 0 44px;
		width: 44px;
		height: 44px;
		border-radius: 11px;
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.14);
	}

	&__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 14px;
		font-weight: 900;
		color: #fff;
	}

	&__go {
		flex: 0 0 auto;
		padding: 6px 11px;
		border-radius: 10px;
		background: linear-gradient(180deg, #9280f7, #6246d6);
		box-shadow: 0 2px 0 #3f2ba0;
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: #fff;
	}
}
</style>

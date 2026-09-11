<script lang="ts" setup>
import { ref } from 'vue'

import { useAdsStore } from '@/store/adsStore'
import { pickPromo, promoIcon } from '@/utils/promo'

/**
 * Место под баннер — всегда занятое.
 *
 * Раньше высота слота появлялась вместе с рекламой: приходил баннер — вёрстка
 * прыгала, не приходил — оставалась пустая полоса. Теперь полоса зарезервирована
 * с самого начала и никогда не пустует.
 *
 * Что в ней стоит, решает не этот компонент, а наличие настоящего объявления:
 * нативный баннер рисуется поверх вебвью и просто закрывает эту строку собой.
 * Пока его нет — не загрузился, нет заполнения, нет сети или это вообще
 * веб-версия — в строке живёт одна из наших же игр.
 *
 * Игра выбирается один раз при создании слота, а не по таймеру: полоса стоит
 * у игрового поля, и ничего мелькающего там быть не должно.
 *
 * Касание ведёт не в Play, а в наш же список игр внутри приложения, и только
 * когда это разрешено (`interactive`). Причина ровно та, что Google пишет в
 * отказе: «designed in a way that will result in inadvertent clicks from child
 * users». Полоса стоит вплотную к игровому полю, так что случайное касание
 * неизбежно — и оно не должно ни выбрасывать ребёнка из приложения, ни стоить
 * ему партии.
 *
 * СГЕНЕРИРОВАНО: tools/templates/AdSlot.vue → tools/rollout-promo.mjs.
 * Правьте шаблон, а не копию: следующий запуск скрипта затрёт правку.
 */
const $props = withDefaults(
	defineProps<{
		/** Разрешено ли открывать список игр прямо сейчас. */
		interactive?: boolean
	}>(),
	{ interactive: false }
)

const $emits = defineEmits(['open'])

const adsStore = useAdsStore()

const game = ref(pickPromo())

function tap() {
	if ($props.interactive) $emits('open')
}
</script>

<template>
	<div class="slot">
		<component
			:is="interactive ? 'button' : 'div'"
			v-if="!adsStore.bannerLive"
			class="house"
			:class="{ 'house--tap': interactive }"
			@click="tap"
		>
			<img
				class="house__icon"
				:src="promoIcon(game)"
				:alt="game.title"
				width="40"
				height="40"
			/>

			<span class="house__text">
				<!--
					Метка обязательна: своя реклама для Families Policy — такая же
					реклама, как чужая, и она не должна выглядеть частью интерфейса.
				-->
				<span class="house__label">Ad &middot; our game</span>
				<b class="house__title">{{ game.title }}</b>
			</span>

			<span class="house__go">Open</span>
		</component>
	</div>
</template>

<style lang="scss" scoped>
.slot {
	/*
	   Полоса занимает всю рекламную зону — от верха объявления и до самой
	   кромки экрана.

	   Она не отодвинута вниз на системный инсет, а растёт вниз: инсет входит в
	   её высоту (--ad-band), а не в её отступ. Иначе над кросс-промо оставалась
	   бы пустая кромка в те моменты, когда объявления нет.
	*/
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: var(--ad-band, 56px);
	z-index: 4;
	overflow: hidden;
	/* Слот темнее игры: полоса должна читаться как техническая, а не как часть
	   интерфейса, иначе игрок принимает её за элемент управления. */
	background: linear-gradient(180deg, #10173a, #0a0e26);
	box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.08);
}

.house {
	display: flex;
	align-items: center;
	gap: 10px;
	/* Прижато к верху зоны: если инсет есть, объявление встанет именно там, и
	   кросс-промо должно стоять на его месте, а не под ним. */
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: var(--ad-slot, 56px);
	width: 100%;
	padding: 0 12px;
	border: none;
	background: transparent;
	text-align: left;

	&--tap {
		cursor: pointer;
	}

	&__icon {
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.14),
			0 2px 6px rgba(4, 6, 22, 0.6);
	}

	&__text {
		flex: 1;
		min-width: 0;
	}

	&__label {
		display: block;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 1.4px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}

	&__title {
		display: block;
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
		border-radius: 11px;
		background: linear-gradient(180deg, #9280f7, #6246d6);
		box-shadow: 0 3px 0 #3f2ba0;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: #fff;
	}

	&--tap:active .house__go {
		transform: translateY(2px);
		box-shadow: 0 1px 0 #3f2ba0;
	}
}
</style>

<script lang="ts" setup>
import UiIcon from '@/components/UiIcon.vue'

defineProps<{
	/** Собранная картинка — показывается целиком как награда. */
	img: string
	time: string
	/** Есть ли следующий уровень: на последнем кнопка «дальше» не нужна. */
	hasNext: boolean
}>()

const $emits = defineEmits(['close', 'next'])
</script>

<template>
	<div class="result">
		<div class="result__card">
			<div class="result__title">Well done!</div>
			<img class="result__img" :src="img" alt="" />
			<div class="result__time">
				<UiIcon name="clock" />
				<span>{{ time }}</span>
			</div>
			<div class="result__btns">
				<button class="result__btn result__home" aria-label="Home" @click="$emits('close')">
					<UiIcon name="home" />
				</button>
				<button
					v-if="hasNext"
					class="result__btn result__next"
					@click="$emits('next')"
				>
					<span>Next</span>
					<UiIcon name="next" />
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.result {
	position: absolute;
	inset: 0;
	z-index: 1000;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px 20px calc(var(--ad-band) + 20px);
	box-sizing: border-box;
	background: rgba(59, 61, 107, 0.35);
	animation: fade 0.25s ease-out;

	&__card {
		@include card;
		width: 100%;
		max-width: 340px;
		padding: 22px 20px 26px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	&__title {
		font-size: 34px;
		color: var(--sun);
		letter-spacing: 1px;
		-webkit-text-stroke: 2px var(--sun-deep);
		paint-order: stroke fill;
		text-shadow: 0 3px 0 var(--sun-deep);
	}

	&__img {
		/* Рамка облегает картинку любой ориентации — без белых полей по бокам. */
		display: block;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 38vh;
		border-radius: 12px;
		border: 4px solid #fff;
		box-shadow: 0 4px 0 var(--card-edge);
		box-sizing: border-box;
	}

	&__time {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 22px;
		color: var(--ink);
		letter-spacing: 1px;

		.ui-icon {
			color: var(--ink-soft);
		}
	}

	&__btns {
		display: flex;
		gap: 14px;
		width: 100%;
		justify-content: center;
	}

	&__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 58px;
		border-radius: 18px;
		cursor: pointer;
		font-size: 26px;
		color: #fff;
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
	}

	&__home {
		@include chunky(var(--sky), var(--sky-deep), 5px);
		width: 64px;
		padding: 0;
		font-size: 30px;
	}

	&__next {
		@include chunky(var(--mint), var(--mint-deep), 5px);
		flex-grow: 1;
		max-width: 200px;
		padding: 4px 18px 0;

		.ui-icon {
			margin-top: -4px;
		}
	}
}

@keyframes fade {
	from {
		opacity: 0;
	}
}

@keyframes pop {
	from {
		transform: scale(0.7);
		opacity: 0;
	}
}
</style>

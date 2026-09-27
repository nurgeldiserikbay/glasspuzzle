<script lang="ts" setup>
import UiIcon from '@/components/UiIcon.vue'
import ShineTitle from '@/components/ShineTitle.vue'

defineProps<{
	/** Собранная картинка — показывается целиком как награда. */
	img: string
	time: string
	/** Есть ли следующий уровень: на последнем кнопка «дальше» не нужна. */
	hasNext: boolean
}>()

const $emits = defineEmits(['close', 'next'])

/** Самоцветы по углам собранной картинки — выпрыгивают по очереди. */
const GEMS = [
	{ n: 3, cls: 'result__gem--tl' },
	{ n: 1, cls: 'result__gem--tr' },
	{ n: 2, cls: 'result__gem--bl' },
	{ n: 4, cls: 'result__gem--br' },
].map((g) => ({ cls: g.cls, src: new URL(`../assets/design/gem-${g.n}.webp`, import.meta.url).href }))
</script>

<template>
	<div class="result">
		<div class="result__card">
			<ShineTitle tone="sun" class="result__title">Well done!</ShineTitle>
			<div class="result__pic">
				<img class="result__img" :src="img" alt="" />
				<img
					v-for="gem in GEMS"
					:key="gem.cls"
					class="result__gem"
					:class="gem.cls"
					:src="gem.src"
					alt=""
					aria-hidden="true"
				/>
			</div>
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
		border-width: 3px;
		border-radius: 26px;
		box-shadow: 0 8px 0 var(--card-depth), 0 18px 40px rgba(59, 61, 107, 0.25);
		padding: 22px 20px 26px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	&__title {
		font-size: 40px;
	}

	&__pic {
		position: relative;
		display: flex;
		justify-content: center;
		max-width: 100%;
	}

	&__gem {
		position: absolute;
		width: 46px;
		height: 46px;
		object-fit: contain;
		filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.2));
		animation: gem-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		pointer-events: none;

		&--tl {
			top: 8%;
			left: -30px;
			--r: -18deg;
			animation-delay: 0.25s;
		}
		&--tr {
			top: 4%;
			right: -30px;
			--r: 14deg;
			animation-delay: 0.35s;
		}
		&--bl {
			bottom: 6%;
			left: -28px;
			--r: -8deg;
			animation-delay: 0.45s;
		}
		&--br {
			bottom: 10%;
			right: -28px;
			--r: 20deg;
			animation-delay: 0.55s;
		}
	}

	&__img {
		/* Рамка облегает картинку любой ориентации — без белых полей по бокам. */
		display: block;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 38vh;
		border-radius: 12px;
		border: 6px solid #fff;
		box-shadow:
			0 0 0 2px var(--card-edge),
			0 6px 0 2px var(--card-depth);
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
		gap: 20px;
		padding: 0 4px 6px;
		box-sizing: border-box;
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
		@include gloss(var(--sky-light), var(--sky), var(--sky-deep));
		width: 64px;
		padding: 0;
		font-size: 30px;
	}

	&__next {
		@include gloss(var(--mint-light), var(--mint), var(--mint-deep));
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

@keyframes gem-pop {
	from {
		transform: scale(0) rotate(var(--r));
		opacity: 0;
	}
	to {
		transform: scale(1) rotate(var(--r));
	}
}

@keyframes pop {
	from {
		transform: scale(0.7);
		opacity: 0;
	}
}
</style>

<script lang="ts" setup>
withDefaults(defineProps<{}>(), {})

const $emits = defineEmits(['close', 'next'])
</script>

<template>
	<div class="result">
		<div class="result__in">
			<div class="result__btns">
				<button class="result__btn result__home" @click="$emits('close')">
					<img src="@/assets/img/home.png" alt="" />
				</button>
				<button class="result__btn result__next" @click="$emits('next')">
					<img src="@/assets/img/next.png" alt="" />
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.result {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	background: rgba(0, 0, 0, 0.3);

	&__in {
		position: relative;
		padding: 65px 28px 68px;
		border-radius: 12px;
		height: 60vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		justify-content: space-around;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 100px;
		width: 80%;
		max-width: 360px;
		backdrop-filter: blur(3px);
		border-radius: 18px;
		font-size: 22px;
	}

	&__btns {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;
		gap: 35px;
		width: 100%;

		img {
			display: block;
			width: 100%;
		}
	}

	&__btn {
		flex-shrink: 0;
		display: block;
		display: inline-block;
		width: 140px;
		padding: 0;
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
	}

	&__next {
		width: 100px;
	}
}
</style>

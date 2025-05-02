<script lang="ts" setup>
withDefaults(
	defineProps<{
		bg?: string
		width?: number
		size?: string
	}>(),
	{
		bg: '',
		width: 150,
		size: '',
	}
)
</script>

<template>
	<button
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: true, [`ui-button--${size}`]: true }"
		:style="{ width: `${width}px` }"
	>
		<slot></slot>
	</button>
</template>

<style lang="scss" scoped>
.ui-button {
	display: inline-block;
	width: 150px;
	aspect-ratio: 2.05;
	border-radius: 18px;
	border: none;
	outline: none;
	cursor: pointer;
	padding-bottom: 15px;
	padding-right: 5px;
	box-sizing: border-box;
	background-size: contain;
	background-color: transparent;
	background-image: url('@/assets/img/start.png');
	background-repeat: no-repeat;

	&--small {
		font-size: 24px;
	}
}
</style>

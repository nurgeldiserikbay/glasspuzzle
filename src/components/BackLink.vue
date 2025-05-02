<script lang="ts" setup>
import { usePageStore } from '@/store/pageStore'

const pageStore = usePageStore()

function back() {
	pageStore.toBackLink()
}
</script>

<template>
	<button class="back-link" @click="back">
		<img src="@/assets/img/back.png" alt="exit" />
	</button>
</template>

<style lang="scss" scoped>
.back-link {
	background: transparent;
	padding: 0;
	border: none;
	outline: none;
	cursor: pointer;

	img {
		height: 40px;
	}
}
</style>

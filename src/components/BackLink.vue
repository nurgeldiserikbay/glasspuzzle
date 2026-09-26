<script lang="ts" setup>
import UiIcon from '@/components/UiIcon.vue'
import { usePageStore } from '@/store/pageStore'

const pageStore = usePageStore()

function back() {
	pageStore.toBackLink()
}
</script>

<template>
	<button class="back-link" aria-label="Back" @click="back">
		<UiIcon name="back" />
	</button>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.back-link {
	@include chunky(var(--card), var(--card-edge), 4px);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	padding: 0;
	border-radius: 14px;
	color: var(--ink);
	font-size: 26px;
	cursor: pointer;
	flex-shrink: 0;
}
</style>

<script lang="ts" setup>
withDefaults(
	defineProps<{
		/** Цвет кнопки: мятная — главное действие, солнечная и небесная — второстепенные. */
		tone?: 'mint' | 'sun' | 'sky' | 'coral'
		size?: 'big' | 'small'
	}>(),
	{
		tone: 'mint',
		size: 'big',
	}
)
</script>

<template>
	<button class="ui-button" :class="[`ui-button--${tone}`, `ui-button--${size}`]">
		<slot></slot>
	</button>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.ui-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border-radius: 20px;
	outline: none;
	cursor: pointer;
	color: #fff;
	letter-spacing: 1px;
	// Белые буквы на светлом тоне читаются только с тёмным контуром.
	text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);

	&--big {
		min-width: 200px;
		padding: 16px 30px 12px;
		font-size: 30px;
	}

	&--small {
		min-width: 120px;
		padding: 11px 20px 8px;
		font-size: 20px;
	}

	&--mint {
		@include chunky(var(--mint), var(--mint-deep), 6px);
	}
	&--sun {
		@include chunky(var(--sun), var(--sun-deep), 6px);
	}
	&--sky {
		@include chunky(var(--sky), var(--sky-deep), 6px);
	}
	&--coral {
		@include chunky(var(--coral), var(--coral-deep), 6px);
	}
}
</style>

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
	// Белые буквы на светлом стекле читаются только с тёмным контуром.
	text-shadow: 0 2px 0 rgba(0, 0, 0, 0.22);

	&--big {
		min-width: 230px;
		padding: 18px 34px 12px;
		font-size: 34px;
		border-radius: 24px;
	}

	&--small {
		min-width: 120px;
		padding: 11px 20px 8px;
		font-size: 20px;
	}

	&--mint {
		@include gloss(var(--mint-light), var(--mint), var(--mint-deep));
	}
	&--sun {
		@include gloss(var(--sun-light), var(--sun), var(--sun-deep));
	}
	&--sky {
		@include gloss(var(--sky-light), var(--sky), var(--sky-deep));
	}
	&--coral {
		@include gloss(var(--coral-light), var(--coral), var(--coral-deep));
	}
}
</style>

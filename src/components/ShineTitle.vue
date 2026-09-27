<script lang="ts" setup>
/**
 * Заголовок с макета: пухлые буквы с толстой обводкой и объёмом снизу, по
 * бокам — лучики-чёрточки. sky — белые буквы на голубом («Pictures»),
 * sun — золотые («Well done!»).
 */
withDefaults(defineProps<{ tone?: 'sky' | 'sun' }>(), { tone: 'sky' })
</script>

<template>
	<div class="shine-title" :class="`shine-title--${tone}`">
		<svg class="shine-title__rays" viewBox="0 0 24 32" aria-hidden="true">
			<path d="M20 6 10 2M21 16H9M20 26l-10 4" />
		</svg>
		<span class="shine-title__text"><slot /></span>
		<svg class="shine-title__rays shine-title__rays--right" viewBox="0 0 24 32" aria-hidden="true">
			<path d="M20 6 10 2M21 16H9M20 26l-10 4" />
		</svg>
	</div>
</template>

<style lang="scss" scoped>
.shine-title {
	display: inline-flex;
	align-items: center;
	gap: 6px;

	&__text {
		letter-spacing: 1px;
		paint-order: stroke fill;
		white-space: nowrap;
	}

	&__rays {
		width: 0.7em;
		height: 0.9em;
		flex-shrink: 0;
		fill: none;
		stroke: var(--sun);
		stroke-width: 3.5;
		stroke-linecap: round;

		&--right {
			transform: scaleX(-1);
		}
	}

	&--sky &__text {
		color: #fff;
		-webkit-text-stroke: 5px var(--sky-deep);
		text-shadow: 0 4px 0 var(--sky-deep);
	}

	&--sun &__text {
		color: var(--sun);
		-webkit-text-stroke: 5px #c9771a;
		text-shadow: 0 4px 0 #c9771a;
	}
}
</style>

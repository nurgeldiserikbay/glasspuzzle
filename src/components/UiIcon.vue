<script lang="ts" setup>
/**
 * Нарисованные иконки игры. Контурные, толщина линии одна на весь набор,
 * цвет — от родителя (currentColor), поэтому одна и та же иконка годится и на
 * кремовую кнопку, и на мятную.
 */
defineProps<{
	name:
		| 'back'
		| 'eye'
		| 'home'
		| 'next'
		| 'lock'
		| 'check'
		| 'rotate'
		| 'clock'
		| 'shard'
		| 'replay'
}>()
</script>

<template>
	<svg
		class="ui-icon"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.6"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<template v-if="name === 'back'">
			<path d="M14.5 5.5 8 12l6.5 6.5" />
		</template>
		<template v-else-if="name === 'eye'">
			<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
			<circle cx="12" cy="12" r="3" />
		</template>
		<template v-else-if="name === 'home'">
			<path d="M4 11 12 4.5l8 6.5" />
			<path d="M6.5 9.5V19h11V9.5" />
			<path d="M10.5 19v-4.5h3V19" />
		</template>
		<template v-else-if="name === 'next'">
			<path d="M9.5 5.5 16 12l-6.5 6.5" />
		</template>
		<template v-else-if="name === 'lock'">
			<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" />
			<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
		</template>
		<template v-else-if="name === 'check'">
			<path d="m5.5 12.5 4 4 9-9" />
		</template>
		<template v-else-if="name === 'rotate'">
			<path d="M19 12a7 7 0 1 1-2.05-4.95" />
			<path d="M19.5 4.5v4h-4" />
		</template>
		<template v-else-if="name === 'clock'">
			<circle cx="12" cy="12" r="8" />
			<path d="M12 7.5V12l3 2" />
		</template>
		<template v-else-if="name === 'shard'">
			<path d="M5 8.5 11 3.5l8 4-2 10-8.5 3L4 14Z" />
			<path d="m11 3.5-1.5 8 7.5-4M9.5 11.5 8.5 20.5" />
		</template>
		<template v-else-if="name === 'replay'">
			<path d="M5 12a7 7 0 1 0 2.05-4.95" />
			<path d="M4.5 4.5v4h4" />
		</template>
	</svg>
</template>

<style lang="scss" scoped>
.ui-icon {
	display: block;
	width: 1em;
	height: 1em;
}
</style>

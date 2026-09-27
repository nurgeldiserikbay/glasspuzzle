<script lang="ts" setup>
import UiIcon from '@/components/UiIcon.vue'
import { musicOn, sfxOn, sound } from '@/utils/sound'

/** Две кнопки: музыка и эффекты, по отдельности. Выбор запоминается. */
</script>

<template>
	<div class="sound-toggles">
		<button
			class="toggle"
			:class="{ 'toggle--off': !musicOn }"
			:aria-label="musicOn ? 'Turn music off' : 'Turn music on'"
			:aria-pressed="musicOn"
			@click="sound.setMusic(!musicOn)"
		>
			<UiIcon :name="musicOn ? 'music' : 'music-off'" />
		</button>
		<button
			class="toggle"
			:class="{ 'toggle--off': !sfxOn }"
			:aria-label="sfxOn ? 'Turn sounds off' : 'Turn sounds on'"
			:aria-pressed="sfxOn"
			@click="sound.setSfx(!sfxOn)"
		>
			<UiIcon :name="sfxOn ? 'sound' : 'sound-off'" />
		</button>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.sound-toggles {
	display: flex;
	gap: 10px;
}

.toggle {
	@include chunky(var(--card), var(--card-edge), 4px);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	padding: 0;
	border-radius: 14px;
	color: var(--sky-deep);
	font-size: 24px;
	cursor: pointer;

	/* Выключенное — приглушено, но остаётся видно, куда нажать. */
	&--off {
		color: var(--ink-soft);
		opacity: 0.75;
	}
}
</style>

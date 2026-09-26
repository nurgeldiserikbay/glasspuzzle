<script lang="ts" setup>
import { ref, computed } from 'vue'

import BackLink from '@/components/BackLink.vue'
import UiIcon from '@/components/UiIcon.vue'

import LEVELS from '@/game/levels'
import { PIECE_COUNT } from '@/game/shatter'
import type { Difficulty } from '@/game/interfaces'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import { PAGES } from '@/utils/conts'

const gameStore = useGameStore()
const pageStore = usePageStore()

const selectStrange = ref(false)
const getStatus = computed(() => (id: number) => {
	if (gameStore.isSolved(id)) return 'solved'
	else if (gameStore.lastSolved === id) return 'active'
	return ''
})

/** Чем сложности отличаются — показывается прямо на кнопке, а не в правилах. */
const MODES: { id: Difficulty; title: string; note: string; tone: string }[] = [
	{ id: 'easy', title: 'Easy', note: `${PIECE_COUNT.easy} pieces`, tone: 'mint' },
	{ id: 'medium', title: 'Medium', note: `${PIECE_COUNT.medium} pieces · turning`, tone: 'sky' },
	{ id: 'hard', title: 'Hard', note: `${PIECE_COUNT.hard} pieces · no hint`, tone: 'coral' },
]

function selectLevel(id: number) {
	if (getStatus.value(id)) {
		gameStore.setCurrentLevel(id)
		selectStrange.value = true
	}
}

function setDifficulty(difficulty: Difficulty) {
	gameStore.setDifficulty(difficulty)
	selectStrange.value = false
	pageStore.routeTo(PAGES.PLAY)
}
</script>

<template>
	<div class="page level-page">
		<div class="level-page__head">
			<BackLink />
			<div class="level-page__title">Pictures</div>
		</div>

		<div class="level-page__levels">
			<button
				v-for="level in LEVELS"
				:key="level.id"
				class="level"
				:class="getStatus(level.id) || 'locked'"
				:disabled="!getStatus(level.id)"
				@click="selectLevel(level.id)"
			>
				<img :src="level.src" alt="" loading="lazy" />
				<span v-if="!getStatus(level.id)" class="level__badge level__badge--lock">
					<UiIcon name="lock" />
				</span>
				<span
					v-if="getStatus(level.id) === 'solved'"
					class="level__badge level__badge--done"
				>
					<UiIcon name="check" />
				</span>
			</button>
		</div>

		<Teleport to="body">
			<div v-if="selectStrange" class="modal" @click.self="selectStrange = false">
				<div class="modal__content">
					<h2>Difficulty</h2>
					<div class="modal__buttons">
						<button
							v-for="mode in MODES"
							:key="mode.id"
							class="mode"
							:class="`mode--${mode.tone}`"
							@click="setDifficulty(mode.id)"
						>
							<span class="mode__title">{{ mode.title }}</span>
							<span class="mode__note">{{ mode.note }}</span>
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.level-page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 12px 14px 0;
	overflow: hidden;

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 14px;
	}

	&__title {
		font-size: 28px;
		letter-spacing: 1px;
		color: #fff;
		-webkit-text-stroke: 2px var(--sky-deep);
		paint-order: stroke fill;
		text-shadow: 0 3px 0 var(--sky-deep);
		padding-top: 4px;
	}

	&__levels {
		flex-grow: 1;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		padding: 4px 2px 40px;
		align-content: start;
	}
}

.level {
	position: relative;
	aspect-ratio: 1;
	padding: 4px;
	border-radius: 16px;
	background: #fff;
	border: 2px solid var(--card-edge);
	box-shadow: 0 5px 0 var(--card-depth);
	cursor: pointer;
	transition:
		transform 0.08s,
		box-shadow 0.08s;

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 11px;
	}

	&:active:not(:disabled) {
		transform: translateY(4px);
		box-shadow: 0 1px 0 var(--card-depth);
	}

	/* Следующая картинка — с солнечной рамкой, чтобы было видно, куда жать. */
	&.active {
		border-color: var(--sun-deep);
		box-shadow:
			0 5px 0 var(--sun-deep),
			0 0 0 4px rgba(255, 212, 107, 0.55);
		animation: glow 1.6s ease-in-out infinite;
	}

	&.locked {
		cursor: default;
		background: #f3efe6;

		img {
			filter: grayscale(0.85) brightness(1.1) contrast(0.8);
			opacity: 0.55;
		}
	}

	&__badge {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: #fff;

		&--lock {
			top: 50%;
			left: 50%;
			width: 38px;
			height: 38px;
			transform: translate(-50%, -50%);
			background: var(--ink-soft);
			border: 2px solid #fff;
			font-size: 20px;
		}

		&--done {
			top: -6px;
			right: -6px;
			width: 30px;
			height: 30px;
			background: var(--mint);
			border: 2px solid var(--mint-deep);
			box-shadow: 0 2px 0 var(--mint-deep);
			font-size: 18px;
		}
	}
}

.modal {
	position: fixed;
	inset: 0;
	background: rgba(59, 61, 107, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;

	&__content {
		@include card;
		width: 100%;
		max-width: 320px;
		padding: 22px 20px 26px;
		box-sizing: border-box;
		text-align: center;

		h2 {
			margin: 0 0 18px;
			font-family: LuckiestGuy, sans-serif;
			font-weight: 400;
			font-size: 28px;
			letter-spacing: 1px;
			color: var(--ink);
		}
	}

	&__buttons {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
}

.mode {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	padding: 12px 16px 8px;
	border-radius: 16px;
	color: #fff;
	cursor: pointer;
	text-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);

	&__title {
		font-size: 26px;
		letter-spacing: 1px;
	}

	&__note {
		font-size: 14px;
		letter-spacing: 0.5px;
		opacity: 0.95;
	}

	&--mint {
		@include chunky(var(--mint), var(--mint-deep));
	}
	&--sky {
		@include chunky(var(--sky), var(--sky-deep));
	}
	&--coral {
		@include chunky(var(--coral), var(--coral-deep));
	}
}

@keyframes glow {
	50% {
		box-shadow:
			0 5px 0 var(--sun-deep),
			0 0 0 7px rgba(255, 212, 107, 0.35);
	}
}
</style>

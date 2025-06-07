<script lang="ts" setup>
import { ref, computed } from 'vue'

import IconPadlock from '@/assets/img/padlock.svg'
import IconApproved from '@/assets/img/approved.svg'

import BackLink from '@/components/BackLink.vue'

import LEVELS from '@/game/levels'

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

function selectLevel(id: number) {
	if (getStatus.value(id)) {
		gameStore.setCurrentLevel(id)
		selectStrange.value = true
	}
}

function setDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
	gameStore.setDifficulty(difficulty)
	selectStrange.value = false
	pageStore.routeTo(PAGES.PLAY)
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
		</div>

		<div class="page__levels">
			<div
				v-for="level in LEVELS"
				:key="level.id"
				class="page__level"
				@click="selectLevel(level.id)"
			>
				<div :class="{ [getStatus(level.id)]: true }" class="level">
					<img :src="level.src" alt="" />
					<IconPadlock v-if="!getStatus(level.id)" class="padloack" />
					<IconApproved
						v-if="getStatus(level.id) === 'solved'"
						class="approved"
					/>
					<div
						:style="{
							transform: `rotateZ(${
								20 + Math.random() * 40
							}deg) translate(1em, -0.5em)`,
						}"
						class="shines"
					></div>
				</div>
			</div>
		</div>

		<Teleport to="body">
			<div v-if="selectStrange" class="modal">
				<div class="modal__content">
					<h2>Select Difficulty</h2>
					<div class="modal__buttons">
						<button @click="setDifficulty('easy')">Easy</button>
						<button @click="setDifficulty('medium')">Medium</button>
						<button @click="setDifficulty('hard')">Hard</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" scoped>
$b: 0.5em;
$blur: blur(9px);
$rect: inset(0);

.page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 15px 15px 0;
	overflow: hidden;

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		width: 100%;
		box-sizing: border-box;
		padding: 0 10px;
		margin-bottom: 10px;
	}

	&__levels {
		flex-grow: 1;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
		padding-bottom: 45px;
	}
}

.level {
	position: relative;
	aspect-ratio: 1;
	overflow: hidden;
	background: rgba(235, 74, 212, 0.1);
	border-radius: 16px;
	box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
	backdrop-filter: blur(5.6px);
	-webkit-backdrop-filter: blur(5.6px);
	border: 2px solid rgba(235, 74, 212, 0.4);
	padding: 1px;
	opacity: 0.4;
	pointer-events: none;

	&.active {
		pointer-events: unset;
		cursor: pointer;
		opacity: 1;
	}

	&.solved {
		cursor: pointer;
		opacity: 1;
		background: rgba(0, 169, 3, 0.1);
		border: 2px solid rgba(0, 169, 3, 0.1);

		.shines {
			background: linear-gradient(
				to bottom,
				rgba(0, 169, 3, 0) 0%,
				rgba(0, 169, 3, 0.2) 50%,
				rgba(0, 169, 3, 0) 100%
			);
		}
	}

	.padloack {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 20%;
		transform: translate(-50%, -50%);
		fill: #fff;
	}

	.approved {
		position: absolute;
		top: 5px;
		right: 5px;
		width: 20%;
		height: 20%;
		background: rgb(255, 255, 255);
		background: radial-gradient(
			circle,
			rgba(255, 255, 255, 1) 0%,
			rgba(255, 255, 255, 0) 80%
		);
		border-radius: 50%;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 10px;
		display: block;
	}

	.shines {
		content: '';
		position: absolute;
		top: -50%;
		right: -50%;
		bottom: -50%;
		left: -50%;
		background: linear-gradient(
			to bottom,
			rgba(229, 172, 142, 0) 30%,
			rgba(255, 255, 255, 0.5) 50%,
			rgba(229, 172, 142, 0) 70%
		);
	}
}

.modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;

	&__content {
		background: rgba(255, 255, 255, 0.9);
		padding: 2em;
		border-radius: 1em;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
		text-align: center;
		backdrop-filter: blur(10px);

		h2 {
			margin: 0 0 1em;
			color: #333;
			font-size: 1.5em;
			letter-spacing: 0.05em;
		}
	}

	&__buttons {
		display: flex;
		flex-direction: column;
		gap: 1em;
		justify-content: center;
		letter-spacing: 0.05em;

		button {
			padding: 0.5em 1.5em;
			border: none;
			border-radius: 0.5em;
			background: linear-gradient(135deg, #6e8efb, #a777e3);
			color: white;
			font-size: 1em;
			cursor: pointer;
			transition: transform 0.2s, box-shadow 0.2s;

			&:hover {
				transform: translateY(-2px);
				box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
			}

			&:active {
				transform: translateY(0);
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
			}
		}
	}
}
</style>

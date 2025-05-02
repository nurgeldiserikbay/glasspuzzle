<script lang="ts" setup>
import { computed } from 'vue'

import IconPadlock from '@/assets/img/padlock.svg'
import IconApproved from '@/assets/img/approved.svg'

import BackLink from '@/components/BackLink.vue'

import LEVELS from '@/game/levels'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import { PAGES } from '@/utils/conts'

const gameStore = useGameStore()
const pageStore = usePageStore()

const getStatus = computed(() => (id: number) => {
	if (gameStore.isSolved(id)) return 'solved'
	else if (gameStore.lastSolved === id) return 'active'
	return ''
})

function selectLevel(id: number) {
	if (getStatus.value(id)) {
		gameStore.setCurrentLevel(id)
		pageStore.routeTo(PAGES.PLAY)
	}
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
</style>

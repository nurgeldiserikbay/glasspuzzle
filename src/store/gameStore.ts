import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

import LEVELS from '@/game/levels'

export interface IGameStat {
	date: string
	time: string
}

export type IGameStats = {
	[key: number]: IGameStat
}

export const useGameStore = defineStore('GameStore', () => {
	const currentLevel = ref(0)
	function setCurrentLevel(id: number) {
		currentLevel.value = id
	}

	const gameStats = ref<IGameStats>({})
	const isSolved = computed(() => (id: number) => {
		return gameStats.value[id]
	})
	const lastSolved = computed(() => {
		return LEVELS.find((l) => !isSolved.value(l.id))?.id
	})
	watch(
		() => gameStats.value,
		async () => {
			await Preferences.set({
				key: 'gameStats',
				value: JSON.stringify(gameStats.value),
			})
		},
		{ deep: true }
	)
	function updateGameStat(id: number, date: string, time: string) {
		gameStats.value[id] = {
			date,
			time,
		}
	}

	async function loadData() {
		const res = await Preferences.get({ key: 'gameStats' })

		if (res.value) {
			gameStats.value = JSON.parse(res.value) as IGameStats
		}
	}

	const difficulty = ref<'easy' | 'medium' | 'hard'>('easy')
	function setDifficulty(difficultyValue: 'easy' | 'medium' | 'hard') {
		difficulty.value = difficultyValue
	}

	return {
		currentLevel,
		setCurrentLevel,
		isSolved,
		lastSolved,
		loadData,
		updateGameStat,
		difficulty,
		setDifficulty,
	}
})

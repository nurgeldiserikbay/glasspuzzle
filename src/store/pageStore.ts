import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { TYPE_PAGES } from '@/utils/types'

import { PAGES } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'
import LevelPage from '@/pages/LevelPage.vue'
import PlayPage from '@/pages/PlayPage.vue'

const pages: { [key in TYPE_PAGES]: Component } = {
	START: StartPage,
	LEVEL: LevelPage,
	PLAY: PlayPage,
}

export const usePageStore = defineStore('PageStore', () => {
	const currentPage = ref<TYPE_PAGES>(PAGES.START)
	const currentPageComponent = computed(() => {
		return pages[currentPage.value]
	})

	const backLink = computed(() => {
		if (currentPage.value === PAGES.LEVEL) return PAGES.START
		if (currentPage.value === PAGES.PLAY) return PAGES.LEVEL
		return ''
	})

	function routeTo(page: TYPE_PAGES) {
		currentPage.value = page
	}

	function toBackLink(link?: keyof typeof pages) {
		if (link) routeTo(link)
		else if (backLink.value) routeTo(backLink.value)
	}

	return {
		currentPage,
		currentPageComponent,
		routeTo,
		backLink,
		toBackLink,
	}
})

import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAdsStore = defineStore('adsStore', () => {
	const loading = ref(false)

	function toggleLoading(value: boolean) {
		loading.value = value
	}

	const bannerInited = ref(false)

	function bannerInit() {
		bannerInited.value = true
	}

	return {
		loading,
		toggleLoading,
		bannerInited,
		bannerInit,
	}
})

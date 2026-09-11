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


	/**
	 * Стоит ли сейчас настоящее объявление в баннерном слоте.
	 *
	 * Слот зарезервирован всегда, поэтому кто-то должен решать, что в нём
	 * рисовать: пришедший баннер закрывает полосу собой, а пока его нет — там
	 * кросс-промо наших же игр. Ответ знает только нативный слой, поэтому он
	 * его сюда и публикует (см. Admob.onBannerChange).
	 */
	const bannerLive = ref(false)
	/** Настоящая высота объявления, когда она стала известна. */
	const bannerHeight = ref(0)

	function setBanner(live: boolean, height = 0) {
		bannerLive.value = live
		bannerHeight.value = live ? height : 0
	}
	return {
		loading,
		toggleLoading,
		bannerInited,
		bannerInit,
		bannerLive,
		bannerHeight,
		setBanner,
	}
})

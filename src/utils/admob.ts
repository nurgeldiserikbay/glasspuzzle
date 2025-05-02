import {
	AdMob,
	AdmobConsentStatus,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	initializeForTesting: true,
	tagForChildDirectedTreatment: true,
}

class Admob {
	async initialize() {
		await AdMob.initialize(AdMobInitializationOptions)

		const [trackingInfo, consentInfo] = await Promise.all([
			AdMob.trackingAuthorizationStatus(),
			AdMob.requestConsentInfo(),
		])

		if (trackingInfo.status === 'notDetermined') {
			// console.log('Display information before ads load first time')
		} else if (
			trackingInfo.status === 'authorized' &&
			consentInfo.isConsentFormAvailable &&
			consentInfo.status === AdmobConsentStatus.REQUIRED
		) {
			await AdMob.showConsentForm()
		}
	}

	async showBanner() {
		AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
			// Subscribe Banner Event Listener
		})

		AdMob.addListener(
			BannerAdPluginEvents.SizeChanged,
			(size: AdMobBannerSize) => {
				console.log(size)
				// Subscribe Change Banner Size
			}
		)

		const options: BannerAdOptions = {
			adId: 'ca-app-pub-9702825788968948/6780330065',
			adSize: BannerAdSize.BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		await AdMob.hideBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean
		onInterstitialAdClosed: () => void
	}) {
		let isClosed = false
		function closeAds() {
			onInterstitialAdClosed()
			isClosed = true
		}

		AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
			console.log(info)
		})
		AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			console.log('Dismissed')
			if (!isClosed) closeAds()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			console.log('FailedToLoad')
			if (!isClosed) closeAds()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			if (!isClosed) closeAds()
		})

		const options: AdOptions = {
			adId: 'ca-app-pub-9702825788968948/9958658177',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.prepareInterstitial(options)
		if (!isFirst) await AdMob.showInterstitial()
	}
}

export default new Admob()

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

// TODO(owner): verify these are the correct PRODUCTION ad unit IDs for this app
// in the AdMob console before release. Do not ship placeholder/test unit IDs.
const BANNER_AD_ID = 'ca-app-pub-9702825788968948/6780330065'
const INTERSTITIAL_AD_ID = 'ca-app-pub-9702825788968948/9958658177'

// Frequency cap: show an interstitial once every N level transitions instead of
// on every single level (was too aggressive and risked policy issues).
const INTERSTITIAL_LEVEL_INTERVAL = 3

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Only run AdMob in "testing" mode during local dev builds.
	initializeForTesting: import.meta.env.DEV,
	// COPPA child-directed treatment restricts ad demand and cuts revenue.
	// Keep disabled unless the app is actually targeted at children.
	tagForChildDirectedTreatment: false,
}

class Admob {
	private bannerListenersReady = false
	private interstitialListenersReady = false
	private interstitialPrepared = false
	private levelTransitions = 0
	private pendingOnClosed: (() => void) | null = null

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

		// Warm up the first interstitial so it is ready when needed.
		this.prepareInterstitial()
	}

	// Register banner listeners exactly once to avoid leaking a new listener on
	// every showBanner() call.
	private registerBannerListeners() {
		if (this.bannerListenersReady) return
		this.bannerListenersReady = true

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
	}

	async showBanner() {
		this.registerBannerListeners()

		const options: BannerAdOptions = {
			adId: BANNER_AD_ID,
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

	// Register interstitial listeners exactly once to avoid leaking a new set of
	// listeners (and therefore multiple onInterstitialAdClosed callbacks) on
	// every interstitial() call.
	private registerInterstitialListeners() {
		if (this.interstitialListenersReady) return
		this.interstitialListenersReady = true

		AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
			console.log(info)
		})
		AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			console.log('Dismissed')
			this.interstitialPrepared = false
			this.resolvePending()
			// Preload the next interstitial for a later transition.
			this.prepareInterstitial()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			console.log('FailedToLoad')
			this.interstitialPrepared = false
			this.resolvePending()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			this.interstitialPrepared = false
			this.resolvePending()
		})
	}

	private resolvePending() {
		const cb = this.pendingOnClosed
		this.pendingOnClosed = null
		if (cb) cb()
	}

	// Preload an interstitial ahead of time so it is ready to show instantly.
	async prepareInterstitial() {
		this.registerInterstitialListeners()
		if (this.interstitialPrepared) return

		const options: AdOptions = {
			adId: INTERSTITIAL_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		try {
			await AdMob.prepareInterstitial(options)
			this.interstitialPrepared = true
		} catch (error) {
			this.interstitialPrepared = false
		}
	}

	async interstitial({
		onInterstitialAdClosed,
	}: {
		onInterstitialAdClosed: () => void
	}) {
		this.registerInterstitialListeners()
		this.levelTransitions++

		const shouldShow =
			this.levelTransitions % INTERSTITIAL_LEVEL_INTERVAL === 0

		// Not this transition's turn, or the ad simply isn't ready yet: don't block
		// gameplay — advance immediately and make sure one is preloaded for later.
		if (!shouldShow || !this.interstitialPrepared) {
			onInterstitialAdClosed()
			this.prepareInterstitial()
			return
		}

		this.pendingOnClosed = onInterstitialAdClosed
		try {
			await AdMob.showInterstitial()
		} catch (error) {
			this.interstitialPrepared = false
			this.resolvePending()
			this.prepareInterstitial()
		}
	}
}

export default new Admob()

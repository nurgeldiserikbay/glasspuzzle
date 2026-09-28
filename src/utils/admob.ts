import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

// TODO(owner): verify these are the correct PRODUCTION ad unit IDs for this app
// in the AdMob console before release. Do not ship placeholder/test unit IDs.
const BANNER_AD_ID = 'ca-app-pub-9702825788968948/6780330065'
const INTERSTITIAL_AD_ID = 'ca-app-pub-9702825788968948/9958658177'

// Frequency cap: show an interstitial once every N level transitions instead of
// on every single level (was too aggressive and risked policy issues).
const INTERSTITIAL_LEVEL_INTERVAL = 3

// Last-resort guard in case Dismissed never arrives. It releases the game flow
// only - never the system bars, because the ad may still be on screen and
// re-hiding them would push its close button out of reach.
const INTERSTITIAL_WATCHDOG_MS = 25_000

// The Play Console target audience of this game includes children, so Families
// policy applies: every ad request must be tagged as child-directed, capped at
// G-rated inventory and non-personalized. Trading these flags for ad demand is
// what gets an update rejected for "ad content not consistent with the app's
// content rating".
const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Only run AdMob in "testing" mode during local dev builds.
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: true,
	tagForUnderAgeOfConsent: true,
	maxAdContentRating: MaxAdContentRating.General,
}

// Резерв под баннер: примерно столько занимает adaptive-баннер на телефоне.
// Пока настоящая высота неизвестна, рекламная зона стоит на этом значении и
// никогда не бывает нулевой — иначе вёрстка прыгает при приходе объявления.
const BANNER_RESERVE_HEIGHT = 56

class Admob {
	/** Куда сообщать о состоянии слота. Ставится из App.vue до initialize(). */
	private bannerListener: ((live: boolean, height: number) => void) | null = null

	/**
	 * Стоит ли на экране настоящее объявление.
	 *
	 * Отдельный флаг нужен потому, что `SizeChanged` о наличии объявления не
	 * говорит ничего: плагин рассылает его и на загрузке — с настоящим
	 * размером, и на отказе, скрытии, снятии — с нулями. Если считать слот
	 * живым по любому из них, после снятия баннера слот останется «живым» с
	 * нулевой высотой: кросс-промо спрячется, а на его месте будет пустая
	 * полоса.
	 */
	private bannerLoaded = false
	/** Последняя известная высота объявления. */
	private bannerHeightPx = 0

	/** Подписка страницы на состояние слота. Ставится до initialize(). */
	onBannerChange(listener: (live: boolean, height: number) => void) {
		this.bannerListener = listener
	}

	private publishBanner(live: boolean, height = 0) {
		this.bannerListener?.(live, height)
	}

	/**
	 * Нативный баннер рисуется поверх вебвью, а не внутри вёрстки, поэтому
	 * сама страница о нём ничего не знает. Через эту переменную она узнаёт
	 * высоту объявления и держит под него место.
	 *
	 * Это же и есть защита от «реклама перекрывает управление»:
	 * adaptive-баннер на планшете вырастает почти вдвое против телефонного, и
	 * фиксированный отступ под него промахивается.
	 *
	 * `null` — вернуться к резерву из вёрстки. Место при этом не исчезает: в
	 * нём просто снова появляется кросс-промо.
	 */
	private setSlotHeight(px: number | null) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (px === null) root.removeProperty('--ad-slot')
		else root.setProperty('--ad-slot', `${Math.max(44, Math.round(px))}px`)
	}

	/**
	 * Добавляет к рекламной зоне системный инсет — туда же, куда система
	 * отодвинула баннер.
	 *
	 * Ставится и снимается вместе с самим объявлением, а не один раз при
	 * старте: когда баннера нет, отодвигать не подо что — в полосе стоит
	 * кросс-промо, и лишний инсет оставит под ним пустую кромку.
	 *
	 * Само число здесь не считается и не может: его знает браузер и отдаёт
	 * через `env(safe-area-inset-bottom)`. Переменной присваивается выражение,
	 * а не результат: инсет меняется вместе с системными панелями, и вычислять
	 * его должен CSS. Требует `viewport-fit=cover` в `index.html`.
	 */
	private setBannerInset(on: boolean) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		// Сначала — переменная, которую ставит SystemBars из Capacitor: она знает
		// настоящий отступ при любой версии WebView. На WebView < 140 `env()`
		// отдаёт ноль, хотя плагин рекламы поднимает баннер над панелью
		// навигации, — и баннер наезжал на низ игры. `env()` — запасной вариант
		// для веб-версии, где Capacitor переменную не ставит.
		if (on) root.setProperty('--ad-inset', 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))')
		else root.removeProperty('--ad-inset')
	}

	/** Слот пуст: место остаётся, но в нём снова кросс-промо. */
	private clearBanner() {
		this.bannerLoaded = false
		this.bannerHeightPx = 0
		this.setSlotHeight(null)
		this.setBannerInset(false)
		this.publishBanner(false)
	}

	private bannerListenersReady = false
	private interstitialListenersReady = false
	private interstitialPrepared = false
	private levelTransitions = 0
	private pendingOnClosed: (() => void) | null = null
	/** False while a show cycle is still considered active. */
	private interstitialClosed = true
	/** The app went to background during this show - the ad activity opened. */
	private sawBackgroundDuringShow = false
	private watchdogId: ReturnType<typeof setTimeout> | undefined
	/** System bars were raised for an ad and still need to be put back. */
	private barsShownForAd = false
	// initialize() is what applies the child-directed request configuration, so
	// no ad may be requested before it has finished — an early request is served
	// from adult-rated inventory. The promise is cached so the ad entry points
	// await the same initialization instead of starting a second one.
	private initPromise: Promise<void> | null = null
	private initialized = false

	initialize() {
		if (!this.initPromise) {
			this.initPromise = this.runInitialize()
		}
		return this.initPromise
	}

	private async runInitialize() {
		await AdMob.initialize(AdMobInitializationOptions)
		this.initialized = true

		// Форму согласия UMP осознанно не запрашиваем. Запросы помечены
		// tagForUnderAgeOfConsent, а у пользователя ниже возраста согласия согласие
		// на персонализацию не спрашивают — показывать ему форму выбора
		// персонализации неверно и по GDPR, и по Families Policy.
		// Неперсонализированную выдачу обеспечивает npa: true в каждом запросе.

		// Warm up the first interstitial so it is ready when needed.
		this.prepareInterstitial()
	}

	// Register banner listeners exactly once to avoid leaking a new listener on
	// every showBanner() call.
	private registerBannerListeners() {
		if (this.bannerListenersReady) return
		this.bannerListenersReady = true

		AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
			this.bannerLoaded = true
			this.setBannerInset(true)
			this.publishBanner(true, this.bannerHeightPx || BANNER_RESERVE_HEIGHT)
		})

		// Нет заполнения, нет сети, нет объявления: место остаётся за слотом,
		// но рисует в нём снова кросс-промо. Обнулять резерв нельзя — вёрстка
		// прыгнет ровно так же, как прыгала при появлении баннера.
		AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
			this.clearBanner()
		})

		AdMob.addListener(
			BannerAdPluginEvents.SizeChanged,
			(size: AdMobBannerSize) => {
				// Нули означают, что баннера на экране нет: отказ, скрытие или
				// снятие. Не «объявление нулевой высоты», а его отсутствие.
				if (!size.height) {
					this.clearBanner()
					return
				}

				// Настоящая высота заменяет резерв, как только стала известна. О
				// самом наличии объявления это событие не говорит, поэтому
				// состояние слота остаётся тем, какое было.
				this.bannerHeightPx = size.height
				this.setSlotHeight(size.height)
				this.setBannerInset(true)
				this.publishBanner(this.bannerLoaded, size.height)
			}
		)
	}

	async showBanner() {
		// Wait for the child-directed configuration; if initialization failed there
		// is no safe way to request an ad, so show none.
		await this.initialize().catch((error) => console.log(error))
		if (!this.initialized) return

		this.registerBannerListeners()

		const options: BannerAdOptions = {
			adId: BANNER_AD_ID,
			// ADAPTIVE_BANNER, а не BANNER: фиксированный 320x50 не растягивается на ширину
			// экрана, и плагин центрирует его боковыми маргинами — а слушатель инсетов на
			// Android 15+ эти маргины обнуляет, из-за чего баннер уезжает к левому краю.
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		await AdMob.hideBanner()
		// Объявление ушло с экрана — слот снова наш.
		this.clearBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
		// Объявление ушло с экрана — слот снова наш.
		this.clearBanner()
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
			this.handleInterstitialClosed()
			// Preload the next interstitial for a later transition.
			this.prepareInterstitial()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			console.log('FailedToLoad')
			this.interstitialPrepared = false
			this.handleInterstitialClosed()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			this.interstitialPrepared = false
			this.handleInterstitialClosed()
		})

		// A second dismissal signal that does not depend on the plugin: Dismissed is
		// lost on some devices, while the app returning to the foreground after a
		// background trip means the ad's own activity has already finished. Without
		// this the pending callback could never fire at all.
		CapacitorApp.addListener('appStateChange', ({ isActive }) => {
			if (!isActive) {
				if (!this.interstitialClosed) this.sawBackgroundDuringShow = true
				return
			}

			if (!this.interstitialClosed && this.sawBackgroundDuringShow) {
				this.handleInterstitialClosed()
			} else {
				this.restoreBarsAfterAd()
			}
		})
	}

	// The ad has definitely left the screen.
	private handleInterstitialClosed() {
		this.resolvePending()
		this.restoreBarsAfterAd()
	}

	// Releases only the pending callback, leaving the system bars alone: the
	// watchdog also calls this while the ad may still be on screen, and re-hiding
	// the bars then would push the ad's close button out of reach.
	private resolvePending() {
		if (this.interstitialClosed) return
		this.interstitialClosed = true
		this.sawBackgroundDuringShow = false
		if (this.watchdogId) {
			clearTimeout(this.watchdogId)
			this.watchdogId = undefined
		}
		const cb = this.pendingOnClosed
		this.pendingOnClosed = null
		if (cb) cb()
	}

	// Restore the game's immersive mode once, and only after the ad is gone.
	private restoreBarsAfterAd() {
		if (!this.barsShownForAd) return
		this.barsShownForAd = false
		void this.restoreImmersiveMode()
	}

	/**
	 * The system bars must be visible while a full screen ad is up. The ad activity
	 * belongs to the SDK and Android 15 draws it edge-to-edge, so if the game keeps
	 * immersive mode the close button can end up under the navigation bar or the
	 * cutout - exactly what review calls "unclosable ads".
	 */
	private async showSystemBars() {
		this.barsShownForAd = true

		try {
			await Fullscreen.deactivateImmersiveMode()
			await StatusBar.show()
		} catch (error) {
			console.log(error)
		}
	}

	private async restoreImmersiveMode() {
		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
		} catch (error) {
			console.log(error)
		}
	}

	// Preload an interstitial ahead of time so it is ready to show instantly.
	async prepareInterstitial() {
		this.registerInterstitialListeners()
		if (this.interstitialPrepared) return
		// This is the actual ad request, so it must not run before the
		// child-directed configuration is in place.
		if (!this.initialized) return

		const options: AdOptions = {
			adId: INTERSTITIAL_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// Deliberately not setting immersiveMode: since Android 15 forces
			// edge-to-edge it pushes the ad's close button under the navigation bar
			// or cutout, making the ad unclosable — a Families policy rejection.
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
		onInterstitialAdClosed?: () => void
	} = {}) {
		const done = onInterstitialAdClosed ?? (() => {})

		this.registerInterstitialListeners()
		this.levelTransitions++

		const shouldShow =
			this.levelTransitions % INTERSTITIAL_LEVEL_INTERVAL === 0

		// Not this transition's turn, or the ad simply isn't ready yet: don't block
		// gameplay - advance immediately and make sure one is preloaded for later.
		if (!shouldShow || !this.interstitialPrepared) {
			done()
			this.prepareInterstitial()
			return
		}

		this.pendingOnClosed = done
		this.interstitialClosed = false
		this.sawBackgroundDuringShow = false

		// Bring the system bars back so the ad's close button is guaranteed to sit
		// inside the visible area, and arm the watchdog in case Dismissed is lost.
		await this.showSystemBars()
		this.watchdogId = setTimeout(() => {
			console.log('Interstitial dismiss watchdog fired')
			this.resolvePending()
		}, INTERSTITIAL_WATCHDOG_MS)

		try {
			await AdMob.showInterstitial()
		} catch (error) {
			this.interstitialPrepared = false
			this.handleInterstitialClosed()
			this.prepareInterstitial()
		}
	}
}

export default new Admob()

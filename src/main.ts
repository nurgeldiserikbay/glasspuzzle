import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import en from './langs/en'

import App from './App.vue'

import './style.scss'

const i18n = createI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: {
		en,
	},
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')

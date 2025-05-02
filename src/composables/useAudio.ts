import { ref } from 'vue'

export const audioList: { [key: string]: string } = {}

const audioActive = ref(false)
const musicActive = ref(false)

let music: { [key: string]: HTMLAudioElement } = {}

export const useAudio = () => {
	function playAudio(audioType: string, anyway: boolean = false) {
		if (!anyway && (!audioActive.value || !audioList[audioType])) return

		if (audioList[audioType]) {
			const audio = new Audio(audioList[audioType])
			audio.play()
		}
	}

	function toggleAudio() {
		audioActive.value = !audioActive.value
	}

	function toggleMusic() {
		musicActive.value = !musicActive.value

		if (musicActive.value) {
			Object.entries(music).forEach(([_, audio]) => {
				audio.volume = 0.5
			})
		} else {
			Object.entries(music).forEach(([_, audio]) => {
				audio.volume = 0
			})
		}

		playAudio('break')
	}

	function play(name: string) {
		if (!audioList[name]) return

		if (musicActive.value) {
			if (music[name]) {
				music[name].play()
				music[name].currentTime = 0
			} else {
				music[name] = new Audio(audioList[name])

				music[name].addEventListener(
					'canplaythrough',
					function () {
						this.play().catch((_: any) => {
							document.addEventListener(
								'click',
								() => {
									this.play()
								},
								{
									once: true,
								}
							)
						})
					},
					false
				)

				music[name].addEventListener(
					'ended',
					function () {
						this.currentTime = 0
						this.play()
					},
					false
				)
				music[name].volume = 0.5
			}
		}
	}

	function stop(name: string) {
		if (music[name]) music[name].pause()
	}

	return {
		audioActive,
		musicActive,
		toggleAudio,
		playAudio,
		toggleMusic,
		play,
		stop,
	}
}

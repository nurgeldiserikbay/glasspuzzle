import { ref } from 'vue'

/**
 * Звук игры — целиком синтез Web Audio, без файлов: ни лицензий, ни лишних
 * килобайт, и тембр подобран под стекло.
 *
 * Эффекты — короткие «колокольчики» и хлопки. Музыка — три тихие мелодии
 * музыкальной шкатулки поверх мягких аккордов; каждая играет два круга и
 * уступает место следующей.
 *
 * Браузер и WebView не дают звуку начаться без касания, поэтому контекст
 * создаётся на первом касании (unlock) и тогда же, если музыка включена,
 * она и стартует. Пока приложение свёрнуто, контекст спит.
 */

export type Sfx =
	| 'click'
	| 'pick'
	| 'drop'
	| 'rotate'
	| 'join'
	| 'full'
	| 'crack'
	| 'whoosh'
	| 'win'

const KEY_SFX = 'glass.sfx'
const KEY_MUSIC = 'glass.music'

function readFlag(key: string) {
	try {
		return localStorage.getItem(key) !== '0'
	} catch {
		return true
	}
}

function writeFlag(key: string, on: boolean) {
	try {
		localStorage.setItem(key, on ? '1' : '0')
	} catch {
		// Нет хранилища (приватный режим) — просто не запомним выбор.
	}
}

/** Включены ли эффекты и музыка — реактивно, для кнопок. */
export const sfxOn = ref(readFlag(KEY_SFX))
export const musicOn = ref(readFlag(KEY_MUSIC))

/** Громкость музыки относительно эффектов: фон, но слышный на динамике телефона. */
const MUSIC_LEVEL = 0.85

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

// ─── Мелодии ───────────────────────────────────────────────────────────────

interface ITrack {
	/** Тоника в MIDI. */
	root: number
	bpm: number
	/** Аккорды по тактам — ступени мажора (0 = I, 5 = vi …). */
	chords: number[]
	seed: number
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]

const TRACKS: ITrack[] = [
	// «Утро»: фа мажор, I–vi–IV–V.
	{ root: 65, bpm: 72, chords: [0, 5, 3, 4, 0, 5, 3, 4], seed: 7 },
	// «Сад»: ре мажор, медленнее, I–IV–vi–V.
	{ root: 62, bpm: 64, chords: [0, 3, 5, 4, 0, 3, 1, 4], seed: 21 },
	// «Колыбельная»: до мажор, совсем тихо, I–iii–IV–I.
	{ root: 60, bpm: 58, chords: [0, 2, 3, 0, 5, 3, 4, 0], seed: 42 },
]

/** Детерминированный генератор: мелодия одна и та же при каждом запуске. */
function rng(seed: number) {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}

interface INote {
	beat: number
	midi: number
	len: number
}

/**
 * Мелодия по аккордам: восьмые с паузами, ноты — из пентатоники поверх
 * текущего аккорда, ход в основном плавный. Последний такт кончается на
 * тонике, чтобы круг замыкался.
 */
function compose(track: ITrack) {
	const rand = rng(track.seed)
	const notes: INote[] = []
	const pent = [0, 2, 4, 7, 9]
	let degree = 2
	track.chords.forEach((chord, bar) => {
		for (let step = 0; step < 8; step++) {
			const last = bar === track.chords.length - 1
			if (last && step > 3) break
			// Сильные доли — почти всегда нота, слабые — через раз.
			const play = step % 2 === 0 ? rand() < 0.85 : rand() < 0.35
			if (!play) continue
			degree = Math.max(0, Math.min(9, degree + Math.round((rand() - 0.5) * 3)))
			const octave = Math.floor(degree / 5)
			let pitch = track.root + 12 + pent[degree % 5] + octave * 12
			// На сильной доле тянемся к звуку аккорда.
			if (step % 4 === 0) {
				const tones = [0, 2, 4].map((i) => MAJOR[(chord + i) % 7])
				const pc = (pitch - track.root) % 12
				const nearest = tones.reduce((a, b) => (Math.abs(b - pc) < Math.abs(a - pc) ? b : a))
				pitch += nearest - pc
			}
			if (last && step === 0) pitch = track.root + 12
			notes.push({ beat: bar * 4 + step / 2, midi: pitch, len: step % 2 === 0 ? 1 : 0.5 })
		}
	})
	return notes
}

// ─── Движок ────────────────────────────────────────────────────────────────

class SoundEngine {
	private ctx?: BaseAudioContext
	private master!: GainNode
	private sfx!: GainNode
	private music!: GainNode
	private reverb!: ConvolverNode
	private noise!: AudioBuffer

	private timer?: ReturnType<typeof setInterval>
	private trackIndex = 0
	private loops = 0
	private notes: INote[] = []
	private startAt = 0
	private nextNote = 0
	private nextBar = 0

	/** Создать контекст на первом касании — раньше браузер звук не пустит. */
	unlock() {
		if (!this.ctx) this.build()
		if (this.ctx?.state === 'suspended') void (this.ctx as AudioContext).resume()
		if (musicOn.value) this.startMusic()
	}

	private build(offline?: OfflineAudioContext) {
		const Ctx = window.AudioContext || (window as any).webkitAudioContext
		if (!offline && !Ctx) return
		const ctx: BaseAudioContext = offline || new Ctx()
		this.ctx = ctx
		this.master = ctx.createGain()
		this.master.gain.value = 1
		this.master.connect(ctx.destination)
		this.sfx = ctx.createGain()
		this.sfx.gain.value = sfxOn.value ? 1 : 0
		this.sfx.connect(this.master)
		this.music = ctx.createGain()
		this.music.gain.value = 0
		this.music.connect(this.master)

		// Зал — затухающий шум. Им звучат музыка и немного эффекты.
		this.reverb = ctx.createConvolver()
		const len = ctx.sampleRate * 2.4
		const ir = ctx.createBuffer(2, len, ctx.sampleRate)
		for (let c = 0; c < 2; c++) {
			const d = ir.getChannelData(c)
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
		}
		this.reverb.buffer = ir
		const wet = ctx.createGain()
		wet.gain.value = 0.35
		this.reverb.connect(wet).connect(this.master)

		this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
		const n = this.noise.getChannelData(0)
		for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1

		if (offline) return
		// Свёрнутое приложение молчит и не тратит батарею.
		document.addEventListener('visibilitychange', () => {
			if (!this.ctx) return
			const live = this.ctx as AudioContext
			if (document.hidden) void live.suspend()
			else void live.resume()
		})
	}

	setSfx(on: boolean) {
		sfxOn.value = on
		writeFlag(KEY_SFX, on)
		if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05)
	}

	setMusic(on: boolean) {
		musicOn.value = on
		writeFlag(KEY_MUSIC, on)
		if (!this.ctx) return
		if (on) this.startMusic()
		else this.stopMusic()
	}

	// ─── Голоса ────────────────────────────────────────────────────────────

	/** Стеклянный колокольчик: основной тон и два негармоничных обертона. */
	private bell(t: number, freq: number, dur: number, gain: number, out: AudioNode, wet = 0.4) {
		const ctx = this.ctx!
		const env = ctx.createGain()
		env.gain.setValueAtTime(0, t)
		env.gain.linearRampToValueAtTime(gain, t + 0.006)
		env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		env.connect(out)
		if (wet > 0) {
			const send = ctx.createGain()
			send.gain.value = wet
			env.connect(send).connect(this.reverb)
		}
		for (const [mult, level] of [
			[1, 1],
			[2.76, 0.28],
			[5.4, 0.08],
		]) {
			const osc = ctx.createOscillator()
			osc.type = 'sine'
			osc.frequency.value = freq * mult
			const g = ctx.createGain()
			g.gain.value = level
			osc.connect(g).connect(env)
			osc.start(t)
			osc.stop(t + dur + 0.05)
		}
	}

	/** Короткий тон с глиссандо — хлопки и щелчки. */
	private blip(t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine') {
		const ctx = this.ctx!
		const osc = ctx.createOscillator()
		osc.type = type
		osc.frequency.setValueAtTime(from, t)
		osc.frequency.exponentialRampToValueAtTime(to, t + dur)
		const env = ctx.createGain()
		env.gain.setValueAtTime(gain, t)
		env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		osc.connect(env).connect(this.sfx)
		osc.start(t)
		osc.stop(t + dur + 0.02)
	}

	private hiss(t: number, dur: number, gain: number, filter: BiquadFilterType, from: number, to = from) {
		const ctx = this.ctx!
		const src = ctx.createBufferSource()
		src.buffer = this.noise
		const f = ctx.createBiquadFilter()
		f.type = filter
		f.frequency.setValueAtTime(from, t)
		f.frequency.exponentialRampToValueAtTime(to, t + dur)
		const env = ctx.createGain()
		env.gain.setValueAtTime(0, t)
		env.gain.linearRampToValueAtTime(gain, t + 0.01)
		env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		src.connect(f).connect(env).connect(this.sfx)
		src.start(t)
		src.stop(t + dur + 0.02)
	}

	// ─── Эффекты ───────────────────────────────────────────────────────────

	/**
	 * level — насколько «крупное» событие: для склейки это размер получившейся
	 * группы, звон поднимается с каждой склейкой. when — момент запуска по
	 * часам контекста; нужен только офлайн-записи.
	 */
	play(name: Sfx, level = 1, when?: number) {
		if (!this.ctx || !sfxOn.value) return
		// Контекст ещё не проснулся (первое касание) — звук потерялся бы в очереди.
		if (when === undefined && this.ctx.state !== 'running') return
		const t = when ?? this.ctx.currentTime + 0.005
		switch (name) {
			case 'click':
				this.blip(t, 700, 520, 0.05, 0.08)
				break
			case 'pick':
				this.blip(t, 420, 760, 0.09, 0.12)
				break
			case 'drop':
				this.blip(t, 300, 190, 0.12, 0.12)
				this.hiss(t, 0.05, 0.03, 'lowpass', 1200)
				break
			case 'rotate':
				this.blip(t, 1400, 1100, 0.035, 0.05, 'triangle')
				break
			case 'join': {
				// Пентатоника вверх: чем больше собрано, тем выше звон.
				const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
				const note = 81 + steps[Math.min(steps.length - 1, Math.max(0, level - 2))]
				this.bell(t, midi(note), 0.9, 0.16, this.sfx)
				this.bell(t + 0.07, midi(note + 7), 0.7, 0.09, this.sfx)
				break
			}
			case 'full':
				this.blip(t, 200, 150, 0.16, 0.14)
				this.blip(t + 0.14, 170, 120, 0.2, 0.12)
				break
			case 'crack':
				this.hiss(t, 0.35, 0.22, 'highpass', 1800, 900)
				for (let i = 0; i < 7; i++)
					this.bell(t + 0.02 + Math.random() * 0.3, 2200 + Math.random() * 2200, 0.35, 0.04, this.sfx, 0.2)
				break
			case 'whoosh':
				this.hiss(t, 0.6, 0.05, 'bandpass', 500, 2400)
				break
			case 'win': {
				const tune = [72, 76, 79, 84, 88, 91]
				tune.forEach((n, i) => this.bell(t + i * 0.09, midi(n), 1.2, 0.12, this.sfx))
				;[72, 79, 84].forEach((n) => this.bell(t + 0.62, midi(n), 2, 0.08, this.sfx))
				break
			}
		}
	}

	// ─── Музыка ────────────────────────────────────────────────────────────

	private startMusic() {
		if (!this.ctx || this.timer) return
		this.music.gain.cancelScheduledValues(this.ctx.currentTime)
		this.music.gain.setTargetAtTime(MUSIC_LEVEL, this.ctx.currentTime, 0.8)
		this.beginTrack(this.trackIndex, this.ctx.currentTime + 0.3)
		this.timer = setInterval(() => this.schedule(), 120)
	}

	private stopMusic() {
		if (!this.ctx) return
		this.music.gain.cancelScheduledValues(this.ctx.currentTime)
		this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
		if (this.timer) clearInterval(this.timer)
		this.timer = undefined
	}

	private beginTrack(index: number, at: number) {
		this.trackIndex = index
		this.notes = compose(TRACKS[index])
		this.startAt = at
		this.nextNote = 0
		this.nextBar = 0
	}

	/** Планировщик с запасом вперёд: ноты ставятся в очередь аудио заранее. */
	private schedule(now = this.ctx?.currentTime ?? 0) {
		if (!this.ctx) return
		const track = TRACKS[this.trackIndex]
		const beat = 60 / track.bpm
		const horizon = now + 0.4
		const bars = track.chords.length

		while (this.nextBar < bars && this.startAt + this.nextBar * 4 * beat < horizon) {
			this.chord(this.startAt + this.nextBar * 4 * beat, track, track.chords[this.nextBar], 4 * beat)
			this.nextBar++
		}
		while (this.nextNote < this.notes.length) {
			const note = this.notes[this.nextNote]
			const t = this.startAt + note.beat * beat
			if (t > horizon) break
			this.bell(t, midi(note.midi), 1.6 * note.len + 0.6, 0.07, this.music, 0.6)
			this.nextNote++
		}

		// Круг кончился: ещё раз или следующая мелодия — после такта тишины.
		const end = this.startAt + bars * 4 * beat
		if (this.nextBar >= bars && this.nextNote >= this.notes.length && now > end - 0.2) {
			this.loops++
			const next = this.loops % 2 === 0 ? (this.trackIndex + 1) % TRACKS.length : this.trackIndex
			this.beginTrack(next, end + (next !== this.trackIndex ? 4 * beat : 0))
		}
	}

	/** Мягкий аккорд на весь такт и бас на первую долю. */
	private chord(t: number, track: ITrack, degree: number, dur: number) {
		const ctx = this.ctx!
		const tones = [0, 2, 4].map((i) => {
			const idx = degree + i
			return track.root + MAJOR[idx % 7] + Math.floor(idx / 7) * 12
		})
		const lp = ctx.createBiquadFilter()
		lp.type = 'lowpass'
		lp.frequency.value = 900
		const env = ctx.createGain()
		env.gain.setValueAtTime(0, t)
		env.gain.linearRampToValueAtTime(0.035, t + dur * 0.35)
		env.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6)
		lp.connect(env).connect(this.music)
		const send = ctx.createGain()
		send.gain.value = 0.5
		env.connect(send).connect(this.reverb)
		for (const n of tones)
			for (const detune of [-5, 5]) {
				const osc = ctx.createOscillator()
				osc.type = 'triangle'
				osc.frequency.value = midi(n)
				osc.detune.value = detune
				osc.connect(lp)
				osc.start(t)
				osc.stop(t + dur + 0.7)
			}
		this.bell(t, midi(tones[0] - 12), dur * 0.8, 0.05, this.music, 0.3)
	}
}

export const sound = new SoundEngine()

/**
 * Записать звук в буфер без колонок — чтобы послушать мелодии и эффекты
 * файлом до сборки и проверить громкость. В игре не используется; вызывает
 * скрипт _docs/design/render-sounds.mjs.
 *
 * what — номер мелодии (0…2) или 'sfx' — все эффекты подряд.
 */
export async function renderSound(what: number | 'sfx', seconds: number) {
	const rate = 44100
	const offline = new OfflineAudioContext(2, rate * seconds, rate)
	const engine = new SoundEngine() as any
	engine.build(offline)
	if (what === 'sfx') {
		sfxOn.value = true
		engine.sfx.gain.value = 1
		const order: [Sfx, number][] = [
			['crack', 1], ['whoosh', 1], ['pick', 1], ['rotate', 1], ['drop', 1],
			['join', 2], ['join', 4], ['join', 8], ['full', 1], ['click', 1], ['win', 1],
		]
		order.forEach(([name, level], i) => engine.play(name, level, 0.2 + i * 0.9))
	} else {
		engine.music.gain.value = MUSIC_LEVEL
		engine.beginTrack(what, 0.3)
		for (let t = 0; t < seconds; t += 0.1) engine.schedule(t)
	}
	return offline.startRendering()
}

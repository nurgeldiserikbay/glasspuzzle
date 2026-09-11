<script lang="ts" setup>
import { computed, ref } from 'vue'

/**
 * Родительский гейт перед уходом из приложения.
 *
 * Зачем: это детское приложение под Families Policy, и Google в отказе прямо
 * пишет про «inadvertent clicks from child users». Ссылка на Google Play из
 * кросс-промо уводит ребёнка из игры одним касанием — гейт делает так, что
 * уйти можно только осознанно, взрослым действием.
 *
 * Пример на умножение, а не «нажмите и держите»: последнее ребёнок повторит
 * сразу. Множители от 6 до 12 — взрослому это устный счёт, ребёнку, на которого
 * рассчитана игра, нет.
 *
 * Переход сделан настоящей ссылкой, а не window.open: Capacitor сам отдаёт
 * внешний адрес системному браузеру — так же, как ссылка на политику
 * конфиденциальности. Открывать адрес кодом пришлось бы через отдельный
 * плагин, которого в проекте нет.
 *
 * СГЕНЕРИРОВАНО: tools/templates/ParentGate.vue → tools/rollout-promo.mjs.
 * Правьте шаблон, а не копию: следующий запуск скрипта затрёт правку.
 */
defineProps<{
	href: string
	title: string
}>()

const $emits = defineEmits(['close'])

function digit() {
	return 6 + Math.floor(Math.random() * 7)
}

const a = ref(digit())
const b = ref(digit())
const answer = ref('')

const passed = computed(() => Number(answer.value) === a.value * b.value)
/** Ошибку показываем только когда ответ уже полной длины, а не на каждой цифре. */
const wrong = computed(
	() => answer.value.length >= String(a.value * b.value).length && !passed.value
)

/** Пускаем только цифры: клавиатура на Android отдаёт и точку, и минус. */
function onInput(event: Event) {
	const el = event.target as HTMLInputElement
	answer.value = el.value.replace(/\D/g, '').slice(0, 4)
	el.value = answer.value
}
</script>

<template>
	<div class="gate" @click="$emits('close')">
		<div class="gate__in" @click.stop="">
			<div class="gate__title">For grown-ups only</div>
			<div class="gate__hint">Solve to open the game page in Google Play</div>

			<div class="gate__task">{{ a }} &times; {{ b }} = ?</div>

			<input
				class="gate__input"
				:class="{ 'gate__input--wrong': wrong }"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				:value="answer"
				@input="onInput"
			/>

			<a
				v-if="passed"
				class="gate__go"
				:href="href"
				target="_blank"
				rel="noopener"
				@click="$emits('close')"
				>Open in Google Play</a
			>
			<div v-else class="gate__go gate__go--off">Open in Google Play</div>

			<button class="gate__cancel" @click="$emits('close')">Cancel</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.gate {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	background: rgba(4, 6, 22, 0.82);

	&__in {
		width: 100%;
		max-width: 320px;
		padding: 22px 20px 18px;
		border-radius: 18px;
		background: linear-gradient(180deg, #1a2148, #0e1330);
		box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.1),
			0 18px 40px rgba(2, 4, 16, 0.7);
		text-align: center;
	}

	&__title {
		font-size: 17px;
		font-weight: 900;
		color: #fff;
	}

	&__hint {
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.6);
	}

	&__task {
		margin-top: 18px;
		font-size: 30px;
		font-weight: 900;
		letter-spacing: 1px;
		color: #fff;
	}

	&__input {
		width: 130px;
		margin-top: 12px;
		padding: 9px 0;
		border: none;
		border-radius: 12px;
		outline: none;
		background: rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.18);
		font-size: 22px;
		font-weight: 900;
		text-align: center;
		color: #fff;

		&--wrong {
			box-shadow: inset 0 0 0 1.5px #e0576b;
		}
	}

	&__go {
		display: block;
		margin-top: 18px;
		padding: 12px 14px;
		border-radius: 13px;
		background: linear-gradient(180deg, #9280f7, #6246d6);
		box-shadow: 0 3px 0 #3f2ba0;
		font-size: 13px;
		font-weight: 900;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		text-decoration: none;
		color: #fff;

		&--off {
			background: rgba(255, 255, 255, 0.08);
			box-shadow: none;
			color: rgba(255, 255, 255, 0.32);
		}
	}

	&__cancel {
		margin-top: 10px;
		padding: 8px 12px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}
}
</style>

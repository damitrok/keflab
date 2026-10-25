<script setup lang="ts">
import { convertOdds, formatConverted, parseOddsAs, type OddsFormat } from '~/lib/calc'
import {
  CONVERT_FORMAT_LABELS,
  CONVERT_INPUT_MODE,
  CONVERT_PLACEHOLDERS,
  convertFieldError,
} from '~/lib/small-calc-texts'
import SmallField from './SmallField.vue'
import SmallResult from './SmallResult.vue'

const FORMATS: readonly OddsFormat[] = ['decimal', 'fractional', 'american', 'probability']

const fields = reactive<Record<OddsFormat, string>>({
  decimal: '',
  fractional: '',
  american: '',
  probability: '',
})
/** Поле, которое редактировали последним: его не перезаписываем. */
const source = ref<OddsFormat | null>(null)

const parsed = computed(() => {
  const s = source.value
  return s ? parseOddsAs(fields[s], s) : null
})
const error = computed(() => {
  const p = parsed.value
  const s = source.value
  return p && s && !p.ok ? convertFieldError(s, p.error) : null
})
const summary = computed(() => {
  const p = parsed.value
  if (!p || !p.ok) return null
  return formatConverted(convertOdds(p.decimal))
})

function onInput(format: OddsFormat, value: string) {
  fields[format] = value
  source.value = format
  const p = parseOddsAs(value, format)
  if (p.ok) {
    const c = formatConverted(convertOdds(p.decimal))
    for (const f of FORMATS) if (f !== format) fields[f] = stripUnit(f, c[f])
  } else if (p.error === 'empty') {
    for (const f of FORMATS) fields[f] = ''
  }
}

/** В поле вероятности пишем число без знака процента: единица — в подписи. */
function stripUnit(format: OddsFormat, text: string): string {
  return format === 'probability' ? text.replace(/\s*%$/, '') : text
}

function errorFor(format: OddsFormat) {
  return source.value === format ? error.value : null
}
</script>

<template>
  <div class="small-calc">
    <form class="small-calc__form" novalidate @submit.prevent>
      <SmallField
        v-for="format in FORMATS"
        :id="`convert-${format}`"
        :key="format"
        :model-value="fields[format]"
        :label="CONVERT_FORMAT_LABELS[format]"
        :inputmode="CONVERT_INPUT_MODE[format]"
        :placeholder="`Например, ${CONVERT_PLACEHOLDERS[format]}`"
        :error="errorFor(format)"
        @update:model-value="onInput(format, $event)"
      />
    </form>

    <SmallResult id="convert">
      <template #live>
        <p v-if="!summary" class="result__line">
          Введите коэффициент в любом формате — остальные поля заполнятся сами.
        </p>
        <template v-else>
          <p class="result__main">
            <span data-testid="convert-decimal" class="result__value">{{ summary.decimal }}</span>
            =
            <span data-testid="convert-fractional" class="result__value">{{
              summary.fractional
            }}</span>
            =
            <span data-testid="convert-american" class="result__value">{{ summary.american }}</span>
            =
            <span data-testid="convert-probability" class="result__value">{{
              summary.probability
            }}</span>
          </p>
          <p class="result__line">
            Десятичный, дробный, американский коэффициент и вероятность. Вероятность включает маржу
            букмекера.
          </p>
        </template>
      </template>
    </SmallResult>
  </div>
</template>

<style scoped lang="scss">
.small-calc {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.small-calc__form {
  display: grid;
  gap: var(--spacing-16);
  min-width: 0;
}
</style>

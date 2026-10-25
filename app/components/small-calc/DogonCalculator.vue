<script setup lang="ts">
import { D, dogonNextStake, dogonTable, parseOdds, parseStake } from '~/lib/calc'
import MoneyValue from '~/components/calc/results/MoneyValue.vue'
import { formatOdds } from '~/lib/format'
import {
  DOGON_STEPS_DEFAULT,
  DOGON_STEPS_EMPTY,
  DOGON_STEPS_ERROR,
  DOGON_WARNING,
  moneyFieldError,
  oddsFieldError,
  parseSteps,
} from '~/lib/small-calc-texts'
import SmallField from './SmallField.vue'
import SmallResult from './SmallResult.vue'

const target = ref('')
const odds = ref('')
const steps = ref(DOGON_STEPS_DEFAULT)
const lost = ref('')

const targetParsed = computed(() => parseStake(target.value))
const oddsParsed = computed(() => parseOdds(odds.value))
const stepsParsed = computed(() => parseSteps(steps.value))
// Пустое поле или ноль — «пока ничего не проиграно».
const lostParsed = computed(() => {
  const text = lost.value.trim()
  if (text === '' || /^0+(?:[.,]0+)?$/.test(text)) return { ok: true as const, value: D('0') }
  return parseStake(text)
})

const targetError = computed(() => moneyFieldError('цель прибыли', targetParsed.value))
const oddsError = computed(() => oddsFieldError(odds.value, oddsParsed.value))
const lostError = computed(() => moneyFieldError('сумму проигранного', lostParsed.value))
const stepsError = computed(() => {
  const s = stepsParsed.value
  if (s.ok) return null
  return { text: s.empty ? DOGON_STEPS_EMPTY : DOGON_STEPS_ERROR, empty: s.empty }
})

const result = computed(() => {
  const t = targetParsed.value
  const o = oddsParsed.value
  const s = stepsParsed.value
  const l = lostParsed.value
  if (!t.ok || !o.ok || !s.ok || !l.ok) return null
  const input = { targetProfit: t.value, odds: o.value }
  return {
    next: dogonNextStake({ lost: l.value, ...input }),
    rows: dogonTable({ ...input, steps: s.value }),
    odds: o.value,
  }
})
</script>

<template>
  <div class="small-calc">
    <div class="small-calc__warning" role="note" data-testid="dogon-warning">
      <p class="small-calc__warning-title">{{ DOGON_WARNING.title }}</p>
      <p>{{ DOGON_WARNING.text }}</p>
    </div>

    <form class="small-calc__form" novalidate @submit.prevent>
      <SmallField
        id="dogon-target"
        v-model="target"
        label="Цель прибыли, ₽"
        placeholder="Например, 100"
        :error="targetError"
      />
      <SmallField
        id="dogon-odds"
        v-model="odds"
        label="Коэффициент"
        placeholder="Например, 2,00"
        :error="oddsError"
      />
      <SmallField
        id="dogon-steps"
        v-model="steps"
        label="Сколько шагов показать"
        inputmode="numeric"
        :error="stepsError"
      />
      <SmallField
        id="dogon-lost"
        v-model="lost"
        label="Уже проиграно, ₽ (необязательно)"
        placeholder="0"
        :error="lostError"
      />
    </form>

    <SmallResult id="dogon" class="small-calc__result">
      <template #live>
        <p v-if="!result" class="result__line">
          Введите цель прибыли и коэффициент, чтобы увидеть расчёт.
        </p>
        <template v-else>
          <p class="result__main">
            Следующая ставка
            <span data-testid="dogon-next-stake" class="result__value"
              ><MoneyValue :value="result.next"
            /></span>
          </p>
          <p class="result__line">
            Это ставка, при выигрыше которой по коэффициенту
            {{ formatOdds(result.odds) }} возвращается проигранное и остаётся цель прибыли. Ниже
            показано, как растут ставки.
          </p>
        </template>
      </template>

      <table v-if="result" class="rt" data-testid="dogon-table">
        <caption>
          Рост ставок: каждый шаг идёт после проигрыша предыдущего
        </caption>
        <thead>
          <tr>
            <th scope="col">Шаг</th>
            <th scope="col" class="num">Ставка</th>
            <th scope="col" class="num">Уже проиграно</th>
            <th scope="col" class="num">Всего вложено</th>
            <th scope="col" class="num">Выплата при выигрыше</th>
            <th scope="col" class="num">Прибыль</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.rows" :key="row.step">
            <th scope="row" data-label="Шаг">{{ row.step }}</th>
            <td class="num" data-label="Ставка"><MoneyValue :value="row.stake" /></td>
            <td class="num" data-label="Уже проиграно"><MoneyValue :value="row.lostBefore" /></td>
            <td class="num" data-label="Всего вложено"><MoneyValue :value="row.totalSpent" /></td>
            <td class="num" data-label="Выплата при выигрыше">
              <MoneyValue :value="row.payoutIfWin" />
            </td>
            <td class="num" data-label="Прибыль"><MoneyValue :value="row.profitIfWin" /></td>
          </tr>
        </tbody>
      </table>
    </SmallResult>
  </div>
</template>

<style scoped lang="scss">
@use '../calc/results/table';

@include table.result-table;

.small-calc {
  display: grid;
  gap: var(--spacing-32);
  min-width: 0;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: start;
  }
}

.small-calc__warning {
  padding: var(--card-padding);
  border: 1px solid var(--color-signal-orange);
  border-radius: var(--radius-cards);
  color: var(--color-bone);

  @media (min-width: 960px) {
    grid-column: 1 / -1;
  }

  p {
    margin: 0;
  }

  p + p {
    margin-top: var(--spacing-8);
  }
}

.small-calc__warning-title {
  font-weight: var(--font-weight-medium, 600);
  color: var(--color-signal-orange);
}

.small-calc__form {
  display: grid;
  gap: var(--spacing-16);
  min-width: 0;
}
</style>

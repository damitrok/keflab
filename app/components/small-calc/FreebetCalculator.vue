<script setup lang="ts">
import {
  DEFAULT_MARGIN_PERCENT,
  freebetValue,
  parseMargin,
  parseOdds,
  parseStake,
  type FreebetType,
} from '~/lib/calc'
import MoneyValue from '~/components/calc/results/MoneyValue.vue'
import OfferBlock from '~/components/offers/OfferBlock.vue'
import {
  FREEBET_FORMULA,
  FREEBET_MARGIN_ERRORS,
  FREEBET_TYPES,
  moneyFieldError,
  oddsFieldError,
} from '~/lib/small-calc-texts'
import { formatPercent, formatShareAsPercent } from '~/lib/small-calc-math'
import SmallField from './SmallField.vue'
import SmallResult from './SmallResult.vue'

const offersAllowed = useOfferSlotAllowed()

const amount = ref('')
const odds = ref('')
const margin = ref(DEFAULT_MARGIN_PERCENT)
const type = ref<FreebetType>('winnings_only')

const amountParsed = computed(() => parseStake(amount.value))
const oddsParsed = computed(() => parseOdds(odds.value))
const marginParsed = computed(() => parseMargin(margin.value))

const amountError = computed(() => moneyFieldError('сумму фрибета', amountParsed.value))
const oddsError = computed(() => oddsFieldError(odds.value, oddsParsed.value))
const marginError = computed(() => {
  const m = marginParsed.value
  if (m.ok) return null
  return { text: FREEBET_MARGIN_ERRORS[m.error], empty: m.error === 'empty' }
})

const result = computed(() => {
  const a = amountParsed.value
  const o = oddsParsed.value
  const m = marginParsed.value
  if (!a.ok || !o.ok || !m.ok) return null
  const r = freebetValue({ amount: a.value, odds: o.value, type: type.value, margin: m.value })
  return r.ok ? r.value : null
})

function setType(value: FreebetType) {
  type.value = value
}
</script>

<template>
  <div class="small-calc">
    <form class="small-calc__form" novalidate @submit.prevent>
      <SmallField
        id="freebet-amount"
        v-model="amount"
        label="Сумма фрибета, ₽"
        placeholder="Например, 1000"
        :error="amountError"
      />
      <SmallField
        id="freebet-odds"
        v-model="odds"
        label="Минимальный коэффициент"
        placeholder="Например, 2,00"
        :error="oddsError"
      />
      <fieldset class="small-calc__group">
        <legend>Что возвращается при выигрыше</legend>
        <label v-for="t in FREEBET_TYPES" :key="t.value" class="small-calc__radio">
          <input
            type="radio"
            name="freebet-type"
            :value="t.value"
            :checked="type === t.value"
            @change="setType(t.value)"
          />
          {{ t.label }}
        </label>
      </fieldset>
      <SmallField
        id="freebet-margin"
        v-model="margin"
        label="Маржа букмекера, %"
        placeholder="5"
        :error="marginError"
      />
    </form>

    <div class="small-calc__side">
      <SmallResult id="freebet">
        <template #live>
          <p v-if="!result" class="result__line">
            Введите сумму фрибета и коэффициент, чтобы увидеть расчёт.
          </p>
          <template v-else>
            <p class="result__line">
              Выигрыш при заходе
              <span data-testid="freebet-payout" class="result__value"
                ><MoneyValue :value="result.payoutIfWin"
              /></span>
            </p>
            <p class="result__line">
              Вероятность с учётом маржи
              <span data-testid="freebet-probability" class="result__value">{{
                formatShareAsPercent(result.probability, 2)
              }}</span>
            </p>
            <p class="result__main">
              Ожидаемая ценность фрибета
              <span data-testid="freebet-ev" class="result__value"
                ><MoneyValue :value="result.expectedValue"
              /></span>
            </p>
            <p class="result__line">
              Это
              <span data-testid="freebet-ev-percent" class="result__value">{{
                formatPercent(result.expectedValuePercent)
              }}</span>
              от суммы фрибета.
            </p>
          </template>
        </template>
        <p class="result__line">{{ FREEBET_FORMULA }}</p>
      </SmallResult>
      <OfferBlock v-if="offersAllowed" placement="calc-result" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.small-calc {
  display: grid;
  gap: var(--spacing-32);
  min-width: 0;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.small-calc__form,
.small-calc__side {
  display: grid;
  gap: var(--spacing-16);
  min-width: 0;
}

.small-calc__group {
  display: grid;
  gap: var(--spacing-8);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;

  legend {
    padding: 0;
    margin-bottom: var(--spacing-8);
    font-size: var(--text-body-sm);
    color: var(--color-pale-stone);
  }
}

.small-calc__radio {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-8);
  min-height: 44px;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
  }
}
</style>

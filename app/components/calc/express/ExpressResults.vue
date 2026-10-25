<script setup lang="ts">
import type { ExpressCalc } from '~/composables/useExpressCalc'
import { CALC_ERROR_TEXTS, CALC_FAILED_TEXT, NOT_SETTLED_TEXT } from '~/lib/texts'
import { formatMoney, formatOdds } from '~/lib/format'
import OfferBlock from '../../offers/OfferBlock.vue'
import MoneyValue from '../results/MoneyValue.vue'

const offersAllowed = useOfferSlotAllowed()
const props = defineProps<{ calc: ExpressCalc }>()

// Поля calc — ref'ы; unref работает и если страница передала reactive(calc).
const result = computed(() => unref(props.calc.result))
const totals = computed(() => unref(props.calc.totals))
const calcFailed = computed(() => unref(props.calc.calcFailed))

const okResult = computed(() => {
  const r = result.value
  return r && r.ok ? r : null
})
const settled = computed(() => {
  const s = okResult.value?.settlement
  return s && s.settled ? s : null
})
const profitKind = computed(() => {
  const s = settled.value
  if (!s) return null
  return s.profit.gt('0') ? 'plus' : s.profit.lt('0') ? 'minus' : 'zero'
})
const zeroProfitText = computed(() => (settled.value ? formatMoney(settled.value.profit).text : ''))
const totalOdds = computed(() => {
  const t = totals.value
  if (!t) return null
  return t.effective ? formatOdds(t.effective) : formatOdds(t.ifPendingWin)
})
</script>

<template>
  <section data-testid="express-result" class="result" aria-labelledby="express-result-title">
    <h2 id="express-result-title">Результат</h2>

    <div data-testid="calc-summary" class="summary" aria-live="polite" aria-atomic="true">
      <p v-if="calcFailed" class="summary__line">{{ CALC_FAILED_TEXT }}</p>
      <p v-else-if="!result" class="summary__line">
        Заполните ставку и коэффициенты, чтобы увидеть расчёт.
      </p>
      <p v-else-if="!result.ok" class="summary__line">{{ CALC_ERROR_TEXTS[result.error] }}</p>
      <template v-else-if="okResult && totals">
        <p class="summary__line">
          Общий коэффициент
          <span data-testid="total-odds" class="summary__value">{{ totalOdds }}</span>
          <template v-if="!settled"> (если всё зайдёт)</template>
        </p>

        <template v-if="settled">
          <p class="summary__main">
            Возврат
            <span data-testid="payout" class="summary__value"
              ><MoneyValue :value="settled.payout"
            /></span>
          </p>
          <p data-testid="profit" class="summary__profit" :class="`summary__profit--${profitKind}`">
            <template v-if="profitKind === 'plus'"
              >Прибыль +<MoneyValue :value="settled.profit"
            /></template>
            <template v-else-if="profitKind === 'minus'"
              >Убыток <MoneyValue :value="settled.profit"
            /></template>
            <template v-else>Без прибыли и убытка: {{ zeroProfitText }}</template>
          </p>
        </template>
        <template v-else>
          <p class="summary__main" data-testid="not-settled">{{ NOT_SETTLED_TEXT }}</p>
          <p class="summary__line" data-testid="payout-if-win">
            Если всё зайдёт: <MoneyValue :value="totals.payoutIfPendingWin" />
          </p>
        </template>

        <p class="summary__line" data-testid="total-stake">
          Ставка <MoneyValue :value="okResult.shape.totalStake" />
        </p>
      </template>
    </div>
    <slot />
    <OfferBlock v-if="offersAllowed" placement="calc-result" />
  </section>
</template>

<style scoped lang="scss">
.result {
  min-width: 0;
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
  background: var(--color-carbon-lift);
}

.summary p {
  margin: 0 0 var(--spacing-8);
}

.summary__main {
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.summary__line {
  color: var(--color-pale-stone);
}

.summary__value {
  font-variant-numeric: tabular-nums;
}

.summary__profit {
  font-size: 18px;

  &--plus {
    color: var(--color-metric-green);
  }

  &--minus {
    color: var(--color-signal-orange);
  }

  &--zero {
    color: var(--color-bone);
  }
}
</style>

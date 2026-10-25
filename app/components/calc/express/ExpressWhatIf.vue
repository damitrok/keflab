<script setup lang="ts">
import type { WhatIfResult } from '~/lib/calc/what-if'
import type { Decimal } from '~/lib/calc'
import { formatOdds } from '~/lib/format'
import MoneyValue from '../results/MoneyValue.vue'

defineProps<{ whatIf: WhatIfResult | null }>()

function sign(profit: Decimal): string {
  return profit.gt('0') ? '+' : ''
}
</script>

<template>
  <section data-testid="what-if" class="what-if" aria-labelledby="what-if-title">
    <h2 id="what-if-title">Что будет, если одно событие вернут</h2>
    <p class="what-if__lead">
      Возврат ставки на событие считается с коэффициентом 1. Ниже — итог экспресса для каждого
      случая, когда вернули только одно событие, а остальные идут со своими исходами.
    </p>

    <p v-if="!whatIf || !whatIf.ok" class="what-if__empty">
      Заполните ставку и коэффициенты, чтобы увидеть расчёт.
    </p>
    <template v-else>
      <div class="what-if__scroll">
        <table class="what-if__table">
          <caption class="sr-only">
            Возврат и прибыль, если вернули одно из событий
          </caption>
          <thead>
            <tr>
              <th scope="col">Если вернули</th>
              <th scope="col">Возврат</th>
              <th scope="col">Прибыль</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in whatIf.rows" :key="row.index" data-testid="what-if-row">
              <th scope="row">Событие {{ row.index }} ({{ formatOdds(row.odds) }})</th>
              <td><MoneyValue :value="row.payout" /></td>
              <td>{{ sign(row.profit) }}<MoneyValue :value="row.profit" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="whatIf.assumesPendingWin" class="what-if__note" data-testid="what-if-assumption">
        Допущение: события со статусом «ждём» считаются выигранными. Когда они сыграют, цифры
        изменятся.
      </p>
    </template>
  </section>
</template>

<style scoped lang="scss">
.what-if {
  min-width: 0;
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
  background: var(--color-carbon-lift);
}

.what-if__lead,
.what-if__empty {
  color: var(--color-pale-stone);
  font-size: var(--text-body-sm);
}

.what-if__scroll {
  min-width: 0;
  overflow-x: auto;
}

.what-if__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 10px 8px 10px 0;
    border-top: 1px solid var(--color-ash-stroke);
    text-align: left;
    font-weight: var(--font-weight-regular);
    vertical-align: top;
  }

  thead th {
    color: var(--color-pale-stone);
    border-top: 0;
  }
}

.what-if__note {
  margin: var(--spacing-16) 0 0;
  color: var(--color-pale-stone);
  font-size: var(--text-body-sm);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

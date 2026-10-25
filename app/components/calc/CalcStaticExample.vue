<script setup lang="ts">
import { D, calcSystem, type BetEvent, type EventStatus } from '~/lib/calc'
import { formatMoney, formatOdds } from '~/lib/format'
import { STATUS_TEXTS } from '~/lib/texts'
import CombinationsTable from './results/CombinationsTable.vue'

// Все числа считает движок на рендере — руками их не набираем.
const STAKE = D('3000')
const INPUT: { odds: string; status: EventStatus }[] = [
  { odds: '1.80', status: 'win' },
  { odds: '2.10', status: 'win' },
  { odds: '1.65', status: 'lose' },
]
const events: BetEvent[] = INPUT.map((e) => ({ odds: D(e.odds), status: e.status }))
const result = calcSystem(events, 2, STAKE)

const view = (() => {
  if (!result.ok || !result.settlement.settled) return null
  const { payout, profit } = result.settlement
  return {
    rows: result.rows,
    payout: formatMoney(payout).text,
    profit: `${profit.gt('0') ? '+' : ''}${formatMoney(profit).text}`,
    perCombination: formatMoney(result.shape.stakePerCombination).text,
    winnersLabel: result.rows
      .filter((r) => r.payout?.gt('0'))
      .map((r) => r.events.map((i) => i + 1).join(' + '))
      .join(', '),
  }
})()
</script>

<template>
  <section v-if="view" data-testid="static-example" class="example" aria-labelledby="example-h">
    <h2 id="example-h">Пример: система 2 из 3</h2>
    <p>
      Ставка {{ formatMoney(STAKE).text }}, три события:
      <template v-for="(e, i) in events" :key="i"
        >{{ i + 1 }} — коэффициент {{ formatOdds(e.odds) }}, {{ STATUS_TEXTS[e.status].label
        }}{{ i < events.length - 1 ? '; ' : '.' }}</template
      >
    </p>
    <p>
      Система 2 из 3 — это три комбинации по два события. Ставка делится поровну: по
      {{ view.perCombination }} на каждую комбинацию. Выплата есть только у комбинации
      {{ view.winnersLabel }}: в остальных есть проигравшее событие, и они дают 0.
    </p>
    <CombinationsTable :rows="view.rows" caption="Комбинации примера" />
    <p class="example__total" data-testid="static-example-total">
      Возврат {{ view.payout }}, прибыль {{ view.profit }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.example {
  min-width: 0;
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
}

.example p {
  color: var(--color-pale-stone);
}

.example .example__total {
  margin: var(--spacing-16) 0 0;
  color: var(--color-bone);
  font-size: 18px;
}
</style>

<script setup lang="ts">
import type { Scenarios } from '~/lib/calc'
import { SCENARIOS_CAPTION } from '~/lib/texts'
import MoneyValue from './MoneyValue.vue'

const props = defineProps<{ scenarios: Scenarios }>()

function note(wins: number): { text: string; testid: string } | null {
  const { breakEvenMin, breakEvenMax } = props.scenarios
  if (wins === breakEvenMin) {
    return { text: 'окупается при любом наборе', testid: 'break-even-min' }
  }
  if (wins === breakEvenMax) return { text: 'может окупиться', testid: 'break-even-max' }
  return null
}
</script>

<template>
  <p v-if="scenarios.pendingCount === 0" data-testid="no-scenarios">
    Все события рассчитаны — сценарии не нужны
  </p>
  <table v-else class="rt" data-testid="scenarios-table">
    <caption>
      {{
        SCENARIOS_CAPTION
      }}
    </caption>
    <thead>
      <tr>
        <th scope="col">Исход</th>
        <th scope="col" class="num">Минимум</th>
        <th scope="col" class="num">Максимум</th>
        <th scope="col">Пометка</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in scenarios.rows" :key="row.wins">
        <th scope="row" data-label="Исход">
          Зайдёт {{ row.wins }} из {{ scenarios.pendingCount }}
        </th>
        <td class="num" data-label="Минимум"><MoneyValue :value="row.min" /></td>
        <td class="num" data-label="Максимум"><MoneyValue :value="row.max" /></td>
        <td v-if="note(row.wins)" class="note" data-label="Пометка">
          <span :data-testid="note(row.wins)!.testid">{{ note(row.wins)!.text }}</span>
        </td>
        <td v-else class="note note--empty" aria-hidden="true"></td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
@use './table';

@include table.result-table;

.note {
  color: var(--color-metric-green);
}

@media (max-width: 599px) {
  .note--empty {
    display: none;
  }
}
</style>

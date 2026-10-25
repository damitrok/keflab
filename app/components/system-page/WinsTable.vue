<script setup lang="ts">
import { formatOdds } from '~/lib/format'
import { D } from '~/lib/calc'
import { TABLE_ODDS_HIGH, TABLE_ODDS_LOW, type WinsRow } from '~/lib/system-page'

defineProps<{
  k: number
  n: number
  stakeText: string
  rows: readonly WinsRow[]
}>()

const low = formatOdds(D(TABLE_ODDS_LOW))
const high = formatOdds(D(TABLE_ODDS_HIGH))
</script>

<template>
  <div class="wins" data-testid="wins-table">
    <table class="rt">
      <caption>
        Ставка
        {{
          stakeText
        }}, у всех событий одинаковые коэффициенты. Остальные события не зашли. Возврат показан при
        коэффициентах
        {{
          low
        }}
        и
        {{
          high
        }}.
      </caption>
      <thead>
        <tr>
          <th scope="col">Зашло событий</th>
          <th scope="col">Выплата</th>
          <th scope="col" class="num">Возврат при {{ low }}</th>
          <th scope="col" class="num">Возврат при {{ high }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.wins">
          <th scope="row" data-label="Зашло событий">{{ r.wins }} из {{ n }}</th>
          <td data-label="Выплата">{{ r.hasPayout ? 'есть' : 'нет' }}</td>
          <td class="num" :data-label="`Возврат при ${low}`">{{ r.payoutLowText }}</td>
          <td class="num" :data-label="`Возврат при ${high}`">{{ r.payoutHighText }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
@use '../calc/results/table';

@include table.result-table;

.wins {
  min-width: 0;
  margin-bottom: var(--spacing-16);
}
</style>

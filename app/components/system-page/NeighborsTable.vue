<script setup lang="ts">
import { formatOdds } from '~/lib/format'
import { D } from '~/lib/calc'
import { TABLE_ODDS_HIGH, type ComparisonRow } from '~/lib/system-page'

defineProps<{ rows: readonly ComparisonRow[] }>()

const high = formatOdds(D(TABLE_ODDS_HIGH))
const dash = (v: number | null): string => (v === null ? '—' : String(v))
</script>

<template>
  <div class="neighbors" data-testid="neighbors-table">
    <table class="rt">
      <caption>
        Коэффициенты у всех событий одинаковые ({{
          high
        }}), чтобы системы можно было сравнить.
      </caption>
      <thead>
        <tr>
          <th scope="col">Система</th>
          <th scope="col" class="num">Комбинаций</th>
          <th scope="col" class="num">Зашедших для выплаты</th>
          <th scope="col" class="num">Зашедших для окупаемости при {{ high }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.path">
          <th scope="row" data-label="Система">
            <template v-if="r.current">{{ r.label }} (эта страница)</template>
            <NuxtLink v-else :to="r.path">{{ r.label }}</NuxtLink>
          </th>
          <td class="num" data-label="Комбинаций">{{ r.combinations }}</td>
          <td class="num" data-label="Зашедших для выплаты">{{ dash(r.minWins) }}</td>
          <td class="num" :data-label="`Окупаемость при ${high}`">{{ dash(r.breakEvenHigh) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
@use '../calc/results/table';

@include table.result-table;

.neighbors {
  min-width: 0;
  margin-bottom: var(--spacing-16);
}

.neighbors a {
  color: var(--color-bone);
}
</style>

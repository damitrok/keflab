<script setup lang="ts">
import { TABLE_ODDS, systemTypesTable } from '~/lib/system-table'
import { formatOdds } from '~/lib/format'
import { D } from '~/lib/calc'

// Все числа строит движок на рендере — руками их не набираем.
const rows = systemTypesTable(3, 8)
const high = formatOdds(D(TABLE_ODDS.high))
const low = formatOdds(D(TABLE_ODDS.low))
const dash = (v: number | null): string => (v === null ? '—' : String(v))
</script>

<template>
  <div class="types" data-testid="system-types-table">
    <table class="rt">
      <caption>
        Типы систем от 3 до 8 событий. Коэффициенты у всех событий одинаковые — так проще сравнивать
        системы между собой.
      </caption>
      <thead>
        <tr>
          <th scope="col">Система</th>
          <th scope="col" class="num">Комбинаций</th>
          <th scope="col" class="num">Зашедших для выплаты</th>
          <th scope="col" class="num">Зашедших для окупаемости при {{ high }}</th>
          <th scope="col" class="num">Зашедших для окупаемости при {{ low }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="`${r.k}-${r.n}`">
          <th scope="row" data-label="Система">{{ r.k }} из {{ r.n }}</th>
          <td class="num" data-label="Комбинаций">{{ r.combinations }}</td>
          <td class="num" data-label="Зашедших для выплаты">{{ dash(r.minWinsForPayout) }}</td>
          <td class="num" :data-label="`Окупаемость при ${high}`">{{ dash(r.breakEvenAt200) }}</td>
          <td class="num" :data-label="`Окупаемость при ${low}`">{{ dash(r.breakEvenAt180) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
@use '../calc/results/table';

@include table.result-table;

.types {
  min-width: 0;
  margin-bottom: var(--spacing-16);
}
</style>

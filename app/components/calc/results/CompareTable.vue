<script setup lang="ts">
import type { Decimal, ScenarioRow } from '~/lib/calc'
import type { CompareScenarios } from '~/composables/useSystemCalc'
import MoneyValue from './MoneyValue.vue'

const props = defineProps<{ compare: CompareScenarios; k: number; n: number }>()

const pendingCount = computed(() => props.compare.system.pendingCount)
const rows = computed(() => props.compare.system.rows)

const columns = computed(() => [
  { key: 'express', label: 'Экспресс', rows: props.compare.express.rows },
  { key: 'system', label: `Система ${props.k} из ${props.n}`, rows: props.compare.system.rows },
  { key: 'singles', label: 'Одиночные', rows: props.compare.singles.rows },
])

function cell(list: readonly ScenarioRow[], i: number): { min: Decimal; max: Decimal } | null {
  const r = list[i]
  return r ? { min: r.min, max: r.max } : null
}
</script>

<template>
  <div>
    <p class="compare-note">
      Одна и та же общая ставка, те же события. Это арифметика, а не совет.
    </p>
    <table class="rt" data-testid="compare-table">
      <caption>
        Возврат: от минимума до максимума
      </caption>
      <thead>
        <tr>
          <th scope="col">Исход</th>
          <th v-for="c in columns" :key="c.key" scope="col" class="num">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="row.wins">
          <th scope="row" data-label="Исход">
            {{
              pendingCount === 0
                ? 'Все события рассчитаны'
                : `Зайдёт ${row.wins} из ${pendingCount}`
            }}
          </th>
          <td v-for="c in columns" :key="c.key" class="num" :data-label="c.label">
            <template v-if="cell(c.rows, i)">
              <MoneyValue :value="cell(c.rows, i)!.min" />
              <template v-if="!cell(c.rows, i)!.min.eq(cell(c.rows, i)!.max)">
                –
                <MoneyValue :value="cell(c.rows, i)!.max" />
              </template>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
@use './table';

@include table.result-table;

.compare-note {
  color: var(--color-pale-stone);
}
</style>

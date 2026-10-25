<script setup lang="ts">
import type { CombinationRow } from '~/lib/calc'
import { formatOdds } from '~/lib/format'
import MoneyValue from './MoneyValue.vue'

const props = withDefaults(
  defineProps<{
    rows: readonly CombinationRow[]
    caption?: string
    /** Свернуть в <details>, если комбинаций больше этого числа. */
    collapseAbove?: number
  }>(),
  {
    caption:
      'Комбинации: ставка и выплата по каждой. Строки справочные, главное число — итог выше.',
    collapseAbove: 10,
  },
)

const PAGE = 50
const shown = ref(PAGE)
watch(
  () => props.rows,
  () => (shown.value = PAGE),
)

const visible = computed(() => props.rows.slice(0, shown.value))
const rest = computed(() => Math.max(0, props.rows.length - shown.value))
const collapsed = computed(() => props.rows.length > props.collapseAbove)
const tableId = useId()
</script>

<template>
  <component :is="collapsed ? 'details' : 'div'" class="combos">
    <summary v-if="collapsed" class="combos__summary">
      Показать {{ rows.length }} комбинаций
    </summary>
    <table class="rt" data-testid="combinations-table">
      <caption>
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">№</th>
          <th scope="col">События</th>
          <th scope="col" class="num">Коэффициент</th>
          <th scope="col" class="num">Ставка</th>
          <th scope="col" class="num">Выплата</th>
        </tr>
      </thead>
      <tbody :id="tableId">
        <tr v-for="row in visible" :key="row.index">
          <td data-label="№">{{ row.index }}</td>
          <td data-label="События">{{ row.events.map((i) => i + 1).join(' + ') }}</td>
          <td class="num" data-label="Коэффициент">{{ formatOdds(row.odds) }}</td>
          <td class="num" data-label="Ставка"><MoneyValue :value="row.stake" /></td>
          <td class="num" data-label="Выплата">
            <MoneyValue v-if="row.payout" :value="row.payout" />
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <button
      v-if="rest > 0"
      type="button"
      class="combos__more"
      :aria-controls="tableId"
      @click="shown += PAGE"
    >
      Показать ещё {{ Math.min(PAGE, rest) }}
      <span class="combos__left">(осталось {{ rest }})</span>
    </button>
  </component>
</template>

<style scoped lang="scss">
@use './table';

@include table.result-table;

.combos__summary,
.combos__more {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-buttons);
  background: var(--color-carbon-lift);
  color: var(--color-bone);
  font: inherit;
  cursor: pointer;
}

.combos__summary {
  display: block;
  margin-bottom: var(--spacing-16);
}

.combos__more {
  margin-top: var(--spacing-16);
}

.combos__left {
  color: var(--color-pale-stone);
}
</style>

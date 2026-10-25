<script setup lang="ts">
import CombinationsTable from '~/components/calc/results/CombinationsTable.vue'
import { eventsWord, type ExampleData } from '~/lib/system-page'

defineProps<{ k: number; n: number; combinations: number; example: ExampleData }>()
</script>

<template>
  <section class="example" data-testid="system-example" aria-labelledby="example-h">
    <h2 id="example-h">Пример расчёта</h2>
    <p>
      Ставка {{ example.stakeText }}, коэффициенты событий: {{ example.odds.join('; ') }}. Зашли
      первые {{ eventsWord(example.wins) }}, остальные не зашли.
    </p>
    <p>
      Ставка делится на {{ combinations }} комбинаций, по {{ example.perCombinationText }} на
      каждую. Выплату дают {{ example.winningCombinations }} из них: в остальных есть проигравшее
      событие.
    </p>
    <CombinationsTable :rows="example.rows" caption="Комбинации примера" />
    <p class="example__total" data-testid="system-example-total">
      Возврат {{ example.payoutText }}, прибыль {{ example.profitText }}
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

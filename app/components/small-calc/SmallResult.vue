<script setup lang="ts">
// Блок результата: заголовок и область aria-live, в которую страница кладёт итог.
defineProps<{ id: string; title?: string }>()
</script>

<template>
  <section :data-testid="`${id}-result`" class="result" :aria-labelledby="`${id}-result-title`">
    <h2 :id="`${id}-result-title`">{{ title ?? 'Результат' }}</h2>
    <div :data-testid="`${id}-summary`" class="result__live" aria-live="polite" aria-atomic="true">
      <slot name="live" />
    </div>
    <slot />
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

.result__live :deep(p) {
  margin: 0 0 var(--spacing-8);
}

.result__live :deep(.result__main) {
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.result__live :deep(.result__line) {
  color: var(--color-pale-stone);
}

.result__live :deep(.result__value) {
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
</style>

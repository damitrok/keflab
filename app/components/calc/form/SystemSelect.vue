<script setup lang="ts">
defineProps<{ n: number; options: { k: number; combinations: number }[] }>()
const model = defineModel<number>({ required: true })

function pluralCombinations(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'комбинаций'
  if (mod10 === 1) return 'комбинация'
  if (mod10 >= 2 && mod10 <= 4) return 'комбинации'
  return 'комбинаций'
}

function onChange(event: Event) {
  model.value = Number((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="field">
    <label for="system-k" class="field__label">Тип системы</label>
    <select id="system-k" class="field__select" :value="model" @change="onChange">
      <option v-for="o in options" :key="o.k" :value="o.k" :selected="o.k === model">
        {{ o.k }} из {{ n }} ({{ o.combinations }} {{ pluralCombinations(o.combinations) }})
      </option>
    </select>
  </div>
</template>

<style scoped lang="scss">
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field__label {
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}

.field__select {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--spacing-16);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-sm);
  background: var(--color-carbon-lift);
  color: var(--color-bone);
  font: inherit;
  font-size: 16px;
}
</style>

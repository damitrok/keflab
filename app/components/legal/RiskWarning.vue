<script setup lang="ts">
import site from '../../../data/site.json'

// Текст предупреждения — только из data/site.json (riskWarning), заполняет человек.
const text = computed(() => site.riskWarning.trim())
</script>

<template>
  <p v-if="text" class="risk-warning" role="note">{{ text }}</p>
</template>

<style scoped lang="scss">
.risk-warning {
  margin: 0;
  padding: var(--spacing-8) var(--spacing-16);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-sm);
  color: var(--color-bone);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-sm);
}
</style>

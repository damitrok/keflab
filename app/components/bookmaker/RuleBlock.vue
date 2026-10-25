<script setup lang="ts">
// Один блок правил БК: заголовок и текст. Текст — из данных, как есть.
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :aria-labelledby="id" class="rule-block">
    <h2 :id="id">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped lang="scss">
.rule-block {
  min-width: 0;

  h2 {
    margin: 0 0 var(--spacing-8);
  }

  :slotted(p) {
    margin: 0 0 var(--spacing-8);
    color: var(--color-pale-stone);
    overflow-wrap: anywhere;
  }
}
</style>

<script setup lang="ts">
import { useSystemCalc } from '~/composables/useSystemCalc'
import CalcForm from './CalcForm.vue'
import CalcResults from './CalcResults.vue'

// n и k задают начальную систему, например на /sistema-3-iz-5/ (шаг 9).
const props = defineProps<{ n?: number; k?: number }>()

const calc = useSystemCalc({ n: props.n, k: props.k })
</script>

<template>
  <div class="system-calculator">
    <CalcForm :calc="calc" />
    <CalcResults :calc="calc" />
  </div>
</template>

<style scoped lang="scss">
.system-calculator {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}
</style>

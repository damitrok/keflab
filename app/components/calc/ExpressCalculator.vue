<script setup lang="ts">
import { useExpressCalc } from '~/composables/useExpressCalc'
import ExpressForm from './express/ExpressForm.vue'
import ExpressResults from './express/ExpressResults.vue'
import ExpressWhatIf from './express/ExpressWhatIf.vue'

const calc = useExpressCalc()
</script>

<template>
  <div class="express-calculator">
    <ExpressForm :calc="calc" />
    <div class="express-calculator__side">
      <ExpressResults :calc="calc" />
      <ExpressWhatIf :what-if="calc.whatIf.value" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.express-calculator {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.express-calculator__side {
  display: grid;
  gap: var(--spacing-24);
  min-width: 0;
}
</style>

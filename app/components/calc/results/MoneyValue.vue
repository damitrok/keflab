<script setup lang="ts">
import type { Decimal } from '~/lib/calc'
import { formatMoney } from '~/lib/format'

const props = defineProps<{ value: Decimal }>()

const money = computed(() => formatMoney(props.value))
const expanded = ref(false)
</script>

<template>
  <button
    v-if="money.abbreviated"
    type="button"
    class="money money--button"
    :aria-expanded="expanded"
    title="Показать сумму полностью"
    @click="expanded = !expanded"
  >
    {{ expanded ? money.full : money.text }}
  </button>
  <span v-else class="money">{{ money.text }}</span>
</template>

<style scoped lang="scss">
.money {
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.money--button {
  display: inline;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  text-decoration: underline dotted;
  text-underline-offset: 4px;
  cursor: pointer;
}
</style>

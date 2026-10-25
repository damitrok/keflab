<script setup lang="ts">
import { useShareQuery, useShareState } from '~/composables/useShareState'
import { useSystemCalc } from '~/composables/useSystemCalc'
import CalcForm from './CalcForm.vue'
import CalcResults from './CalcResults.vue'
import ShareLink from './ShareLink.vue'

// n и k задают начальную систему, например на /sistema-3-iz-5/ (шаг 9).
const props = defineProps<{ n?: number; k?: number }>()

// Расчёт из ссылки применяется сразу, в том числе на сервере.
const decoded = useShareQuery()
const calc = useSystemCalc({
  n: props.n,
  k: props.k,
  initial: decoded.kind === 'ok' ? decoded.snapshot : null,
})
const share = useShareState(calc, decoded)
</script>

<template>
  <div class="system-calculator">
    <p v-if="share.notice.value" data-testid="share-notice" role="status" class="notice">
      {{ share.notice.value }}
    </p>
    <CalcForm :calc="calc" />
    <CalcResults :calc="calc">
      <ShareLink
        :copy-state="share.copyState.value"
        :share-url="share.shareUrl.value"
        @copy="share.copy"
      />
    </CalcResults>
  </div>
</template>

<style scoped lang="scss">
.system-calculator {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;

    > .notice {
      grid-column: 1 / -1;
    }
  }
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useShareQuery, useShareState } from '~/composables/useShareState'
import { useSystemCalc } from '~/composables/useSystemCalc'
import type { DecodeResult } from '~/lib/share-state'
import CalcForm from './CalcForm.vue'
import CalcResults from './CalcResults.vue'
import ShareLink from './ShareLink.vue'

const props = withDefaults(
  defineProps<{
    /** Начальная система, например на /sistema-3-iz-5/ (шаг 9). */
    n?: number
    k?: number
    /** Синхронизировать расчёт с адресом и показывать «Скопировать ссылку». */
    share?: boolean
    /** Ключ localStorage; null — не сохранять (например, мини-калькулятор в статье). */
    storageKey?: string | null
  }>(),
  { n: undefined, k: undefined, share: true, storageKey: undefined },
)

// Расчёт из ссылки применяется сразу, в том числе на сервере.
const decoded: DecodeResult = props.share ? useShareQuery() : { kind: 'none' }
const calc = useSystemCalc({
  n: props.n,
  k: props.k,
  storageKey: props.storageKey,
  initial: decoded.kind === 'ok' ? decoded.snapshot : null,
})
const share = props.share ? useShareState(calc, decoded) : null

// Признак, что калькулятор ожил (гидратирован): до этого ввод не считается.
const ready = ref(false)
onMounted(() => (ready.value = true))
</script>

<template>
  <div class="system-calculator" :data-ready="ready ? 'true' : undefined">
    <p v-if="share?.notice.value" data-testid="share-notice" role="status" class="notice">
      {{ share.notice.value }}
    </p>
    <CalcForm
      :calc="calc"
      @input="calc.markUserInput"
      @change="calc.markUserInput"
      @click="calc.markUserInput"
    />
    <CalcResults :calc="calc">
      <ShareLink
        v-if="share"
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

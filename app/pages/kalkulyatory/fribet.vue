<script setup lang="ts">
import FreebetCalculator from '~/components/small-calc/FreebetCalculator.vue'
import SmallCalcLayout from '~/components/small-calc/SmallCalcLayout.vue'
import { freebetContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'

const title = 'Калькулятор фрибета'
const content = freebetContent()

usePageSeo({
  path: '/kalkulyatory/fribet/',
  title: 'Калькулятор фрибета: ожидаемая ценность',
  description:
    'Сколько стоит фрибет на самом деле: выигрыш при заходе и ожидаемая ценность с учётом маржи. Только математика, без обещаний выигрыша.',
  breadcrumbs: smallCalcCrumbs(title),
  webApp: {
    name: title,
    description: 'Выигрыш при заходе и ожидаемая ценность фрибета с учётом маржи букмекера.',
  },
  faq: content.faq,
})

// Условия БК показываются только через блок офферов шага 13 (fail-closed).
provideOfferSlot()
</script>

<template>
  <SmallCalcLayout :title="title" :content="content">
    <FreebetCalculator />
  </SmallCalcLayout>
</template>

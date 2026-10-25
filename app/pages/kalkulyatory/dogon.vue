<script setup lang="ts">
import DogonCalculator from '~/components/small-calc/DogonCalculator.vue'
import SmallCalcLayout from '~/components/small-calc/SmallCalcLayout.vue'
import { dogonContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'

const title = 'Калькулятор догона'
const content = dogonContent()

usePageSeo({
  path: '/kalkulyatory/dogon/',
  title: 'Калькулятор догона: ставки и риск',
  description:
    'Арифметика догона: следующая ставка для цели прибыли и таблица роста ставок. Перед результатом — предупреждение о риске потерять банк.',
  breadcrumbs: smallCalcCrumbs(title),
  webApp: {
    name: title,
    description:
      'Следующая ставка для заданной цели прибыли и таблица роста ставок с предупреждением о риске.',
  },
  faq: content.faq,
})
</script>

<template>
  <SmallCalcLayout :title="title" :content="content">
    <DogonCalculator />
  </SmallCalcLayout>
</template>

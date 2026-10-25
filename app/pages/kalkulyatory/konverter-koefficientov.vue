<script setup lang="ts">
import ConverterCalculator from '~/components/small-calc/ConverterCalculator.vue'
import SmallCalcLayout from '~/components/small-calc/SmallCalcLayout.vue'
import { converterContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'

const title = 'Конвертер коэффициентов'
const content = converterContent()

usePageSeo({
  path: '/kalkulyatory/konverter-koefficientov/',
  title: 'Конвертер коэффициентов: десятичные, дробные',
  description:
    'Конвертер коэффициентов: десятичные, дробные и американские коэффициенты и вероятность.',
  breadcrumbs: smallCalcCrumbs(title),
  webApp: {
    name: title,
    description:
      'Перевод коэффициентов между десятичным, дробным и американским форматами и вероятностью.',
  },
  faq: content.faq,
})
</script>

<template>
  <SmallCalcLayout :title="title" :content="content">
    <ConverterCalculator />
  </SmallCalcLayout>
</template>

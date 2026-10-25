<script setup lang="ts">
import SumOddsCalculator from '~/components/small-calc/SumOddsCalculator.vue'
import SmallCalcLayout from '~/components/small-calc/SmallCalcLayout.vue'
import { sumOddsContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'

const title = 'Сложение коэффициентов'
const content = sumOddsContent()

usePageSeo({
  path: '/kalkulyatory/slozhenie-koefficientov/',
  title: 'Сложение коэффициентов: общий коэффициент',
  description:
    'Калькулятор общего коэффициента: перемножает коэффициенты 2–16 событий, как в экспрессе. Показывает точное и округлённое значение.',
  breadcrumbs: smallCalcCrumbs(title),
  webApp: {
    name: title,
    description: 'Общий коэффициент экспресса из 2–16 событий.',
  },
  faq: content.faq,
})
</script>

<template>
  <SmallCalcLayout :title="title" :content="content">
    <SumOddsCalculator />
  </SmallCalcLayout>
</template>

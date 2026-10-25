<script setup lang="ts">
import MarginCalculator from '~/components/small-calc/MarginCalculator.vue'
import SmallCalcLayout from '~/components/small-calc/SmallCalcLayout.vue'
import { marginContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'

const title = 'Маржа букмекера'
const content = marginContent()

usePageSeo({
  path: '/kalkulyatory/marzha/',
  title: 'Калькулятор маржи букмекера',
  description:
    'Калькулятор маржи: маржа по двум или трём исходам, вероятности и «честные» коэффициенты без маржи.',
  breadcrumbs: smallCalcCrumbs(title),
  webApp: {
    name: title,
    description: 'Маржа букмекера по 2 или 3 исходам и честные коэффициенты без маржи.',
  },
  faq: content.faq,
})
</script>

<template>
  <SmallCalcLayout :title="title" :content="content">
    <MarginCalculator />
  </SmallCalcLayout>
</template>

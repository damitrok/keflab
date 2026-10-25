<script setup lang="ts">
import SystemCalculator from '~/components/calc/SystemCalculator.vue'
import { NO_JS_TEXT } from '~/lib/texts'

definePageMeta({ layout: 'embed' })

// Виджет не индексируется; рекламы и офферов здесь нет ни при каких флагах.
useHead({
  title: 'Виджет: калькулятор системы',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <div>
    <!-- Внутри noscript только текст: элемент внутри даёт расхождение гидратации. -->
    <noscript class="notice">{{ NO_JS_TEXT }}</noscript>
    <SystemCalculator :share="false" :storage-key="null" />
  </div>
</template>

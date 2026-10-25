<script setup lang="ts">
import ExpressCalculator from '~/components/calc/ExpressCalculator.vue'
import { NO_JS_TEXT } from '~/lib/texts'

const { public: site } = useRuntimeConfig()

useHead({
  link: [{ rel: 'canonical', href: `${site.siteUrl}/kalkulyator-ekspressa/` }],
})

useSeoMeta({
  title: 'Калькулятор экспресса: общий коэффициент и возврат',
  description:
    'Калькулятор экспресса: общий коэффициент, возврат и прибыль, статусы событий с возвратом и половинами, расчёт «если одно событие вернут».',
})

const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Калькулятор экспресса' }]
</script>

<template>
  <div class="express-page">
    <Breadcrumbs :items="breadcrumbs" />

    <div class="prose">
      <h1>Калькулятор экспресса</h1>
      <p>
        Экспресс — одна ставка сразу на несколько событий. Она выигрывает, только если сыграли все
        события. Возврат равен ставке, умноженной на общий коэффициент: это произведение
        коэффициентов всех событий.
      </p>
      <p>
        Если ставку на событие вернули, оно считается с коэффициентом 1 и не меняет общий
        коэффициент. Если выиграла половина ставки, коэффициент события равен (коэффициент + 1) / 2,
        а если проиграла половина — 0,5. Проигранное событие обнуляет возврат.
      </p>
      <p>
        Введите ставку и коэффициенты, отметьте исходы — итог пересчитается сразу. Это только
        арифметика: калькулятор не знает, чем закончатся события.
      </p>
    </div>

    <noscript>
      <p class="notice">{{ NO_JS_TEXT }}</p>
    </noscript>

    <ExpressCalculator />

    <p class="express-page__links">
      Считаете систему? Откройте <NuxtLink to="/">Калькулятор системы</NuxtLink>. Новичкам:
      <NuxtLink to="/chto-takoe-sistema-v-stavkah/">Что такое система в ставках</NuxtLink>.
    </p>
  </div>
</template>

<style scoped lang="scss">
.express-page {
  display: grid;
  gap: var(--spacing-40);
}

.express-page__links {
  margin: 0;
}
</style>

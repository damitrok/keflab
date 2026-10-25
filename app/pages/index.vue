<script setup lang="ts">
import CalcStaticExample from '~/components/calc/CalcStaticExample.vue'
import SystemCalculator from '~/components/calc/SystemCalculator.vue'
import { hasShareParams } from '~/lib/share-state'
import { NO_JS_TEXT } from '~/lib/texts'

const route = useRoute()
const { public: site } = useRuntimeConfig()

// Страница с параметрами расчёта — копия главной: не индексировать,
// canonical — на адрес без параметров.
useHead({
  link: [{ rel: 'canonical', href: `${site.siteUrl}/` }],
  meta: hasShareParams(route.query) ? [{ name: 'robots', content: 'noindex, follow' }] : [],
})

useSeoMeta({
  title: 'Калькулятор системы ставок',
  description:
    'Калькулятор системы ставок: возврат и прибыль, разбивка по комбинациям, сценарии «если зайдут m из N» и сравнение с экспрессом и одиночными.',
})
</script>

<template>
  <div class="home">
    <div class="prose">
      <h1>Калькулятор системы ставок</h1>
      <p>
        Система — это набор экспрессов из одних и тех же событий. Система 2 из 3 — все экспрессы по
        два события из трёх, то есть три комбинации. Ставка делится между комбинациями поровну, а
        выплата складывается из комбинаций, где сыграли все события.
      </p>
      <p>
        Введите ставку и коэффициенты, отметьте исходы — итог пересчитается сразу. Если матчи ещё не
        сыграны, вкладка «Сценарии» покажет, сколько вернётся при разном числе зашедших событий. Это
        только арифметика: калькулятор не знает, чем закончатся события.
      </p>
    </div>

    <noscript>
      <p class="notice">{{ NO_JS_TEXT }}</p>
    </noscript>

    <SystemCalculator />

    <CalcStaticExample />

    <nav class="home__more" aria-label="Другие разделы">
      <h2>Ещё по теме</h2>
      <ul>
        <li>
          <NuxtLink to="/chto-takoe-sistema-v-stavkah/">Что такое система в ставках</NuxtLink> —
          разбор для новичков: как делится ставка и сколько нужно зашедших событий.
        </li>
        <li>
          <NuxtLink to="/kalkulyator-ekspressa/">Калькулятор экспресса</NuxtLink> — общий
          коэффициент и что будет, если одно событие вернут.
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.home {
  display: grid;
  gap: var(--spacing-40);
}

.home__more ul {
  display: grid;
  gap: var(--spacing-16);
  margin: 0;
  padding-left: var(--spacing-24);
}

.home__more a {
  color: var(--color-bone);
}
</style>

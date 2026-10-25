<script setup lang="ts">
import Breadcrumbs from '~/components/Breadcrumbs.vue'
import FaqList from '~/components/article/FaqList.vue'
import SystemCalculator from '~/components/calc/SystemCalculator.vue'
import NeighborsTable from '~/components/system-page/NeighborsTable.vue'
import SystemExample from '~/components/system-page/SystemExample.vue'
import WinsTable from '~/components/system-page/WinsTable.vue'
import { SYSTEM_PAGES } from '#shared/site-pages'
import { systemIntro } from '~/lib/system-intros'
import { eventsWord, parseSystemParams, systemPageData } from '~/lib/system-page'
import { NO_JS_TEXT } from '~/lib/texts'

// Один компонент на все 21 страницу: при переходе между соседями его надо
// пересоздавать, иначе SEO и калькулятор останутся от предыдущей системы.
definePageMeta({ key: (route) => route.path })

const route = useRoute()
const params = parseSystemParams(route.params.k, route.params.n, SYSTEM_PAGES)
if (!params) throw createError({ statusCode: 404, fatal: true })

const page = systemPageData(params.k, params.n, SYSTEM_PAGES)
const intro = systemIntro(page)
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: `Система ${page.k} из ${page.n}` }]

usePageSeo({
  path: page.path,
  title: page.title,
  description: page.description,
  breadcrumbs,
  webApp: {
    name: `Калькулятор системы ${page.k} из ${page.n}`,
    description: `Возврат и прибыль по системе ${page.k} из ${page.n}: ${page.combinations} комбинаций, разбивка и сценарии.`,
  },
  faq: page.faq,
})

// Офферы разрешены только здесь (правило 9, fail-closed).
provideOfferSlot()
</script>

<template>
  <div class="system-page">
    <!-- TODO(text): вводные абзацы и шаблон написаны ИИ, вычитывает человек -->
    <Breadcrumbs :items="breadcrumbs" />

    <div class="prose">
      <h1>{{ page.h1 }}</h1>
      <p data-testid="system-intro">{{ intro }}</p>
    </div>

    <!-- Внутри noscript только текст: элемент внутри даёт расхождение гидратации. -->
    <noscript class="notice">{{ NO_JS_TEXT }}</noscript>

    <SystemCalculator :n="page.n" :k="page.k" :share="false" />

    <section aria-labelledby="wins-h" class="system-page__section">
      <h2 id="wins-h">Сколько комбинаций и сколько нужно побед</h2>
      <p class="system-page__lead">
        Комбинаций в системе {{ page.k }} из {{ page.n }}: {{ page.combinations }}, в каждой по
        {{ eventsWord(page.k) }}. Выплата появляется, когда зашло не меньше {{ page.k }}.
      </p>
      <WinsTable
        :k="page.k"
        :n="page.n"
        :stake-text="page.example.stakeText"
        :rows="page.winsTable"
      />
    </section>

    <SystemExample
      :k="page.k"
      :n="page.n"
      :combinations="page.combinations"
      :example="page.example"
    />

    <section aria-labelledby="near-h" class="system-page__section">
      <h2 id="near-h">Сравнение с соседними системами</h2>
      <NeighborsTable :rows="page.comparison" />
    </section>

    <section aria-labelledby="faq-h" class="system-page__section">
      <h2 id="faq-h">Частые вопросы</h2>
      <FaqList>
        <details v-for="item in page.faq" :key="item.question">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
      </FaqList>
    </section>

    <p class="system-page__links">
      Другая система? Откройте <NuxtLink to="/">Калькулятор системы</NuxtLink>. Новичкам:
      <NuxtLink to="/chto-takoe-sistema-v-stavkah/">Что такое система в ставках</NuxtLink>.
    </p>
  </div>
</template>

<style scoped lang="scss">
.system-page {
  display: grid;
  gap: var(--spacing-40);
}

.system-page__section {
  min-width: 0;
}

.system-page__lead {
  color: var(--color-pale-stone);
}

.system-page__links {
  margin: 0;
}
</style>

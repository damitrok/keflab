<script setup lang="ts">
import Breadcrumbs from '~/components/Breadcrumbs.vue'
import FaqList from '~/components/article/FaqList.vue'
import type { SmallCalcContent } from '~/lib/small-calc-content'
import { smallCalcCrumbs } from '~/lib/small-calc-texts'
import { NO_JS_TEXT } from '~/lib/texts'

const props = defineProps<{ title: string; content: SmallCalcContent }>()
const crumbs = computed(() => smallCalcCrumbs(props.title))
</script>

<template>
  <div class="small-page">
    <Breadcrumbs :items="crumbs" />

    <div class="prose">
      <h1>{{ title }}</h1>
      <p>{{ content.lead }}</p>
    </div>

    <!-- Внутри noscript только текст: элемент внутри даёт расхождение гидратации. -->
    <noscript class="notice">{{ NO_JS_TEXT }}</noscript>

    <slot />

    <article class="prose small-page__text">
      <section v-for="section in content.sections" :key="section.heading">
        <h2>{{ section.heading }}</h2>
        <p v-for="(p, i) in section.paragraphs" :key="i">{{ p }}</p>
      </section>
    </article>

    <div class="prose">
      <h2>Частые вопросы</h2>
      <FaqList>
        <details v-for="item in content.faq" :key="item.question">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
      </FaqList>
      <p>
        Считаете систему? Откройте <NuxtLink to="/">Калькулятор системы</NuxtLink>. Ещё есть
        <NuxtLink to="/kalkulyator-ekspressa/">Калькулятор экспресса</NuxtLink> и
        <NuxtLink to="/kalkulyatory/">другие калькуляторы</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.small-page {
  display: grid;
  gap: var(--spacing-40);
  min-width: 0;
}
</style>

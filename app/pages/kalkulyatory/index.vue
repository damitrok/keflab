<script setup lang="ts">
import Breadcrumbs from '~/components/Breadcrumbs.vue'
import { MAIN_CALC_LINKS, SMALL_CALC_LINKS, smallCalcCrumbs } from '~/lib/small-calc-texts'

const breadcrumbs = smallCalcCrumbs()

usePageSeo({
  path: '/kalkulyatory/',
  title: 'Калькуляторы для ставок',
  description:
    'Калькуляторы для ставок: система, экспресс, маржа букмекера, сложение коэффициентов, догон, фрибет и конвертер коэффициентов. Только математика.',
  breadcrumbs,
})
</script>

<template>
  <div class="hub">
    <Breadcrumbs :items="breadcrumbs" />

    <!-- TODO(text): текст написан ИИ, вычитывает человек. -->
    <div class="prose">
      <h1>Калькуляторы для ставок</h1>
      <p>
        Здесь собраны калькуляторы, которые помогают разобраться в цифрах ставок: во что
        превращаются коэффициенты, сколько стоит линия и как устроены системы и экспрессы. Все они
        считают только арифметику по тем числам, которые вы вводите. Ничего не предсказывают и не
        советуют, на что ставить.
      </p>
      <p>
        Главные калькуляторы сайта считают систему и экспресс. Маленькие помощники дополняют их:
        показывают маржу букмекера, перемножают коэффициенты, переводят дробные и американские
        записи в десятичную и показывают, как быстро растут ставки при догоне. Для каждого есть
        пояснение с примером и ответы на частые вопросы.
      </p>
      <p>
        Сайт только для совершеннолетних. Ставки связаны с риском потерять деньги, играйте только на
        сумму, которую готовы потерять.
      </p>
    </div>

    <section aria-labelledby="hub-main">
      <h2 id="hub-main">Главные калькуляторы</h2>
      <ul class="hub__list">
        <li v-for="link in MAIN_CALC_LINKS" :key="link.path" class="hub__card">
          <NuxtLink :to="link.path" class="hub__title">{{ link.title }}</NuxtLink>
          <p>{{ link.description }}</p>
        </li>
      </ul>
    </section>

    <section aria-labelledby="hub-small">
      <h2 id="hub-small">Малые калькуляторы</h2>
      <ul class="hub__list">
        <li v-for="link in SMALL_CALC_LINKS" :key="link.path" class="hub__card">
          <NuxtLink :to="link.path" class="hub__title">{{ link.title }}</NuxtLink>
          <p>{{ link.description }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.hub {
  display: grid;
  gap: var(--spacing-32);
  min-width: 0;
}

.hub__list {
  display: grid;
  gap: var(--spacing-16);
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.hub__card {
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
  background: var(--color-carbon-lift);

  p {
    margin: var(--spacing-8) 0 0;
    color: var(--color-pale-stone);
  }
}

.hub__title {
  display: inline-block;
  min-height: 44px;
  line-height: 44px;
  color: var(--color-bone);
  font-size: 20px;
}
</style>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const view = computed(() => {
  if (props.error.statusCode === 404) {
    return {
      title: 'Страница не найдена',
      text: 'Такого адреса нет. Возможно, ссылка устарела или в ней опечатка.',
    }
  }
  if (props.error.statusCode === 410) {
    return {
      title: 'Страница удалена',
      text: 'Эта страница удалена и больше не вернётся.',
    }
  }
  return {
    title: 'Что-то пошло не так',
    text: 'Не удалось показать страницу. Попробуйте обновить её или вернитесь на главную.',
  }
})

useHead({
  title: view.value.title,
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <NuxtLayout>
    <section class="error-page">
      <h1>{{ view.title }}</h1>
      <p>{{ view.text }}</p>
      <ul>
        <li><NuxtLink to="/">Калькулятор системы</NuxtLink></li>
        <li><NuxtLink to="/kalkulyator-ekspressa/">Калькулятор экспресса</NuxtLink></li>
        <li>
          <NuxtLink to="/chto-takoe-sistema-v-stavkah/">Что такое система в ставках</NuxtLink>
        </li>
      </ul>
    </section>
  </NuxtLayout>
</template>

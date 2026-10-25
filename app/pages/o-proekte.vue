<script setup lang="ts">
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'О проекте' }]

usePageSeo({
  path: '/o-proekte/',
  title: 'О проекте',
  description:
    'О проекте keflab.ru: справочный сайт с калькуляторами системы и экспресса. Страница готовится.',
  breadcrumbs,
})
</script>

<template>
  <div>
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <!-- TODO(legal): текст страницы утверждает юрист. -->
      <h1>О проекте</h1>
      <p class="notice">Текст готовится и будет утверждён юристом.</p>
    </div>
  </div>
</template>

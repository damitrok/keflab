<script setup lang="ts">
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Реклама на сайте' }]

usePageSeo({
  path: '/reklama/',
  title: 'Реклама на сайте',
  description:
    'Условия размещения рекламы на keflab.ru. Страница готовится и будет утверждена юристом.',
  breadcrumbs,
})
</script>

<template>
  <div>
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <!-- TODO(legal): текст страницы утверждает юрист. -->
      <h1>Реклама на сайте</h1>
      <p class="notice">Текст готовится и будет утверждён юристом.</p>
    </div>
  </div>
</template>

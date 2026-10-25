<script setup lang="ts">
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Политика конфиденциальности' }]

usePageSeo({
  path: '/politika-konfidencialnosti/',
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности keflab.ru: какие данные обрабатываются и как. Страница готовится.',
  breadcrumbs,
})
</script>

<template>
  <div>
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <!-- TODO(legal): текст страницы утверждает юрист. -->
      <h1>Политика конфиденциальности</h1>
      <p class="notice">Текст готовится и будет утверждён юристом.</p>
    </div>
  </div>
</template>

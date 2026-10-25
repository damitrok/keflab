<script setup lang="ts">
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Ответственная игра' }]

usePageSeo({
  path: '/otvetstvennaya-igra/',
  title: 'Ответственная игра',
  description:
    'Справка об ответственном отношении к ставкам. Страница готовится и будет утверждена юристом.',
  breadcrumbs,
})
</script>

<template>
  <div>
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <!-- TODO(legal): текст страницы утверждает юрист. -->
      <h1>Ответственная игра</h1>
      <p class="notice">Текст готовится и будет утверждён юристом.</p>
    </div>
  </div>
</template>

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
      <h1>Реклама на сайте</h1>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Как размещается реклама</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Маркировка рекламы</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Контакты для рекламодателей</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
    </div>
  </div>
</template>

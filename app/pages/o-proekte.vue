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
      <h1>О проекте</h1>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Что это за сайт</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Кто делает сайт</h2>
        <LegalMediaImprint />
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Как с нами связаться</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
    </div>
  </div>
</template>

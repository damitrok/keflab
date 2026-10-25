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
      <h1>Ответственная игра</h1>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Как ограничить себя у букмекера</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): телефоны и адреса служб помощи даёт человек (AGENTS.md, правило 3); внешних ссылок нет. -->
        <h2>Куда обратиться за помощью</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Признаки проблемы</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
    </div>
  </div>
</template>

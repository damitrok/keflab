<script setup lang="ts">
import WidgetGenerator from '~/components/widget/WidgetGenerator.vue'
import { WIDGET_PAGE as T } from '~/lib/widget-texts'

const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Виджет' }]

usePageSeo({
  path: '/vidzhet/',
  title: T.title,
  description: T.description,
  breadcrumbs,
})
</script>

<template>
  <div class="widget-page">
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <h1>{{ T.h1 }}</h1>
      <!-- TODO(text): черновик ИИ -->
      <p v-for="(p, i) in T.intro" :key="i">{{ p }}</p>
    </div>

    <WidgetGenerator />

    <div class="prose">
      <h2>{{ T.howTitle }}</h2>
      <ol>
        <li v-for="(s, i) in T.how" :key="i">{{ s }}</li>
      </ol>
    </div>
  </div>
</template>

<style scoped lang="scss">
.widget-page {
  display: grid;
  gap: var(--spacing-40);
}
</style>

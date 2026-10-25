<script setup lang="ts">
// Имя файла задано в ТЗ; для линтера — составное имя компонента.
defineOptions({ name: 'SiteBreadcrumbs' })

defineProps<{
  items: { label: string; to?: string }[]
}>()
</script>

<template>
  <nav aria-label="Хлебные крошки" class="crumbs">
    <ol class="crumbs__list">
      <li v-for="(item, i) in items" :key="i" class="crumbs__item">
        <span v-if="i === items.length - 1 || !item.to" aria-current="page">{{ item.label }}</span>
        <NuxtLink v-else :to="item.to">{{ item.label }}</NuxtLink>
      </li>
    </ol>
  </nav>
</template>

<style scoped lang="scss">
.crumbs {
  margin-bottom: var(--spacing-24);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-sm);
}

.crumbs__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-8) 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.crumbs__item {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-pale-stone);
}

// Разделитель — только оформление, в ссылку и текст не попадает.
.crumbs__item:not(:last-child)::after {
  padding: 0 var(--spacing-8);
  color: var(--color-warm-granite);
  content: '/';
}

.crumbs__item a {
  color: var(--color-bone);
}
</style>

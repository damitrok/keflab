<script setup lang="ts">
import site from '../../../data/site.json'
import type { Media } from '../../../data/schema'
import { imprintRows } from './imprint'

const props = defineProps<{ media?: Media }>()

const rows = computed(() => imprintRows(props.media ?? site.media))
</script>

<template>
  <section v-if="rows.length > 0" class="imprint" aria-labelledby="imprint-title">
    <h2 id="imprint-title" class="imprint__title">Выходные данные</h2>
    <dl class="imprint__list">
      <div v-for="row in rows" :key="row.label" class="imprint__row">
        <dt>{{ row.label }}</dt>
        <dd>
          <a v-if="row.href" :href="row.href">{{ row.value }}</a>
          <template v-else>{{ row.value }}</template>
        </dd>
      </div>
      <div class="imprint__row">
        <dt>Возрастная категория</dt>
        <dd>18+</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.imprint {
  &__title {
    margin: 0 0 var(--spacing-8);
    color: var(--color-pale-stone);
    font-size: var(--text-body-sm);
    font-weight: 500;
  }

  &__list {
    display: grid;
    gap: var(--spacing-8);
    margin: 0;
  }

  &__row {
    display: grid;
    gap: 2px;
    font-size: var(--text-body-sm);
    line-height: var(--leading-body-sm);
    overflow-wrap: anywhere;
  }

  dt {
    color: var(--color-pale-stone);
  }

  dd {
    margin: 0;
    color: var(--color-bone);
  }

  a {
    color: var(--color-bone);
  }
}
</style>

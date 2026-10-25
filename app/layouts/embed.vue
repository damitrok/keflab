<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { WIDGET_MESSAGE_TYPE, WIDGET_CAPTION, WIDGET_ORIGIN } from '../lib/widget-code'

// Макет виджета: без шапки, подвала, баннера cookie и Метрики. Согласие не
// читается (useConsent().load() не вызывается), поэтому аналитики нет.
const theme = useEmbedTheme()
useHead({
  htmlAttrs: { class: computed(() => `theme-${theme.value}`) },
})

const root = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
let frame = 0
let lastHeight = 0

function report(): void {
  frame = 0
  const el = root.value
  if (!el || window.parent === window) return
  const height = Math.ceil(el.getBoundingClientRect().height)
  if (height === lastHeight) return
  lastHeight = height
  // Родителя мы не знаем, поэтому '*': в сообщении только число, секретов нет.
  window.parent.postMessage({ type: WIDGET_MESSAGE_TYPE, height }, '*')
}

function schedule(): void {
  if (frame === 0) frame = window.requestAnimationFrame(report)
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !root.value) return
  observer = new ResizeObserver(schedule)
  observer.observe(root.value)
  schedule()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <div ref="root" class="embed">
    <div class="embed__bar">
      <LegalAgeMark />
      <a class="embed__brand" :href="`${WIDGET_ORIGIN}/`" target="_blank" rel="noopener">
        {{ WIDGET_CAPTION }}
      </a>
    </div>
    <main class="embed__main">
      <slot />
    </main>
  </div>
</template>

<style lang="scss">
@use '../assets/styles/theme-light';
</style>

<style scoped lang="scss">
.embed {
  min-width: 320px;
  padding: var(--spacing-16);

  &__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-8) var(--spacing-16);
    margin-bottom: var(--spacing-16);
  }

  &__brand {
    color: var(--color-pale-stone);
    font-size: var(--text-body-sm);
  }

  &__main {
    min-width: 0;
  }
}
</style>

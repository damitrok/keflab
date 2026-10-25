<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { GOALS, sendGoal } from '../../lib/goals'
import {
  WIDGET_DEFAULT_HEIGHT,
  WIDGET_MAX_HEIGHT,
  WIDGET_MESSAGE_TYPE,
  WIDGET_MIN_HEIGHT,
  buildWidgetCode,
  normalizeWidth,
} from '../../lib/widget-code'
import { WIDGET_PAGE as T } from '../../lib/widget-texts'

const widthMode = ref<'full' | 'fixed'>('full')
const fixedWidth = ref('600')
const theme = ref<'dark' | 'light'>('dark')

const width = computed(() =>
  widthMode.value === 'full' ? '100%' : normalizeWidth(fixedWidth.value),
)
const widthInvalid = computed(() => widthMode.value === 'fixed' && width.value === '100%')

// Фиксированный id: код на странице один, а в чужом коде id случайный не нужен.
const code = computed(() =>
  buildWidgetCode({ width: width.value, theme: theme.value, id: 'keflab-widget' }),
)

// Превью — на нашем же сайте, поэтому относительный адрес.
const previewSrc = computed(() => `/embed/sistema/?theme=${theme.value}`)
const previewWidth = computed(() => (width.value === '100%' ? '100%' : `${width.value}px`))

const previewHeight = ref(WIDGET_DEFAULT_HEIGHT)
const frame = ref<HTMLIFrameElement | null>(null)

function onMessage(event: MessageEvent): void {
  if (event.origin !== window.location.origin) return
  if (event.source !== frame.value?.contentWindow) return
  const data = event.data as { type?: unknown; height?: unknown } | null
  if (!data || data.type !== WIDGET_MESSAGE_TYPE) return
  const h = data.height
  if (typeof h !== 'number' || !Number.isFinite(h)) return
  if (h < WIDGET_MIN_HEIGHT || h > WIDGET_MAX_HEIGHT) return
  previewHeight.value = Math.round(h)
}

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

const copyState = ref<'idle' | 'copied' | 'manual'>('idle')
const field = ref<HTMLTextAreaElement | null>(null)

async function copy(): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(code.value)
    copyState.value = 'copied'
    sendGoal(GOALS.widgetCodeCopied)
  } catch {
    // Встроенные браузеры мессенджеров часто не дают доступа к буферу.
    copyState.value = 'manual'
    sendGoal(GOALS.widgetCodeCopied, { manual: true })
    await nextTick()
    field.value?.focus()
    field.value?.select()
  }
}

function resetCopy(): void {
  copyState.value = 'idle'
}
</script>

<template>
  <section class="generator" aria-labelledby="generator-title">
    <h2 id="generator-title">{{ T.generatorTitle }}</h2>

    <div class="generator__options">
      <fieldset class="generator__group">
        <legend>{{ T.widthLegend }}</legend>
        <label class="generator__radio">
          <input v-model="widthMode" type="radio" name="width" value="full" @change="resetCopy" />
          {{ T.widthFull }}
        </label>
        <label class="generator__radio">
          <input v-model="widthMode" type="radio" name="width" value="fixed" @change="resetCopy" />
          {{ T.widthFixed }}
        </label>
        <input
          v-if="widthMode === 'fixed'"
          v-model="fixedWidth"
          class="generator__number"
          type="text"
          inputmode="numeric"
          aria-label="Ширина в пикселях"
          aria-describedby="width-hint"
          :aria-invalid="widthInvalid ? 'true' : undefined"
          @input="resetCopy"
        />
        <p v-if="widthMode === 'fixed'" id="width-hint" class="generator__hint">
          {{ T.widthHint }}
        </p>
      </fieldset>

      <fieldset class="generator__group">
        <legend>{{ T.themeLegend }}</legend>
        <label class="generator__radio">
          <input v-model="theme" type="radio" name="theme" value="dark" @change="resetCopy" />
          {{ T.themeDark }}
        </label>
        <label class="generator__radio">
          <input v-model="theme" type="radio" name="theme" value="light" @change="resetCopy" />
          {{ T.themeLight }}
        </label>
      </fieldset>
    </div>

    <h3>{{ T.previewTitle }}</h3>
    <div class="generator__preview">
      <iframe
        ref="frame"
        :src="previewSrc"
        title="Калькулятор системы ставок keflab.ru (превью)"
        loading="lazy"
        class="generator__frame"
        :style="{ width: previewWidth, height: `${previewHeight}px` }"
      />
    </div>

    <label class="generator__label" for="widget-code">{{ T.codeLabel }}</label>
    <textarea
      id="widget-code"
      ref="field"
      class="generator__code"
      readonly
      rows="10"
      spellcheck="false"
      :value="code"
    />
    <button type="button" class="generator__button" @click="copy">{{ T.copy }}</button>
    <p role="status" class="generator__status">
      <template v-if="copyState === 'copied'">{{ T.copied }}</template>
      <template v-else-if="copyState === 'manual'">{{ T.manual }}</template>
    </p>
  </section>
</template>

<style scoped lang="scss">
.generator {
  display: grid;
  gap: var(--spacing-16);

  h2,
  h3 {
    margin: 0;
  }

  h3 {
    font-size: 18px;
  }

  &__options {
    display: grid;
    gap: var(--spacing-16);
  }

  &__group {
    display: grid;
    gap: var(--spacing-8);
    margin: 0;
    padding: var(--spacing-16);
    border: 1px solid var(--color-ash-stroke);
    border-radius: var(--radius-cards);
  }

  &__radio {
    display: flex;
    align-items: center;
    gap: var(--spacing-8);
    min-height: 44px;
  }

  &__number {
    max-width: 160px;
    min-height: 44px;
    padding: 0 var(--spacing-16);
    border: 1px solid var(--color-ash-stroke);
    border-radius: var(--radius-buttons);
    background: var(--color-obsidian-canvas);
    color: var(--color-bone);
    font: inherit;
    font-size: 16px;
  }

  &__hint,
  &__status {
    margin: 0;
    color: var(--color-pale-stone);
    font-size: var(--text-body-sm);
  }

  &__status:empty {
    display: none;
  }

  &__preview {
    overflow-x: auto;
    border: 1px dashed var(--color-ash-stroke);
    border-radius: var(--radius-cards);
  }

  &__frame {
    display: block;
    max-width: 100%;
    border: 0;
  }

  &__code {
    width: 100%;
    padding: var(--spacing-16);
    border: 1px solid var(--color-ash-stroke);
    border-radius: var(--radius-buttons);
    background: var(--color-carbon-lift);
    color: var(--color-bone);
    font-family: var(--font-geist-mono);
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
  }

  &__button {
    justify-self: start;
    min-height: 44px;
    padding: 0 var(--spacing-16);
    border: 1px solid var(--color-ash-stroke);
    border-radius: var(--radius-buttons);
    background: var(--color-carbon-lift);
    color: var(--color-bone);
    font: inherit;
    cursor: pointer;
  }
}
</style>

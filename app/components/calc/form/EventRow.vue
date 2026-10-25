<script setup lang="ts">
import { EVENT_STATUSES, type EventStatus, type InputErrorCode } from '~/lib/calc'
import {
  ODDS_ERROR_TEXTS,
  ODDS_FORMAT_HINT,
  STATUS_TEXTS,
  looksLikeOtherOddsFormat,
} from '~/lib/texts'

const props = defineProps<{
  id: number
  index: number
  odds: string
  status: EventStatus
  error: InputErrorCode | null
  canRemove: boolean
}>()

const emit = defineEmits<{
  'update:odds': [value: string]
  'update:status': [value: EventStatus]
  remove: []
}>()

const touched = ref(false)
const hintOpen = ref(false)

const shownError = computed(() => {
  if (!props.error) return null
  if (props.error === 'empty' && !touched.value) return null
  return props.error
})
const otherFormat = computed(() => looksLikeOtherOddsFormat(props.odds))

function onOdds(event: Event) {
  touched.value = true
  emit('update:odds', (event.target as HTMLInputElement).value)
}

function onStatus(event: Event) {
  emit('update:status', (event.target as HTMLSelectElement).value as EventStatus)
}
</script>

<template>
  <li class="event">
    <span class="event__num" aria-hidden="true">№ {{ index }}</span>

    <div class="event__odds">
      <label :for="`odds-${id}`" class="sr-only">Коэффициент события {{ index }}</label>
      <input
        :id="`odds-${id}`"
        class="event__input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="Коэффициент"
        :value="odds"
        :aria-invalid="shownError ? 'true' : undefined"
        :aria-describedby="shownError ? `odds-${id}-error` : undefined"
        @input="onOdds"
        @blur="touched = true"
      />
    </div>

    <div class="event__status">
      <label :for="`status-${id}`" class="sr-only">Исход события {{ index }}</label>
      <select
        :id="`status-${id}`"
        class="event__select"
        :value="status"
        :aria-describedby="`status-${id}-hint`"
        @change="onStatus"
      >
        <option v-for="s in EVENT_STATUSES" :key="s" :value="s" :selected="s === status">
          {{ STATUS_TEXTS[s].label }}
        </option>
      </select>
    </div>

    <button
      type="button"
      class="event__btn event__help"
      :aria-expanded="hintOpen"
      :aria-controls="`status-${id}-hint`"
      :aria-label="`Что значит исход события ${index}`"
      @click="hintOpen = !hintOpen"
    >
      ?
    </button>

    <button
      type="button"
      class="event__btn event__remove"
      :aria-label="`Удалить событие ${index}`"
      :disabled="!canRemove"
      @click="emit('remove')"
    >
      <span aria-hidden="true">×</span>
    </button>

    <p v-if="shownError" :id="`odds-${id}-error`" class="event__error">
      <template v-if="shownError === 'invalid_format' && otherFormat">
        {{ ODDS_FORMAT_HINT.text }}
        <NuxtLink :to="ODDS_FORMAT_HINT.href">{{ ODDS_FORMAT_HINT.linkText }}</NuxtLink>
      </template>
      <template v-else>{{ ODDS_ERROR_TEXTS[shownError] }}</template>
    </p>

    <p v-show="hintOpen" :id="`status-${id}-hint`" class="event__hint">
      {{ STATUS_TEXTS[status].hint }}
    </p>
  </li>
</template>

<style scoped lang="scss">
.event {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 44px 44px;
  grid-template-areas:
    'num odds odds remove'
    'num status help help'
    'err err err err'
    'hint hint hint hint';
  align-items: center;
  gap: 6px 8px;
  padding: var(--spacing-16) 0;
  border-top: 1px solid var(--color-ash-stroke);
  list-style: none;
}

.event__num {
  grid-area: num;
  align-self: start;
  min-width: 3.2em;
  padding-top: 14px;
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}

.event__odds {
  grid-area: odds;
  min-width: 0;
}

.event__status {
  grid-area: status;
  min-width: 0;
}

.event__input,
.event__select {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-sm);
  background: var(--color-carbon-lift);
  color: var(--color-bone);
  font: inherit;
  font-size: 16px;
}

.event__input[aria-invalid='true'] {
  border-color: var(--color-signal-orange);
}

.event__btn {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-buttons);
  background: transparent;
  color: var(--color-bone);
  font: inherit;
  font-size: 18px;
  cursor: pointer;

  &:disabled {
    color: var(--color-warm-granite);
    cursor: not-allowed;
  }
}

.event__help {
  grid-area: help;
  justify-self: start;
}

.event__remove {
  grid-area: remove;
}

.event__error {
  grid-area: err;
  margin: 0;
  font-size: var(--text-body-sm);
  color: var(--color-signal-orange);

  a {
    color: inherit;
  }
}

.event__hint {
  grid-area: hint;
  margin: 0;
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

<script setup lang="ts">
import { STAKE_ERROR_TEXTS } from '~/lib/texts'
import type { InputErrorCode } from '~/lib/calc'

const props = defineProps<{ error: InputErrorCode | null }>()
const model = defineModel<string>({ required: true })

/** Ошибку пустого поля показываем только после касания. */
const touched = ref(false)

const shownError = computed(() => {
  if (!props.error) return null
  if (props.error === 'empty' && !touched.value) return null
  return props.error
})

function reset() {
  touched.value = false
}

defineExpose({ reset })
</script>

<template>
  <div class="field">
    <label for="stake" class="field__label">Сумма ставки, ₽</label>
    <input
      id="stake"
      v-model="model"
      class="field__input"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :aria-invalid="shownError ? 'true' : undefined"
      :aria-describedby="shownError ? 'stake-error' : undefined"
      @input="touched = true"
      @blur="touched = true"
    />
    <p v-if="shownError" id="stake-error" class="field__error">
      {{ STAKE_ERROR_TEXTS[shownError] }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field__label {
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}

.field__input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--spacing-16);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-sm);
  background: var(--color-carbon-lift);
  color: var(--color-bone);
  font: inherit;
  font-size: 16px; // 16px: iOS не приближает страницу при фокусе
}

.field__input[aria-invalid='true'] {
  border-color: var(--color-signal-orange);
}

.field__error {
  margin: 0;
  font-size: var(--text-body-sm);
  color: var(--color-signal-orange);
}
</style>

<script setup lang="ts">
import type { FieldError } from '~/lib/small-calc-texts'
import { CONVERTER_HREF, CONVERTER_LINK_TEXT } from '~/lib/small-calc-texts'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    error?: FieldError | null
    inputmode?: 'decimal' | 'numeric' | 'text'
    placeholder?: string
    removable?: boolean
    removeLabel?: string
  }>(),
  { error: null, inputmode: 'decimal', placeholder: '', removable: false, removeLabel: '' },
)
const emit = defineEmits<{ remove: [] }>()
const model = defineModel<string>({ required: true })

/** Ошибку пустого поля показываем только после касания. */
const touched = ref(false)
const shown = computed(() => {
  const e = props.error
  if (!e) return null
  return e.empty && !touched.value ? null : e
})
</script>

<template>
  <div class="field">
    <label :for="id" class="field__label">{{ label }}</label>
    <div class="field__row">
      <input
        :id="id"
        v-model="model"
        class="field__input"
        type="text"
        :inputmode="inputmode"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-invalid="shown ? 'true' : undefined"
        :aria-describedby="shown ? `${id}-error` : undefined"
        @input="touched = true"
        @blur="touched = true"
      />
      <button
        v-if="removable"
        type="button"
        class="field__remove"
        :aria-label="removeLabel"
        @click="emit('remove')"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <p v-if="shown" :id="`${id}-error`" class="field__error">
      {{ shown.text }}
      <NuxtLink v-if="shown.withConverterLink" :to="CONVERTER_HREF">{{
        CONVERTER_LINK_TEXT
      }}</NuxtLink>
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

.field__row {
  display: flex;
  gap: var(--spacing-8);
}

.field__input {
  flex: 1;
  width: 100%;
  min-width: 0;
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

.field__remove {
  flex: none;
  min-width: 48px;
  min-height: 48px;
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-buttons);
  background: transparent;
  color: var(--color-bone);
  font: inherit;
  font-size: 18px;
  cursor: pointer;
}

.field__error {
  margin: 0;
  font-size: var(--text-body-sm);
  color: var(--color-signal-orange);

  a {
    color: inherit;
  }
}
</style>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  copyState: 'idle' | 'copied' | 'manual'
  shareUrl: string
}>()
const emit = defineEmits<{ copy: [] }>()

const field = ref<HTMLInputElement | null>(null)

watch(
  () => props.copyState,
  async (state) => {
    if (state !== 'manual') return
    await nextTick()
    field.value?.focus()
    field.value?.select()
  },
)
</script>

<template>
  <div class="share">
    <button type="button" class="share__button" @click="emit('copy')">Скопировать ссылку</button>
    <p role="status" class="share__status">
      <template v-if="copyState === 'copied'">Ссылка скопирована</template>
    </p>
    <div v-if="copyState === 'manual'" class="share__manual">
      <label for="share-url">Ссылка на расчёт</label>
      <input
        id="share-url"
        ref="field"
        class="share__input"
        type="text"
        readonly
        :value="shareUrl"
        aria-describedby="share-url-hint"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <p id="share-url-hint" class="share__hint">Скопируйте ссылку вручную.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.share {
  display: grid;
  gap: var(--spacing-8);
  margin-top: var(--spacing-24);
}

.share__button {
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

.share__status:empty {
  display: none;
}

.share__status,
.share__hint {
  margin: 0;
  color: var(--color-pale-stone);
  font-size: var(--text-body-sm);
}

.share__manual {
  display: grid;
  gap: var(--spacing-8);
}

.share__input {
  width: 100%;
  min-height: 44px;
  padding: 0 var(--spacing-16);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-buttons);
  background: var(--color-obsidian-canvas);
  color: var(--color-bone);
  font: inherit;
  font-size: 16px;
}
</style>

<script setup lang="ts">
import type { ExpressCalc } from '~/composables/useExpressCalc'
import type { EventStatus } from '~/lib/calc'
import { MAX_EVENTS } from '~/lib/calc'
import EventRow from '../form/EventRow.vue'
import StakeField from '../form/StakeField.vue'

const props = defineProps<{ calc: ExpressCalc }>()

const stakeField = ref<InstanceType<typeof StakeField> | null>(null)
const { stakeInput } = props.calc

/** Смена ключа пересоздаёт строки: у них сбрасывается «тронуто». */
const rowsKey = ref(0)

function focusById(id: string) {
  document.getElementById(id)?.focus()
}

async function onAdd() {
  const added = props.calc.addEvent()
  if (!added) return
  await nextTick()
  focusById(`odds-${added.id}`)
}

async function onRemove(id: number) {
  const list = props.calc.events.value
  const idx = list.findIndex((e) => e.id === id)
  if (idx === -1 || !props.calc.canRemove.value) return
  // Сосед после удаления: следующий, а если удалили последнее — предыдущий.
  const neighbour = list[idx + 1] ?? list[idx - 1]
  props.calc.removeEvent(id)
  await nextTick()
  if (neighbour) focusById(`odds-${neighbour.id}`)
}

async function onClear() {
  props.calc.clearAll()
  stakeField.value?.reset()
  rowsKey.value++
  await nextTick()
  focusById('stake')
}

function setOdds(id: number, value: string) {
  const e = props.calc.events.value.find((x) => x.id === id)
  if (e) e.odds = value
}

function setStatus(id: number, value: EventStatus) {
  const e = props.calc.events.value.find((x) => x.id === id)
  if (e) e.status = value
}
</script>

<template>
  <form class="express-form" novalidate @submit.prevent>
    <StakeField ref="stakeField" v-model="stakeInput" :error="calc.stakeError.value" />

    <ol :key="rowsKey" class="express-events">
      <EventRow
        v-for="(e, i) in calc.events.value"
        :id="e.id"
        :key="e.id"
        :index="i + 1"
        :odds="e.odds"
        :status="e.status"
        :error="calc.eventErrors.value[i] ?? null"
        :can-remove="calc.canRemove.value"
        @update:odds="setOdds(e.id, $event)"
        @update:status="setStatus(e.id, $event)"
        @remove="onRemove(e.id)"
      />
    </ol>

    <div class="actions">
      <button type="button" class="actions__btn" :disabled="!calc.canAdd.value" @click="onAdd">
        Добавить событие
      </button>
      <span v-if="!calc.canAdd.value" class="actions__limit"
        >Максимум {{ MAX_EVENTS }} событий</span
      >
      <button type="button" class="actions__btn actions__btn--ghost" @click="onClear">
        Очистить всё
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.express-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
  min-width: 0;
}

.express-events {
  margin: 0;
  padding: 0;
  list-style: none;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-8) var(--spacing-16);
}

.actions__btn {
  min-height: 48px;
  padding: 0 var(--spacing-24);
  border: 1px solid var(--color-chalk);
  border-radius: var(--radius-buttons);
  background: var(--color-chalk);
  color: var(--color-obsidian-canvas);
  font: inherit;
  cursor: pointer;

  &:disabled {
    border-color: var(--color-ash-stroke);
    background: var(--color-carbon-lift);
    color: var(--color-warm-granite);
    cursor: not-allowed;
  }

  &--ghost {
    border-color: var(--color-ash-stroke);
    background: transparent;
    color: var(--color-bone);
  }
}

.actions__limit {
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}
</style>

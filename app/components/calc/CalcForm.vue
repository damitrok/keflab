<script setup lang="ts">
import type { EventStatus, StakeMode } from '~/lib/calc'
import type { SystemCalc } from '~/composables/useSystemCalc'
import { MAX_EVENTS } from '~/lib/calc'
import EventRow from './form/EventRow.vue'
import StakeField from './form/StakeField.vue'
import SystemSelect from './form/SystemSelect.vue'

const props = defineProps<{ calc: SystemCalc }>()

const stakeField = ref<InstanceType<typeof StakeField> | null>(null)

const STAKE_MODES: { value: StakeMode; label: string }[] = [
  { value: 'total', label: 'На всю систему' },
  { value: 'per_combination', label: 'На одну комбинацию' },
]

// Ссылки на состояние берём один раз: калькулятор создаёт родитель, его refs не меняются.
const { stakeInput, stakeMode } = props.calc
const systemK = computed({
  get: () => props.calc.k.value,
  set: (v) => props.calc.setK(v),
})

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

/** Смена ключа пересоздаёт строки: у них сбрасывается «тронуто» (id после очистки начинаются с 1). */
const rowsKey = ref(0)

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
  <form class="calc-form" novalidate @submit.prevent>
    <StakeField ref="stakeField" v-model="stakeInput" :error="calc.stakeError.value" />

    <fieldset class="modes">
      <legend>Ставка</legend>
      <label v-for="m in STAKE_MODES" :key="m.value" class="modes__item">
        <input v-model="stakeMode" type="radio" name="stake-mode" :value="m.value" />
        <span>{{ m.label }}</span>
      </label>
    </fieldset>

    <SystemSelect v-model="systemK" :n="calc.n.value" :options="calc.kOptions.value" />

    <p
      role="status"
      data-testid="calc-notice"
      class="calc-form__notice"
      :class="{ 'calc-form__notice--empty': !calc.notice.value }"
    >
      {{ calc.notice.value }}
    </p>

    <ol :key="rowsKey" class="calc-events">
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
.calc-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
  min-width: 0;
}

.modes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    padding: 0;
    margin-bottom: 4px;
    font-size: var(--text-body-sm);
    color: var(--color-pale-stone);
  }
}

.modes__item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  cursor: pointer;

  input {
    width: 22px;
    height: 22px;
    margin: 0;
    accent-color: var(--color-chalk);
  }
}

.calc-form__notice {
  margin: 0;
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);

  &--empty {
    display: none;
  }
}

.calc-events {
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

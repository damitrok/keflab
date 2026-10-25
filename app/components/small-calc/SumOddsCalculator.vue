<script setup lang="ts">
import { MAX_EVENTS, parseOdds, sumOdds, type Decimal } from '~/lib/calc'
import { formatOdds } from '~/lib/format'
import { SUM_ERROR_TEXTS, oddsFieldError } from '~/lib/small-calc-texts'
import SmallActionButton from './SmallActionButton.vue'
import SmallField from './SmallField.vue'
import SmallResult from './SmallResult.vue'

const MIN_FIELDS = 2

interface Row {
  id: number
  value: string
}

let nextId = 1
const blank = (): Row => ({ id: nextId++, value: '' })
const rows = ref<Row[]>(Array.from({ length: MIN_FIELDS }, blank))

const canAdd = computed(() => rows.value.length < MAX_EVENTS)
const canRemove = computed(() => rows.value.length > MIN_FIELDS)

const parsed = computed(() => rows.value.map((r) => parseOdds(r.value)))
const errors = computed(() =>
  parsed.value.map((r, i) => oddsFieldError(rows.value[i]?.value ?? '', r)),
)

const result = computed(() => {
  const values: Decimal[] = []
  for (const r of parsed.value) {
    if (!r.ok) return null
    values.push(r.value)
  }
  const r = sumOdds(values)
  return r.ok ? r : null
})
const exactDiffers = computed(() => {
  const r = result.value
  return r ? !r.total.eq(r.totalRounded) : false
})

async function focusRow(id: number | undefined) {
  if (id === undefined) return
  await nextTick()
  document.getElementById(`sum-odds-${id}`)?.focus()
}

function addRow() {
  if (!canAdd.value) return
  const row = blank()
  rows.value = [...rows.value, row]
  void focusRow(row.id)
}

function removeRow(id: number) {
  const list = rows.value
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1 || !canRemove.value) return
  const neighbour = list[idx + 1] ?? list[idx - 1]
  rows.value = list.filter((r) => r.id !== id)
  void focusRow(neighbour?.id)
}

function setValue(id: number, value: string) {
  const row = rows.value.find((r) => r.id === id)
  if (row) row.value = value
}

function clearAll() {
  nextId = 1
  rows.value = Array.from({ length: MIN_FIELDS }, blank)
  void focusRow(rows.value[0]?.id)
}
</script>

<template>
  <div class="small-calc">
    <form class="small-calc__form" novalidate @submit.prevent>
      <SmallField
        v-for="(row, i) in rows"
        :id="`sum-odds-${row.id}`"
        :key="row.id"
        :model-value="row.value"
        :label="`Коэффициент ${i + 1}`"
        placeholder="Например, 1,85"
        :error="errors[i]"
        :removable="canRemove"
        :remove-label="`Удалить коэффициент ${i + 1}`"
        @update:model-value="setValue(row.id, $event)"
        @remove="removeRow(row.id)"
      />

      <div class="small-calc__actions">
        <SmallActionButton :disabled="!canAdd" @click="addRow"
          >Добавить коэффициент</SmallActionButton
        >
        <SmallActionButton @click="clearAll">Очистить всё</SmallActionButton>
        <span v-if="!canAdd" class="small-calc__limit">{{ SUM_ERROR_TEXTS.too_many_events }}</span>
      </div>
    </form>

    <SmallResult id="sum-odds">
      <template #live>
        <p v-if="!result" class="result__line">Введите все коэффициенты, чтобы увидеть итог.</p>
        <template v-else>
          <p class="result__main">
            Общий коэффициент
            <span data-testid="total-odds" class="result__value">{{
              formatOdds(result.totalRounded)
            }}</span>
          </p>
          <p v-if="exactDiffers" class="result__line">
            Точное значение:
            <span data-testid="total-odds-exact" class="result__value">{{
              formatOdds(result.total)
            }}</span>
          </p>
          <p class="result__line">
            Это произведение коэффициентов, как в экспрессе. Итог округлён до двух знаков.
          </p>
        </template>
      </template>
    </SmallResult>
  </div>
</template>

<style scoped lang="scss">
.small-calc {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.small-calc__form {
  display: grid;
  gap: var(--spacing-16);
  min-width: 0;
}

.small-calc__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-8) var(--spacing-16);
}

.small-calc__limit {
  font-size: var(--text-body-sm);
  color: var(--color-pale-stone);
}
</style>

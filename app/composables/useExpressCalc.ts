import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  D,
  EVENT_STATUSES,
  MAX_EVENTS,
  calcExpress,
  effectiveOdds,
  parseOdds,
  parseStake,
  toMoney,
  type BetEvent,
  type BetResult,
  type Decimal,
  type EventStatus,
  type InputErrorCode,
} from '~/lib/calc'
import { expressIfOneVoided, type WhatIfResult } from '~/lib/calc/what-if'
import { reportError } from '~/lib/report-error'

export const MIN_EXPRESS_EVENTS = 2
const DEBOUNCE_FROM_EVENTS = 12
const DEBOUNCE_MS = 150

const STORAGE_KEY = 'keflab:express:v1'

export interface ExpressEventInput {
  id: number
  odds: string
  status: EventStatus
}

interface ExpressSnapshot {
  stakeInput: string
  events: { odds: string; status: EventStatus }[]
}

export interface ExpressTotals {
  /** Произведение исходных коэффициентов. */
  original: Decimal
  /** Произведение эффективных коэффициентов; null — есть события «ждём». */
  effective: Decimal | null
  /** Произведение, если «ждём» зайдёт, а остальные события — со своими статусами. */
  ifPendingWin: Decimal
  /** Возврат при том же допущении, до копеек. */
  payoutIfPendingWin: Decimal
}

function readStorage(): ExpressSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<ExpressSnapshot>
    const events = Array.isArray(data.events) ? data.events : []
    const ok =
      typeof data.stakeInput === 'string' &&
      data.stakeInput.length <= 64 &&
      events.length >= MIN_EXPRESS_EVENTS &&
      events.length <= MAX_EVENTS &&
      events.every(
        (e) =>
          e &&
          typeof e.odds === 'string' &&
          e.odds.length <= 64 &&
          (EVENT_STATUSES as readonly string[]).includes(e.status),
      )
    return ok ? (data as ExpressSnapshot) : null
  } catch {
    return null
  }
}

function writeStorage(value: ExpressSnapshot): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Хранилище недоступно — калькулятор работает без сохранения.
  }
}

/** Состояние калькулятора экспресса. Вся математика — в ~/lib/calc. */
export function useExpressCalc() {
  let nextId = 1
  const blankEvent = (): ExpressEventInput => ({ id: nextId++, odds: '', status: 'pending' })

  const stakeInput = ref('')
  const events = ref<ExpressEventInput[]>(Array.from({ length: MIN_EXPRESS_EVENTS }, blankEvent))

  const n = computed(() => events.value.length)
  const canAdd = computed(() => n.value < MAX_EVENTS)
  const canRemove = computed(() => n.value > MIN_EXPRESS_EVENTS)

  const stakeParsed = computed(() => parseStake(stakeInput.value))
  const oddsParsed = computed(() => events.value.map((e) => parseOdds(e.odds)))
  const stakeError = computed<InputErrorCode | null>(() =>
    stakeParsed.value.ok ? null : stakeParsed.value.error,
  )
  const eventErrors = computed<(InputErrorCode | null)[]>(() =>
    oddsParsed.value.map((r) => (r.ok ? null : r.error)),
  )

  // Расчёт идёт по «снимку»: от 12 событий он обновляется с паузой.
  function takeSnapshot(): ExpressSnapshot {
    return {
      stakeInput: stakeInput.value,
      events: events.value.map(({ odds, status }) => ({ odds, status })),
    }
  }
  const snapshot = shallowRef<ExpressSnapshot>(takeSnapshot())

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    [stakeInput, events],
    () => {
      clearTimeout(timer)
      if (n.value >= DEBOUNCE_FROM_EVENTS) {
        timer = setTimeout(() => (snapshot.value = takeSnapshot()), DEBOUNCE_MS)
      } else {
        snapshot.value = takeSnapshot()
      }
    },
    { deep: true },
  )

  const calcFailed = ref(false)

  const computedState = computed<{
    result: BetResult | null
    totals: ExpressTotals | null
    whatIf: WhatIfResult | null
    failed: boolean
  }>(() => {
    const s = snapshot.value
    const stake = parseStake(s.stakeInput)
    const odds = s.events.map((e) => parseOdds(e.odds))
    if (!stake.ok || odds.some((o) => !o.ok)) {
      return { result: null, totals: null, whatIf: null, failed: false }
    }
    const betEvents: BetEvent[] = s.events.map((e, i) => {
      const o = odds[i]!
      return { odds: o.ok ? o.value : stake.value, status: e.status }
    })
    try {
      let original = D('1')
      let effective: Decimal | null = D('1')
      let ifPendingWin = D('1')
      for (const e of betEvents) {
        original = original.times(e.odds)
        const v = effectiveOdds(e.odds, e.status)
        effective = effective === null || v === null ? null : effective.times(v)
        ifPendingWin = ifPendingWin.times(v ?? e.odds)
      }
      return {
        result: calcExpress(betEvents, stake.value),
        totals: {
          original,
          effective,
          ifPendingWin,
          payoutIfPendingWin: toMoney(stake.value.times(ifPendingWin)),
        },
        whatIf: expressIfOneVoided(betEvents, stake.value),
        failed: false,
      }
    } catch (error) {
      // В мониторинг уходит только сама ошибка, без введённых данных.
      reportError(error, { where: 'useExpressCalc' })
      return { result: null, totals: null, whatIf: null, failed: true }
    }
  })

  watch(
    () => computedState.value.failed,
    (v) => (calcFailed.value = v),
    { immediate: true },
  )

  const result = computed(() => computedState.value.result)
  const totals = computed(() => computedState.value.totals)
  const whatIf = computed(() => computedState.value.whatIf)
  const pendingCount = computed(() => events.value.filter((e) => e.status === 'pending').length)

  function addEvent(): ExpressEventInput | null {
    if (!canAdd.value) return null
    const e = blankEvent()
    events.value = [...events.value, e]
    return e
  }

  function removeEvent(id: number): void {
    if (!canRemove.value) return
    events.value = events.value.filter((e) => e.id !== id)
  }

  function clearAll(): void {
    nextId = 1
    stakeInput.value = ''
    events.value = Array.from({ length: MIN_EXPRESS_EVENTS }, blankEvent)
  }

  function restore(s: ExpressSnapshot): void {
    nextId = 1
    stakeInput.value = s.stakeInput
    events.value = s.events.map((e) => ({ id: nextId++, odds: e.odds, status: e.status }))
    snapshot.value = takeSnapshot()
  }

  onMounted(() => {
    const saved = readStorage()
    if (saved) restore(saved)
    watch(snapshot, (s) => writeStorage(s))
  })

  onBeforeUnmount(() => clearTimeout(timer))

  return {
    stakeInput,
    events,
    n,
    canAdd,
    canRemove,
    stakeError,
    eventErrors,
    result,
    totals,
    whatIf,
    calcFailed,
    pendingCount,
    addEvent,
    removeEvent,
    clearAll,
    restore,
  }
}

export type ExpressCalc = ReturnType<typeof useExpressCalc>

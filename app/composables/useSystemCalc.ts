import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  EVENT_STATUSES,
  MAX_EVENTS,
  betShape,
  binomial,
  calcSystem,
  parseOdds,
  parseStake,
  scenarios,
  type BetEvent,
  type EventStatus,
  type InputErrorCode,
  type Scenarios,
  type StakeMode,
  type SystemResult,
} from '~/lib/calc'
import { reportError } from '~/lib/report-error'
import type { Snapshot } from '~/lib/snapshot'

export type { Snapshot }

export const MIN_EVENTS = 3

/** Событие в форме: сырой ввод коэффициента и статус. */
export interface EventInput {
  id: number
  odds: string
  status: EventStatus
}

export interface CompareScenarios {
  express: Scenarios
  system: Scenarios
  singles: Scenarios
}

export interface SystemCalcOptions {
  /** Число событий в начальном состоянии (по умолчанию 3). */
  n?: number
  /** K в начальном состоянии (по умолчанию 2). */
  k?: number
  /** Ключ localStorage; null — не сохранять. */
  storageKey?: string | null
  /**
   * Начальное состояние (например, из ссылки). Применяется сразу, в том числе
   * на сервере, и отменяет восстановление из localStorage.
   */
  initial?: Snapshot | null
}

/** С этого числа событий пересчёт идёт с паузой после ввода, чтобы не подвешивать телефон. */
export const DEBOUNCE_FROM_EVENTS = 12
export const DEBOUNCE_MS = 150

const DEFAULT_STORAGE_KEY = 'keflab:system:v1'

function readStorage(key: string): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Snapshot>
    const events = Array.isArray(data.events) ? data.events : []
    const ok =
      typeof data.stakeInput === 'string' &&
      data.stakeInput.length <= 64 &&
      (data.stakeMode === 'total' || data.stakeMode === 'per_combination') &&
      Number.isInteger(data.k) &&
      events.length >= MIN_EVENTS &&
      events.length <= MAX_EVENTS &&
      events.every(
        (e) =>
          e &&
          typeof e.odds === 'string' &&
          e.odds.length <= 64 &&
          (EVENT_STATUSES as readonly string[]).includes(e.status),
      ) &&
      (data.k as number) >= 2 &&
      (data.k as number) < events.length
    return ok ? (data as Snapshot) : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: Snapshot): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Хранилище недоступно (приватный режим, квота) — калькулятор работает без сохранения.
  }
}

/**
 * Состояние калькулятора системы: ввод, ошибки у полей, допустимые K,
 * итог, сценарии и сравнение. Вся математика — в ~/lib/calc.
 */
export function useSystemCalc(options: SystemCalcOptions = {}) {
  const initialN = Math.min(Math.max(options.n ?? MIN_EVENTS, MIN_EVENTS), MAX_EVENTS)
  const initialK = Math.min(Math.max(options.k ?? 2, 2), initialN - 1)
  const storageKey = options.storageKey === undefined ? DEFAULT_STORAGE_KEY : options.storageKey

  let nextId = 1
  const blankEvent = (): EventInput => ({ id: nextId++, odds: '', status: 'pending' })

  const stakeInput = ref('')
  const stakeMode = ref<StakeMode>('total')
  const k = ref(initialK)
  const events = ref<EventInput[]>(Array.from({ length: initialN }, blankEvent))
  if (options.initial) {
    stakeInput.value = options.initial.stakeInput
    stakeMode.value = options.initial.stakeMode
    events.value = options.initial.events.map((e) => ({ id: nextId++, ...e }))
    k.value = options.initial.k
  }
  /** Сообщение для пользователя после автоматических изменений (например, смены K). */
  const notice = ref<string | null>(null)

  const n = computed(() => events.value.length)
  const canAdd = computed(() => n.value < MAX_EVENTS)
  const canRemove = computed(() => n.value > MIN_EVENTS)
  /** Допустимые K для текущего N: 2 ≤ K < N. */
  const kOptions = computed(() =>
    Array.from({ length: n.value - 2 }, (_, i) => ({
      k: i + 2,
      combinations: binomial(n.value, i + 2),
    })),
  )

  // Ошибки у полей — сразу, без паузы.
  const stakeParsed = computed(() => parseStake(stakeInput.value))
  const oddsParsed = computed(() => events.value.map((e) => parseOdds(e.odds)))
  const stakeError = computed<InputErrorCode | null>(() =>
    stakeParsed.value.ok ? null : stakeParsed.value.error,
  )
  const eventErrors = computed<(InputErrorCode | null)[]>(() =>
    oddsParsed.value.map((r) => (r.ok ? null : r.error)),
  )

  // Расчёт — по «снимку» ввода: для 12+ событий снимок обновляется с паузой.
  const snapshot = shallowRef<Snapshot>(takeSnapshot())
  function takeSnapshot(): Snapshot {
    return {
      stakeInput: stakeInput.value,
      stakeMode: stakeMode.value,
      k: k.value,
      events: events.value.map(({ odds, status }) => ({ odds, status })),
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    [stakeInput, stakeMode, k, events],
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

  /** Расчёт упал с исключением: показываем «Не получилось посчитать». */
  const calcFailed = ref(false)

  const computedState = computed(() => {
    const s = snapshot.value
    const stake = parseStake(s.stakeInput)
    const odds = s.events.map((e) => parseOdds(e.odds))
    if (!stake.ok || odds.some((o) => !o.ok)) return null
    const betEvents: BetEvent[] = s.events.map((e, i) => {
      const o = odds[i]!
      return { odds: o.ok ? o.value : stake.value, status: e.status }
    })
    try {
      const result: SystemResult = calcSystem(betEvents, s.k, stake.value, s.stakeMode)
      if (!result.ok) return { result, scenarios: null, compare: null, failed: false }
      const total = result.shape.totalStake
      const compareShape = (type: 'express' | 'singles') => {
        const r = betShape(type, betEvents.length, total)
        if (!r.ok) throw new Error(`compare: ${r.error}`)
        return scenarios(r.shape, betEvents)
      }
      const system = scenarios(result.shape, betEvents)
      return {
        result,
        scenarios: system,
        compare: {
          express: compareShape('express'),
          system,
          singles: compareShape('singles'),
        } satisfies CompareScenarios,
        failed: false,
      }
    } catch (error) {
      // В мониторинг уходит только сама ошибка, без введённых данных.
      reportError(error, { where: 'useSystemCalc' })
      return { result: null, scenarios: null, compare: null, failed: true }
    }
  })

  watch(
    () => computedState.value?.failed ?? false,
    (v) => (calcFailed.value = v),
    { immediate: true },
  )

  const result = computed(() => computedState.value?.result ?? null)
  const scenarioTable = computed(() => computedState.value?.scenarios ?? null)
  const compare = computed(() => computedState.value?.compare ?? null)
  /** Сколько событий со статусом «ждём». */
  const pendingCount = computed(() => events.value.filter((e) => e.status === 'pending').length)

  function addEvent(): EventInput | null {
    if (!canAdd.value) return null
    const e = blankEvent()
    events.value = [...events.value, e]
    notice.value = null
    return e
  }

  function removeEvent(id: number): void {
    if (!canRemove.value) return
    const before = { k: k.value, n: n.value }
    events.value = events.value.filter((e) => e.id !== id)
    if (k.value >= n.value) {
      k.value = n.value - 1
      notice.value = `Система ${before.k} из ${before.n} стала ${k.value} из ${n.value}: в системе K должно быть меньше числа событий.`
    } else {
      notice.value = null
    }
  }

  function setK(value: number): void {
    if (Number.isInteger(value) && value >= 2 && value < n.value) k.value = value
  }

  function clearAll(): void {
    nextId = 1
    stakeInput.value = ''
    stakeMode.value = 'total'
    events.value = Array.from({ length: initialN }, blankEvent)
    k.value = initialK
    notice.value = null
  }

  function restore(s: Snapshot): void {
    nextId = 1
    stakeInput.value = s.stakeInput
    stakeMode.value = s.stakeMode
    events.value = s.events.map((e) => ({ id: nextId++, odds: e.odds, status: e.status }))
    k.value = s.k
    snapshot.value = takeSnapshot()
  }

  if (storageKey) {
    onMounted(() => {
      const saved = readStorage(storageKey)
      // Сохранённое состояние подставляем, только если оно подходит к странице
      // (на /sistema-3-iz-5/ не открываем чужую систему 2 из 3).
      if (
        !options.initial &&
        saved &&
        (options.n === undefined || saved.events.length === initialN)
      ) {
        restore(saved)
      }
      watch(snapshot, (s) => writeStorage(storageKey, s))
    })
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return {
    stakeInput,
    stakeMode,
    k,
    events,
    notice,
    n,
    canAdd,
    canRemove,
    kOptions,
    stakeError,
    eventErrors,
    result,
    scenarios: scenarioTable,
    compare,
    calcFailed,
    pendingCount,
    addEvent,
    removeEvent,
    setK,
    clearAll,
    restore,
    /** Текущий «снимок» ввода (после паузы для 12+ событий). */
    snapshot,
  }
}

export type SystemCalc = ReturnType<typeof useSystemCalc>

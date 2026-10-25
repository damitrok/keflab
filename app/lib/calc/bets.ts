import { binomial, combinations, elementarySymmetric, int } from './combinatorics'
import { ONE, ZERO, toMoney, type Decimal } from './decimal'
import { effectiveOdds } from './effective'
import { MAX_EVENTS, MAX_STAKE, type BetEvent, type CalcErrorCode } from './types'

/** Как задана ставка системы: на всю систему или на одну комбинацию. */
export type StakeMode = 'total' | 'per_combination'

export type BetType = 'express' | 'system' | 'singles'

/**
 * Описание ставки в общем виде. Экспресс, система и одиночные — это одна
 * формула: выплата = ставка на комбинацию × e_k(эффективные коэффициенты).
 * Экспресс: k = N, одна комбинация. Одиночные: k = 1, N комбинаций.
 */
export interface BetShape {
  type: BetType
  /** Как задана ставка. Для экспресса и одиночных всегда 'total'. */
  mode: StakeMode
  /** Размер комбинации. */
  k: number
  /** Число комбинаций C(N, k). */
  combinations: number
  /** Общая ставка (точно). */
  totalStake: Decimal
  /** Ставка на одну комбинацию — точное значение, без округления. */
  stakePerCombination: Decimal
  /**
   * Ставка не делится на комбинации ровно до копейки: у букмекера возможна
   * разница в копейках.
   */
  unevenSplit: boolean
}

export interface CombinationRow {
  /** Номер комбинации, с 1. */
  index: number
  /** Индексы событий (с 0). */
  events: number[]
  /** Произведение исходных коэффициентов. */
  odds: Decimal
  /** Произведение эффективных коэффициентов; null — есть несыгравшее событие. */
  effectiveOdds: Decimal | null
  /** Ставка на комбинацию (точно, без округления). */
  stake: Decimal
  /** Выплата по комбинации до копеек; null — есть несыгравшее событие. */
  payout: Decimal | null
}

export type Settlement =
  | {
      /** Все события рассчитаны. */
      settled: true
      /** Возврат до копеек, «половина вверх». */
      payout: Decimal
      /** Прибыль = возврат − ставка, до копеек. */
      profit: Decimal
    }
  | {
      /** Есть события со статусом pending: итог ещё не рассчитан. */
      settled: false
      pendingCount: number
    }

export type BetResult =
  { ok: true; shape: BetShape; settlement: Settlement } | { ok: false; error: CalcErrorCode }

export type SystemResult =
  | {
      ok: true
      shape: BetShape
      settlement: Settlement
      rows: CombinationRow[]
      /**
       * Сумма округлённых выплат по строкам не равна итогу. Итог — главное
       * число (он считается точно и округляется один раз), строки — справочные.
       */
      rowsDifferFromTotal: boolean
    }
  | { ok: false; error: CalcErrorCode }

export type ShapeResult = { ok: true; shape: BetShape } | { ok: false; error: CalcErrorCode }

function shape(
  type: BetType,
  n: number,
  k: number,
  stake: Decimal,
  mode: StakeMode = 'total',
): BetShape {
  const count = binomial(n, k)
  const c = int(count)
  if (mode === 'per_combination') {
    return {
      type,
      mode,
      k,
      combinations: count,
      totalStake: stake.times(c),
      stakePerCombination: stake,
      unevenSplit: false,
    }
  }
  return {
    type,
    mode,
    k,
    combinations: count,
    totalStake: stake,
    stakePerCombination: stake.div(c),
    unevenSplit: !stake.times('100').mod(c).eq(ZERO),
  }
}

function checkCommon(n: number, stake: Decimal, minEvents: number): CalcErrorCode | null {
  if (!stake.gt(ZERO)) return 'invalid_stake'
  if (n < minEvents) return 'too_few_events'
  if (n > MAX_EVENTS) return 'too_many_events'
  return null
}

/** Параметры ставки без учёта статусов: экспресс, система K из N или одиночные. */
export function betShape(
  type: BetType,
  n: number,
  stake: Decimal,
  options: { k?: number; mode?: StakeMode } = {},
): ShapeResult {
  if (type === 'express') {
    const error = checkCommon(n, stake, 2)
    return error ? { ok: false, error } : { ok: true, shape: shape('express', n, n, stake) }
  }
  if (type === 'singles') {
    const error = checkCommon(n, stake, 1)
    return error ? { ok: false, error } : { ok: true, shape: shape('singles', n, 1, stake) }
  }
  const error = checkCommon(n, stake, 3)
  if (error) return { ok: false, error }
  const k = options.k ?? 0
  if (!Number.isInteger(k) || k < 2 || k >= n) return { ok: false, error: 'invalid_system_size' }
  const s = shape('system', n, k, stake, options.mode)
  // Лимит 10 000 000 ₽ считаем от общей ставки (см. AGENTS.md → «Решения»).
  if (s.totalStake.gt(MAX_STAKE)) return { ok: false, error: 'total_stake_too_large' }
  return { ok: true, shape: s }
}

/**
 * Выплата по набору эффективных коэффициентов (точно, без округления).
 * Для режима «на всю систему» сначала умножаем, потом делим на число
 * комбинаций — так 100 ₽ на систему 2 из 3 дают ровно 450,00, а не 449,96.
 */
export function exactPayout(s: BetShape, values: readonly Decimal[]): Decimal {
  const sum = elementarySymmetric(values, s.k)
  if (s.mode === 'per_combination') return s.stakePerCombination.times(sum)
  return s.totalStake.times(sum).div(int(s.combinations))
}

function settle(s: BetShape, events: readonly BetEvent[]): Settlement {
  const values: Decimal[] = []
  let pendingCount = 0
  for (const e of events) {
    const v = effectiveOdds(e.odds, e.status)
    if (v === null) pendingCount++
    else values.push(v)
  }
  if (pendingCount > 0) return { settled: false, pendingCount }
  const payout = toMoney(exactPayout(s, values))
  return { settled: true, payout, profit: toMoney(payout.minus(s.totalStake)) }
}

/** Экспресс: ставка × произведение эффективных коэффициентов. */
export function calcExpress(events: readonly BetEvent[], stake: Decimal): BetResult {
  const r = betShape('express', events.length, stake)
  return r.ok ? { ok: true, shape: r.shape, settlement: settle(r.shape, events) } : r
}

/** Одиночные: ставка делится поровну на N событий. */
export function calcSingles(events: readonly BetEvent[], stake: Decimal): BetResult {
  const r = betShape('singles', events.length, stake)
  return r.ok ? { ok: true, shape: r.shape, settlement: settle(r.shape, events) } : r
}

/** Система K из N: итог и разбивка по каждой комбинации. */
export function calcSystem(
  events: readonly BetEvent[],
  k: number,
  stake: Decimal,
  mode: StakeMode = 'total',
): SystemResult {
  const r = betShape('system', events.length, stake, { k, mode })
  if (!r.ok) return r
  const s = r.shape
  const effective = events.map((e) => effectiveOdds(e.odds, e.status))
  const rows = combinations(events.length, k).map((idx, i): CombinationRow => {
    let odds = ONE
    let eff: Decimal | null = ONE
    for (const j of idx) {
      odds = odds.times(events[j]!.odds)
      const v = effective[j]!
      eff = eff === null || v === null ? null : eff.times(v)
    }
    return {
      index: i + 1,
      events: idx,
      odds,
      effectiveOdds: eff,
      stake: s.stakePerCombination,
      payout: eff === null ? null : toMoney(s.stakePerCombination.times(eff)),
    }
  })
  const settlement = settle(s, events)
  const rowsDifferFromTotal =
    settlement.settled &&
    !rows.reduce((sum, row) => sum.plus(row.payout!), ZERO).eq(settlement.payout)
  return { ok: true, shape: s, settlement, rows, rowsDifferFromTotal }
}

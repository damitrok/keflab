import { exactPayout, type BetShape } from './bets'
import { binomial } from './combinatorics'
import { ZERO, toMoney, type Decimal } from './decimal'
import { effectiveOdds } from './effective'
import type { BetEvent } from './types'

export interface ScenarioRow {
  /** Сколько из несыгравших событий зашло. */
  wins: number
  /** Минимальный возврат до копеек. */
  min: Decimal
  /** Максимальный возврат до копеек. */
  max: Decimal
}

export interface Scenarios {
  /** Сколько событий перебирается (статус pending). */
  pendingCount: number
  rows: ScenarioRow[]
  /** Наименьшее m, при котором минимальный возврат ≥ ставки; null — такого нет. */
  breakEvenMin: number | null
  /** Наименьшее m, при котором максимальный возврат ≥ ставки; null — такого нет. */
  breakEvenMax: number | null
}

/**
 * Сценарии «если зайдут m из несыгравших»: для каждого m — минимальный и
 * максимальный возврат, когда ровно m событий со статусом pending выиграли, а
 * остальные pending проиграли. Рассчитанные события берутся со своими
 * статусами. Перебираются только «зашло / не зашло», возвраты и половины — нет.
 *
 * Возврат = ставка на комбинацию × e_k(эффективные коэффициенты), а e_k с
 * неотрицательными аргументами не убывает по каждому аргументу. Поэтому из
 * всех подмножеств m зашедших минимум даёт m наименьших коэффициентов, а
 * максимум — m наибольших: перебор 2^N подмножеств не нужен.
 */
export function scenarios(s: BetShape, events: readonly BetEvent[]): Scenarios {
  // Параметры ставки должны быть посчитаны для этого же списка событий,
  // иначе сценарии тихо получились бы с чужими K и C(N, K).
  if (binomial(events.length, s.k) !== s.combinations) {
    throw new Error('scenarios: параметры ставки не соответствуют числу событий')
  }
  const fixed: Decimal[] = []
  const pending: Decimal[] = []
  for (const e of events) {
    const v = effectiveOdds(e.odds, e.status)
    if (v === null) pending.push(e.odds)
    else fixed.push(v)
  }
  pending.sort((a, b) => a.cmp(b))

  const p = pending.length
  const rows: ScenarioRow[] = []
  for (let m = 0; m <= p; m++) {
    const lost = Array.from({ length: p - m }, () => ZERO)
    const lowest = [...fixed, ...pending.slice(0, m), ...lost]
    const highest = [...fixed, ...pending.slice(p - m), ...lost]
    rows.push({
      wins: m,
      min: toMoney(exactPayout(s, lowest)),
      max: toMoney(exactPayout(s, highest)),
    })
  }

  const first = (pick: (r: ScenarioRow) => Decimal): number | null =>
    rows.find((r) => pick(r).gte(s.totalStake))?.wins ?? null

  return {
    pendingCount: p,
    rows,
    breakEvenMin: first((r) => r.min),
    breakEvenMax: first((r) => r.max),
  }
}

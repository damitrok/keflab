import { D, betShape, binomial, scenarios, type BetEvent, type Decimal } from './calc'

/** Ставка для расчёта таблицы: результат от неё не зависит, берём круглую сумму. */
const TABLE_STAKE = '1000'

/** Коэффициенты, при которых считается окупаемость (одинаковые у всех событий). */
export const TABLE_ODDS = { high: '2.00', low: '1.80' } as const

export interface SystemTypeRow {
  n: number
  k: number
  /** Число комбинаций C(n, k). */
  combinations: number
  /** Наименьшее число зашедших событий, при котором выплата больше нуля. */
  minWinsForPayout: number | null
  /** Наименьшее число зашедших событий, при котором возврат не меньше ставки (коэф. 2,00). */
  breakEvenAt200: number | null
  /** То же при коэффициентах 1,80. */
  breakEvenAt180: number | null
}

function pendingEvents(n: number, odds: string): BetEvent[] {
  return Array.from({ length: n }, () => ({ odds: D(odds), status: 'pending' as const }))
}

/**
 * Типы систем K из N (2 ≤ K < N) для N от minN до maxN. Все числа берутся из
 * движка: binomial, betShape и scenarios; руками здесь ничего не набирается.
 * Коэффициенты у всех событий одинаковые, поэтому min и max сценария совпадают.
 */
export function systemTypesTable(minN = 3, maxN = 8): SystemTypeRow[] {
  const rows: SystemTypeRow[] = []
  for (let n = minN; n <= maxN; n++) {
    for (let k = 2; k < n; k++) {
      const r = betShape('system', n, D(TABLE_STAKE), { k })
      if (!r.ok) continue
      const high = scenarios(r.shape, pendingEvents(n, TABLE_ODDS.high))
      const low = scenarios(r.shape, pendingEvents(n, TABLE_ODDS.low))
      const zero: Decimal = D('0')
      rows.push({
        n,
        k,
        combinations: binomial(n, k),
        minWinsForPayout: high.rows.find((row) => row.min.gt(zero))?.wins ?? null,
        breakEvenAt200: high.breakEvenMin,
        breakEvenAt180: low.breakEvenMin,
      })
    }
  }
  return rows
}

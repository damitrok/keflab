import { betShape } from './bets'
import { ONE, toMoney, type Decimal } from './decimal'
import { effectiveOdds } from './effective'
import type { BetEvent, CalcErrorCode } from './types'

/** Строка таблицы «что будет, если событие i вернут». */
export interface WhatIfRow {
  /** Номер события, с 1. */
  index: number
  /** Исходный коэффициент события. */
  odds: Decimal
  /** Возврат экспресса до копеек, если это событие получило статус «возврат». */
  payout: Decimal
  /** Прибыль = возврат − ставка, до копеек. */
  profit: Decimal
}

export type WhatIfResult =
  | {
      ok: true
      rows: WhatIfRow[]
      /** Есть события «ждём»: в расчёте они считаются «зашедшими». */
      assumesPendingWin: boolean
    }
  | { ok: false; error: CalcErrorCode }

/**
 * Экспресс: что вернётся, если одно событие вернут (коэффициент 1), а остальные
 * сохранят свои статусы. Событие «ждём» считается выигранным — это допущение.
 */
export function expressIfOneVoided(events: readonly BetEvent[], stake: Decimal): WhatIfResult {
  const r = betShape('express', events.length, stake)
  if (!r.ok) return r

  const values = events.map((e) => effectiveOdds(e.odds, e.status) ?? e.odds)
  const rows = events.map((e, i): WhatIfRow => {
    let product = ONE
    values.forEach((v, j) => {
      if (j !== i) product = product.times(v)
    })
    const payout = toMoney(stake.times(product))
    return { index: i + 1, odds: e.odds, payout, profit: toMoney(payout.minus(stake)) }
  })
  return { ok: true, rows, assumesPendingWin: events.some((e) => e.status === 'pending') }
}

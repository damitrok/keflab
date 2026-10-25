import { betShape, exactPayout } from './bets'
import { ONE, toMoney, type Decimal } from './decimal'
import { effectiveOdds } from './effective'
import type { CalcErrorCode } from './types'

export type SumOddsResult =
  { ok: true; total: Decimal; totalRounded: Decimal } | { ok: false; error: CalcErrorCode }

/**
 * «Сложение» коэффициентов — общий коэффициент экспресса из 2–16 событий,
 * все со статусом «выигрыш». Идёт через тот же путь, что и calcExpress:
 * форма ставки (betShape) и exactPayout при ставке 1 ₽ — это точное
 * произведение. Округляется только итог.
 */
export function sumOdds(odds: readonly Decimal[]): SumOddsResult {
  const r = betShape('express', odds.length, ONE)
  if (!r.ok) return r
  const values = odds.map((o) => effectiveOdds(o, 'win')!)
  const total = exactPayout(r.shape, values)
  return { ok: true, total, totalRounded: toMoney(total) }
}

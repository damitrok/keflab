import { ONE, ZERO, toMoney, type Decimal } from './decimal'

/** Максимум шагов в таблице роста ставок. */
export const DOGON_MAX_STEPS = 20

/** Режим big.js «от нуля» (ROUND_UP): нужен, чтобы цель точно достигалась. */
const ROUND_UP = 3

export interface DogonRow {
  step: number
  stake: Decimal
  lostBefore: Decimal
  totalSpent: Decimal
  payoutIfWin: Decimal
  profitIfWin: Decimal
}

/**
 * Следующая ставка: (уже проиграно + цель прибыли) / (коэф. − 1), округление
 * ВВЕРХ до копейки — иначе при выигрыше цель не будет достигнута.
 * Коэффициент должен быть больше 1 (на входе — уже проверенные 1,01–1000).
 */
export function dogonNextStake(input: {
  lost: Decimal
  targetProfit: Decimal
  odds: Decimal
}): Decimal {
  return input.lost.plus(input.targetProfit).div(input.odds.minus(ONE)).round(2, ROUND_UP)
}

/**
 * Таблица роста ставок на шагах 1..steps. Это математическая иллюстрация
 * того, как быстро растут суммы, а не рекомендация.
 * Неверные параметры (steps не целое или вне 1..20, коэффициент ≤ 1) — пустой массив.
 */
export function dogonTable(input: {
  targetProfit: Decimal
  odds: Decimal
  steps: number
}): DogonRow[] {
  const { targetProfit, odds, steps } = input
  if (!Number.isInteger(steps) || steps < 1 || steps > DOGON_MAX_STEPS) return []
  if (!odds.gt(ONE)) return []
  const rows: DogonRow[] = []
  let lost: Decimal = ZERO
  for (let step = 1; step <= steps; step++) {
    const stake = dogonNextStake({ lost, targetProfit, odds })
    const totalSpent = lost.plus(stake)
    const payoutIfWin = toMoney(stake.times(odds))
    rows.push({
      step,
      stake,
      lostBefore: lost,
      totalSpent,
      payoutIfWin,
      profitIfWin: toMoney(payoutIfWin.minus(totalSpent)),
    })
    lost = totalSpent
  }
  return rows
}

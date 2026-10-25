import { D, type Decimal } from './calc'

const NBSP = ' '

/**
 * Вероятность проиграть `rounds` раз подряд, если каждая ставка проигрывает с
 * вероятностью `lossPercent` (строка, %): (p/100)^rounds, точно.
 */
export function losingStreakProbability(lossPercent: string, rounds: number): Decimal {
  return D(lossPercent).div('100').pow(rounds)
}

/** Доля → проценты строкой с запятой и неразрывным пробелом: 0.00390625, 2 → «0,39 %». */
export function formatShareAsPercent(share: Decimal, dp: number): string {
  return `${share.times('100').round(dp, 1).toFixed(dp).replace('.', ',')}${NBSP}%`
}

/** Проценты (уже в процентах) строкой: 5.26 → «5,26 %». */
export function formatPercent(value: Decimal, dp = 2): string {
  return `${value.round(dp, 1).toFixed(dp).replace('.', ',').replace('-', '−')}${NBSP}%`
}

/** Коэффициент с ровно двумя знаками: 2 → «2,00». */
export function formatOdds2(value: Decimal): string {
  return value.round(2, 1).toFixed(2).replace('.', ',')
}

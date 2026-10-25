import { ONE, type Decimal } from './decimal'

export interface MarginResult {
  /** Маржа как доля: Σ(1/коэф.) − 1 (точно, DP 40). */
  margin: Decimal
  /** Маржа в процентах до 2 знаков, «половина вверх»: 1,90/1,90 → 5.26. */
  marginPercent: Decimal
  /** Вероятности исходов без маржи (доли, сумма = 1), точно. */
  fairProbabilities: Decimal[]
  /** «Честные» коэффициенты без маржи = 1 / fairProbability, до 2 знаков. */
  fairOdds: Decimal[]
}

export type MarginCalc = { ok: true; value: MarginResult } | { ok: false; error: 'outcomes_count' }

/** Знаки, после которых считаем остаток шумом деления (DP 40), см. noiseFree. */
const NOISE_DP = 30

/**
 * Убирает шум последних знаков деления, чтобы точные значения вроде 2,995
 * не превращались в 2,99499…9 и округлялись предсказуемо.
 */
function noiseFree(value: Decimal): Decimal {
  return value.round(NOISE_DP, 1)
}

/**
 * Маржа букмекера по 2 или 3 исходам: Σ(1/коэф.) − 1.
 * «Честные» вероятности — пропорциональный метод (нормировка): вероятность
 * исхода 1/коэф. делится на сумму всех 1/коэф.; сумма вероятностей равна 1.
 * «Честный» коэффициент = 1 / вероятность = коэф. × (1 + маржа).
 */
export function bookMargin(odds: readonly Decimal[]): MarginCalc {
  if (odds.length < 2 || odds.length > 3) return { ok: false, error: 'outcomes_count' }
  const implied = odds.map((o) => ONE.div(o))
  const sum = implied.reduce((acc, p) => acc.plus(p))
  const margin = sum.minus(ONE)
  const fairProbabilities = implied.map((p) => p.div(sum))
  return {
    ok: true,
    value: {
      margin,
      marginPercent: noiseFree(margin.times('100')).round(2, 1),
      fairProbabilities,
      fairOdds: odds.map((o) => noiseFree(o.times(sum)).round(2, 1)),
    },
  }
}

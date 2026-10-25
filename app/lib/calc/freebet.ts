import { D, ONE, ZERO, toMoney, type Decimal } from './decimal'

/** Тип фрибета: возвращается только выигрыш или выигрыш вместе со ставкой. */
export type FreebetType = 'winnings_only' | 'with_stake'

export interface FreebetInput {
  /** Номинал фрибета, ₽. */
  amount: Decimal
  /** Коэффициент (на входе — уже проверенные 1,01–1000). */
  odds: Decimal
  type: FreebetType
  /** Маржа букмекера как доля: 5 % → 0.05. */
  margin: Decimal
}

export interface FreebetResult {
  /** Выплата при заходе: amount × (odds − 1) или amount × odds; до копеек. */
  payoutIfWin: Decimal
  /** Вероятность с учётом маржи: 1 / (odds × (1 + margin)), точно (DP 40). */
  probability: Decimal
  /** Ожидаемая ценность: выплата × вероятность, до копеек «половина вверх». */
  expectedValue: Decimal
  /** Ожидаемая ценность в % от номинала, 2 знака (считается от точного значения). */
  expectedValuePercent: Decimal
}

export type FreebetCalc = { ok: true; value: FreebetResult } | { ok: false; error: 'invalid_input' }

/** Границы маржи в процентах. */
export const MIN_MARGIN_PERCENT = '0'
export const MAX_MARGIN_PERCENT = '30'
export const DEFAULT_MARGIN_PERCENT = '5'

export type MarginParseError =
  'empty' | 'invalid_format' | 'margin_out_of_range' | 'margin_too_precise'

export type MarginParse = { ok: true; value: Decimal } | { ok: false; error: MarginParseError }

// Цифры, необязательная дробная часть через запятую или точку.
const MARGIN_RE = /^\d+(?:[.,]\d+)?$/
const MAX_MARGIN_DECIMALS = 2
const MAX_INPUT_LENGTH = 32

/**
 * Маржа в процентах (0–30, до 2 знаков): «5», «5,5», «0.25». Результат — доля
 * (5 → 0.05), построенная из строки без потери точности.
 */
export function parseMargin(input: string): MarginParse {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }
  if (text.length > MAX_INPUT_LENGTH || !MARGIN_RE.test(text)) {
    return { ok: false, error: 'invalid_format' }
  }
  const normalized = text.replace(',', '.')
  const fraction = normalized.split('.')[1]
  if (fraction !== undefined && fraction.length > MAX_MARGIN_DECIMALS) {
    return { ok: false, error: 'margin_too_precise' }
  }
  const percent = D(normalized)
  if (percent.lt(MIN_MARGIN_PERCENT) || percent.gt(MAX_MARGIN_PERCENT)) {
    return { ok: false, error: 'margin_out_of_range' }
  }
  return { ok: true, value: percent.div('100') }
}

/**
 * Сколько на самом деле стоит фрибет.
 * Выплата при заходе: «только выигрыш» — amount × (odds − 1), «со ставкой» —
 * amount × odds. Вероятность — 1 / (odds × (1 + margin)); ожидаемая ценность —
 * выплата × вероятность. Это оценка по формуле, а не прогноз события.
 * Неверные данные (сумма ≤ 0, коэффициент ≤ 1, маржа < 0) — ошибка.
 */
export function freebetValue(input: FreebetInput): FreebetCalc {
  const { amount, odds, type, margin } = input
  if (!amount.gt(ZERO) || !odds.gt(ONE) || margin.lt(ZERO)) {
    return { ok: false, error: 'invalid_input' }
  }
  const exactPayout = type === 'with_stake' ? amount.times(odds) : amount.times(odds.minus(ONE))
  const probability = ONE.div(odds.times(ONE.plus(margin)))
  const exactEv = exactPayout.times(probability)
  return {
    ok: true,
    value: {
      payoutIfWin: toMoney(exactPayout),
      probability,
      expectedValue: toMoney(exactEv),
      expectedValuePercent: exactEv.div(amount).times('100').round(2, 1),
    },
  }
}

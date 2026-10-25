import { D, ONE, type Decimal } from './decimal'
import { formatOdds } from '../format'
import { parseOdds } from './parse'
import { MAX_ODDS, MIN_ODDS } from './types'

export type OddsFormat = 'decimal' | 'fractional' | 'american' | 'probability'
export type ConvertError = 'empty' | 'invalid_format' | 'out_of_range'

const MAX_INPUT_LENGTH = 32
const HUNDRED = D('100')
const MINUS = '−'
const NBSP = '\u00A0'

const FRACTION_RE = /^(\d+)\s*\/\s*(\d+)$/
const AMERICAN_RE = /^([+\-−]?)(\d+)$/
const PERCENT_RE = /^(\d+(?:[.,]\d+)?)\s*%?$/

type Parsed = { ok: true; decimal: Decimal } | { ok: false; error: ConvertError }

function inRange(decimal: Decimal): Parsed {
  if (decimal.lt(MIN_ODDS) || decimal.gt(MAX_ODDS)) return { ok: false, error: 'out_of_range' }
  return { ok: true, decimal }
}

/**
 * Разбор ввода в выбранном формате → десятичный коэффициент (без округления).
 * Допустимый результат везде один: 1,01–1000 (как в калькуляторе).
 * - decimal: как parseOdds (запятая или точка).
 * - fractional: «3/2», пробелы вокруг «/» допустимы; знаменатель 0 — invalid_format.
 * - american: «+150», «150» (= +150), «-200» (и «−200»); |x| ≥ 100, целое.
 * - probability: «40», «40%», «40,5 %»; 100 / p. Границы следуют из диапазона
 *   коэффициентов: от 0,1 % (= 1000) до 99,00 % (≈ 1,0101); 99,01 % уже даёт
 *   1,00999… < 1,01 и считается вне диапазона.
 */
export function parseOddsAs(input: string, format: OddsFormat): Parsed {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }
  if (text.length > MAX_INPUT_LENGTH) return { ok: false, error: 'invalid_format' }

  switch (format) {
    case 'decimal': {
      const r = parseOdds(text)
      if (r.ok) return { ok: true, decimal: r.value }
      return {
        ok: false,
        error: r.error === 'odds_out_of_range' ? 'out_of_range' : 'invalid_format',
      }
    }
    case 'fractional': {
      const m = FRACTION_RE.exec(text)
      if (!m) return { ok: false, error: 'invalid_format' }
      const den = D(m[2]!)
      if (den.eq('0')) return { ok: false, error: 'invalid_format' }
      return inRange(ONE.plus(D(m[1]!).div(den)))
    }
    case 'american': {
      const m = AMERICAN_RE.exec(text)
      if (!m) return { ok: false, error: 'invalid_format' }
      const value = D(m[2]!)
      if (value.lt(HUNDRED)) return { ok: false, error: 'out_of_range' }
      return inRange(
        m[1] === '-' || m[1] === MINUS
          ? ONE.plus(HUNDRED.div(value))
          : ONE.plus(value.div(HUNDRED)),
      )
    }
    case 'probability': {
      const m = PERCENT_RE.exec(text)
      if (!m) return { ok: false, error: 'invalid_format' }
      const percent = D(m[1]!.replace(',', '.'))
      if (percent.lte('0') || percent.gte(HUNDRED)) return { ok: false, error: 'out_of_range' }
      return inRange(HUNDRED.div(percent))
    }
  }
}

export interface ConvertedOdds {
  /** Как введено/вычислено, без округления. */
  decimal: Decimal
  /** Несократимая дробь (d − 1). Для периодических значений — дробь по 40 знакам. */
  fractional: { numerator: string; denominator: string }
  /**
   * Американский: ≥ 2,00 → +(d−1)·100, иначе −100/(d−1). Округляется до целого
   * «половина вверх» (от нуля) — это общепринятая запись. Знак в значении.
   */
  american: Decimal
  /** Доля 1/d, точно (DP 40). */
  probability: Decimal
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

export function convertOdds(decimal: Decimal): ConvertedOdds {
  const profit = decimal.minus(ONE)

  // d − 1 как десятичная дробь n / 10^k → сокращаем на НОД.
  const [intPart = '0', fracPart = ''] = profit.toFixed().split('.')
  const num = BigInt(intPart + fracPart)
  const den = 10n ** BigInt(fracPart.length)
  const g = gcd(num, den)

  const american = decimal.gte('2')
    ? profit.times(HUNDRED).round(0, 1)
    : HUNDRED.div(profit).times('-1').round(0, 1)

  return {
    decimal,
    fractional: { numerator: (num / g).toString(), denominator: (den / g).toString() },
    american,
    probability: ONE.div(decimal),
  }
}

/** Строки для интерфейса: «2,5», «3/2», «+150», «40 %» (неразрывный пробел перед %). */
export function formatConverted(c: ConvertedOdds): {
  decimal: string
  fractional: string
  american: string
  probability: string
} {
  const a = c.american.toFixed(0)
  const percent = c.probability.times(HUNDRED).round(2, 1).toFixed().replace('.', ',')
  return {
    // Для периодических значений показываем до 4 знаков.
    decimal: formatOdds(c.decimal.round(4, 1)),
    fractional: `${c.fractional.numerator}/${c.fractional.denominator}`,
    american: a.startsWith('-') ? `${MINUS}${a.slice(1)}` : `+${a}`,
    probability: `${percent}${NBSP}%`,
  }
}

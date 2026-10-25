import type { Decimal } from './calc'

// Форматирование чисел для интерфейса — только из строкового представления
// big.js, без перевода в number, чтобы не терять точность.

const NBSP = ' '
const MINUS = '−'
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** Суммы больше 999 трлн ₽ показываются сокращённо. */
export const ABBREVIATE_ABOVE = '999000000000000'

function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

function superscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT[Number(d)])
    .join('')
}

export interface FormattedMoney {
  /** Что показывать: полная сумма или сокращённая. */
  text: string
  /** Полная сумма с копейками — для раскрытия по нажатию. */
  full: string
  abbreviated: boolean
}

/** «3 780,00 ₽», «−25,00 ₽»; больше 999 трлн — «≈ 1,23·10¹⁸ ₽». */
export function formatMoney(value: Decimal): FormattedMoney {
  const fixed = value.toFixed(2)
  const negative = fixed.startsWith('-') && !/^-0\.00$/.test(fixed)
  const [int = '0', frac = '00'] = fixed.replace('-', '').split('.')
  const sign = negative ? MINUS : ''
  const full = `${sign}${groupThousands(int)},${frac}${NBSP}₽`
  if (!value.abs().gt(ABBREVIATE_ABOVE)) return { text: full, full, abbreviated: false }

  const exponent = int.length - 1
  const digits = value
    .abs()
    .round(-(exponent - 2), 1)
    .toFixed(0)
  // Округление могло добавить разряд (9,995·10ⁿ → 1,00·10ⁿ⁺¹).
  const exp = digits.length - 1 > exponent ? exponent + 1 : exponent
  const mantissa = `${digits[0]},${digits.slice(1, 3)}`
  return {
    text: `≈${NBSP}${sign}${mantissa}·10${superscript(exp)}${NBSP}₽`,
    full,
    abbreviated: true,
  }
}

/** Коэффициент с запятой, без лишних нулей: «3,78», «1,005», «2». */
export function formatOdds(value: Decimal): string {
  const s = value.toFixed()
  const [int = '0', frac] = s.split('.')
  return frac ? `${groupThousands(int)},${frac}` : groupThousands(int)
}

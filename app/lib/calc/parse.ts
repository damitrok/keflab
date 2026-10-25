import { D } from './decimal'
import { MAX_ODDS, MAX_STAKE, MIN_ODDS, MIN_STAKE } from './types'
import type { ParseResult } from './types'

/**
 * Разбор пользовательского ввода. Значения создаются только из строк
 * (никаких parseFloat/Number), чтобы не терять точность.
 */

/** Максимальная длина ввода после обрезки краёв: защита от «10 000 цифр». */
const MAX_INPUT_LENGTH = 32

/** Максимум знаков после запятой в ставке (копейки). */
const MAX_STAKE_DECIMALS = 2

// \d без флага u — только ASCII-цифры 0-9.
// Коэффициент: цифры, необязательная дробная часть. «1.» и «.5» — ошибка:
// неочевидно, что имел в виду человек, а исправить ввод ему ничего не стоит.
const ODDS_RE = /^\d+(?:[.,]\d+)?$/

// Ставка: либо цифры подряд, либо группы по три через пробел, неразрывный
// пробел (U+00A0) или узкий неразрывный (U+202F). Дальше — дробная часть.
const STAKE_RE = /^(?:\d+|\d{1,3}(?:[ \u00A0\u202F]\d{3})+)(?:[.,]\d+)?$/
const STAKE_SEPARATORS_RE = /[ \u00A0\u202F]/g

/** Обрезает края и проверяет пустоту и длину. Возвращает строку или ошибку. */
function prepare(
  input: string,
): { ok: true; text: string } | { ok: false; error: 'empty' | 'invalid_format' } {
  // trim убирает обычные, неразрывные (U+00A0) и узкие неразрывные (U+202F) пробелы.
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }
  if (text.length > MAX_INPUT_LENGTH) return { ok: false, error: 'invalid_format' }
  return { ok: true, text }
}

/** Коэффициент: «1,85» и «1.85» равны; диапазон 1,01–1000 включительно. */
export function parseOdds(input: string): ParseResult {
  const prepared = prepare(input)
  if (!prepared.ok) return prepared
  if (!ODDS_RE.test(prepared.text)) return { ok: false, error: 'invalid_format' }

  // Без округления: «1,855» остаётся 1.855.
  const value = D(prepared.text.replace(',', '.'))
  if (value.lt(MIN_ODDS) || value.gt(MAX_ODDS)) return { ok: false, error: 'odds_out_of_range' }
  return { ok: true, value }
}

/**
 * Ставка в рублях. Порядок проверок: формат → точность → диапазон.
 * Точность раньше диапазона, поэтому «0,001» даёт stake_too_precise,
 * а не stake_out_of_range. Любые знаки сверх двух (даже нули) — ошибка.
 */
export function parseStake(input: string): ParseResult {
  const prepared = prepare(input)
  if (!prepared.ok) return prepared
  if (!STAKE_RE.test(prepared.text)) return { ok: false, error: 'invalid_format' }

  const normalized = prepared.text.replace(STAKE_SEPARATORS_RE, '').replace(',', '.')
  const fraction = normalized.split('.')[1]
  if (fraction !== undefined && fraction.length > MAX_STAKE_DECIMALS) {
    return { ok: false, error: 'stake_too_precise' }
  }

  const value = D(normalized)
  if (value.lt(MIN_STAKE) || value.gt(MAX_STAKE)) return { ok: false, error: 'stake_out_of_range' }
  return { ok: true, value }
}

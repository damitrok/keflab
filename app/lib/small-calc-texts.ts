import type { ConvertError, InputErrorCode, OddsFormat, ParseResult } from './calc'
import { ODDS_ERROR_TEXTS, ODDS_FORMAT_HINT, looksLikeOtherOddsFormat } from './texts'

// Тексты интерфейса мелких калькуляторов (шаг 11).

/** Ошибка поля: пустое поле показываем только после касания. */
export interface FieldError {
  text: string
  /** Добавить ссылку на конвертер коэффициентов. */
  withConverterLink?: boolean
  empty?: boolean
}

export const CALCULATORS_PATH = '/kalkulyatory/'

/** Крошки мелкого калькулятора: Главная → Калькуляторы → название. */
export function smallCalcCrumbs(title?: string): { label: string; to?: string }[] {
  const base = [{ label: 'Главная', to: '/' }]
  return title
    ? [...base, { label: 'Калькуляторы', to: CALCULATORS_PATH }, { label: title }]
    : [...base, { label: 'Калькуляторы' }]
}

export const CONVERTER_LINK_TEXT = ODDS_FORMAT_HINT.linkText
export const CONVERTER_HREF = ODDS_FORMAT_HINT.href

/** Ошибка десятичного коэффициента; дробный и американский ввод ведёт на конвертер. */
export function oddsFieldError(input: string, result: ParseResult): FieldError | null {
  if (result.ok) return null
  if (result.error === 'empty') return { text: ODDS_ERROR_TEXTS.empty, empty: true }
  if (result.error === 'invalid_format' && looksLikeOtherOddsFormat(input)) {
    return { text: ODDS_FORMAT_HINT.text, withConverterLink: true }
  }
  return { text: ODDS_ERROR_TEXTS[result.error as InputErrorCode] }
}

export const MARGIN_OUTCOMES_ERROR = 'Нужно 2 или 3 исхода'

export const SUM_ERROR_TEXTS = {
  too_few_events: 'Нужно минимум 2 коэффициента',
  too_many_events: 'Максимум 16 коэффициентов',
} as const

export const CONVERT_FORMAT_LABELS: Record<OddsFormat, string> = {
  decimal: 'Десятичный',
  fractional: 'Дробный',
  american: 'Американский',
  probability: 'Вероятность, %',
}

export const CONVERT_PLACEHOLDERS: Record<OddsFormat, string> = {
  decimal: '2,5',
  fractional: '3/2',
  american: '+150',
  probability: '40',
}

export const CONVERT_INPUT_MODE: Record<OddsFormat, 'decimal' | 'text'> = {
  decimal: 'decimal',
  fractional: 'text',
  american: 'text',
  probability: 'decimal',
}

const CONVERT_ERRORS: Record<OddsFormat, Record<ConvertError, string>> = {
  decimal: {
    empty: 'Введите коэффициент',
    invalid_format: 'Нужен десятичный коэффициент, например 2,5',
    out_of_range: 'Коэффициент — от 1,01 до 1000',
  },
  fractional: {
    empty: 'Введите дробь',
    invalid_format: 'Нужна дробь вида 3/2, знаменатель не нуль',
    out_of_range: 'Коэффициент должен быть от 1,01 до 1000',
  },
  american: {
    empty: 'Введите американский коэффициент',
    invalid_format: 'Нужно целое число со знаком, например +150 или −200',
    out_of_range: 'Американский коэффициент — от 100 по модулю, итог от 1,01 до 1000',
  },
  probability: {
    empty: 'Введите вероятность',
    invalid_format: 'Нужно число в процентах, например 40 или 37,5',
    out_of_range: 'Вероятность — от 0,1 до 99 %',
  },
}

export function convertFieldError(format: OddsFormat, error: ConvertError): FieldError {
  return { text: CONVERT_ERRORS[format][error], empty: error === 'empty' }
}

export const DOGON_STEPS_DEFAULT = '8'
export const DOGON_STEPS_ERROR = 'Шагов — целое число от 1 до 20'
export const DOGON_STEPS_EMPTY = 'Введите число шагов'
const MONEY_RANGE = 'от 0,01 до 10 000 000 ₽, не больше двух знаков после запятой'

/** Ошибка денежного поля догона: «Цель прибыли» или «Сумма проигранного». */
export function moneyFieldError(subject: string, result: ParseResult): FieldError | null {
  if (result.ok) return null
  if (result.error === 'empty') return { text: `Введите ${subject}`, empty: true }
  if (result.error === 'invalid_format') {
    return { text: 'Нужна сумма числом, например 100 или 250,50' }
  }
  return { text: `Сумма — ${MONEY_RANGE}` }
}

// TODO(text): текст написан ИИ, вычитывает человек.
export const DOGON_WARNING = {
  title: 'Риск потерять банк',
  text: 'Догон быстро увеличивает ставки: серия проигрышей может съесть весь банк, а лимиты букмекера — не дать сделать следующую ставку. Калькулятор показывает только арифметику и не советует пользоваться этой схемой.',
} as const

/** Разбор «числа шагов»: только целое 1–20. */
export function parseSteps(
  input: string,
): { ok: true; value: number } | { ok: false; empty: boolean } {
  const text = input.trim()
  if (text === '') return { ok: false, empty: true }
  if (!/^\d{1,3}$/.test(text)) return { ok: false, empty: false }
  const value = Number(text)
  return value >= 1 && value <= 20 ? { ok: true, value } : { ok: false, empty: false }
}

export const FREEBET_MARGIN_ERRORS = {
  empty: 'Введите маржу, например 5',
  invalid_format: 'Нужно число в процентах, например 5 или 4,5',
  margin_too_precise: 'Не больше двух знаков после запятой',
  margin_out_of_range: 'Маржа — от 0 до 30 %',
} as const

export const FREEBET_TYPES = [
  { value: 'winnings_only', label: 'Возвращается только выигрыш' },
  { value: 'with_stake', label: 'Выигрыш вместе со ставкой' },
] as const

export const FREEBET_FORMULA =
  'Вероятность = 1 / (коэффициент × (1 + маржа)). Ожидаемая ценность = выигрыш при заходе × вероятность. Это оценка по формуле, а не обещание выигрыша.'

export interface SmallCalcLink {
  path: string
  title: string
  description: string
}

/** Мелкие калькуляторы для хаба (адреса — как в shared/site-pages.ts). */
export const SMALL_CALC_LINKS: readonly SmallCalcLink[] = [
  {
    path: '/kalkulyatory/marzha/',
    title: 'Маржа букмекера',
    description: 'Маржа по двум или трём исходам и «честные» коэффициенты без неё.',
  },
  {
    path: '/kalkulyatory/slozhenie-koefficientov/',
    title: 'Сложение коэффициентов',
    description: 'Общий коэффициент для 2–16 событий, как в экспрессе.',
  },
  {
    path: '/kalkulyatory/dogon/',
    title: 'Калькулятор догона',
    description: 'Арифметика догона: следующая ставка и рост ставок. Есть предупреждение о риске.',
  },
  {
    path: '/kalkulyatory/fribet/',
    title: 'Калькулятор фрибета',
    description: 'Выигрыш при заходе и ожидаемая ценность фрибета с учётом маржи.',
  },
  {
    path: '/kalkulyatory/konverter-koefficientov/',
    title: 'Конвертер коэффициентов',
    description: 'Десятичные, дробные и американские коэффициенты и вероятность.',
  },
]

/** Главные калькуляторы сайта — для хаба. */
export const MAIN_CALC_LINKS: readonly SmallCalcLink[] = [
  {
    path: '/',
    title: 'Калькулятор системы',
    description: 'Система K из N: ставка на комбинацию, выплата и прибыль.',
  },
  {
    path: '/kalkulyator-ekspressa/',
    title: 'Калькулятор экспресса',
    description: 'Общий коэффициент, возврат и прибыль с учётом статусов событий.',
  },
]

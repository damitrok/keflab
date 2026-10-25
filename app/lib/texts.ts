import type { CalcErrorCode, EventStatus, InputErrorCode } from './calc'

/** Подписи статусов и короткие подсказки простыми словами. */
export const STATUS_TEXTS: Record<EventStatus, { label: string; hint: string; short: string }> = {
  pending: {
    label: 'ждём',
    short: 'ждём',
    hint: 'Событие ещё не сыграло. Такие события перебираются во вкладке «Сценарии».',
  },
  win: {
    label: 'выигрыш',
    short: 'выигрыш',
    hint: 'Ставка на событие сыграла: считается по коэффициенту.',
  },
  lose: {
    label: 'проигрыш',
    short: 'проигрыш',
    hint: 'Ставка на событие не сыграла: все комбинации с ним дают 0.',
  },
  void: {
    label: 'возврат',
    short: 'возврат',
    hint: 'Ставку на событие вернули: в комбинациях оно считается с коэффициентом 1.',
  },
  half_win: {
    label: '½ выигрыша',
    short: '½ выигр.',
    hint: 'Бывает на азиатских форах и тоталах: половина ставки выиграла, половина вернулась. Коэффициент считается как (коэффициент + 1) / 2.',
  },
  half_lose: {
    label: '½ проигрыша',
    short: '½ проигр.',
    hint: 'Бывает на азиатских форах и тоталах: половина ставки проиграла, половина вернулась. Коэффициент считается как 0,5.',
  },
}

export const ODDS_ERROR_TEXTS: Record<InputErrorCode, string> = {
  empty: 'Введите коэффициент',
  invalid_format: 'Нужен десятичный коэффициент, например 1,85',
  odds_out_of_range: 'Коэффициент — от 1,01 до 1000',
  stake_out_of_range: 'Ставка — от 0,01 до 10 000 000 ₽',
  stake_too_precise: 'Не больше двух знаков после запятой',
}

export const STAKE_ERROR_TEXTS: Record<InputErrorCode, string> = {
  empty: 'Введите сумму ставки',
  invalid_format: 'Нужна сумма числом, например 1 000 или 250,50',
  odds_out_of_range: 'Ставка — от 0,01 до 10 000 000 ₽, не больше двух знаков после запятой',
  stake_out_of_range: 'Ставка — от 0,01 до 10 000 000 ₽, не больше двух знаков после запятой',
  stake_too_precise: 'Ставка — от 0,01 до 10 000 000 ₽, не больше двух знаков после запятой',
}

export const CALC_ERROR_TEXTS: Record<CalcErrorCode, string> = {
  too_few_events: 'Нужно минимум 3 события',
  too_many_events: 'Максимум 16 событий',
  invalid_system_size: 'Выберите тип системы',
  invalid_stake: 'Введите сумму ставки',
  total_stake_too_large: 'Общая ставка (ставка × число комбинаций) — не больше 10 000 000 ₽',
}

/** Подсказка, когда ввели дробный или американский коэффициент. */
export const ODDS_FORMAT_HINT = {
  text: 'Калькулятор принимает десятичные коэффициенты. Дробные (3/2) и американские (+150) переведите в конвертере.',
  linkText: 'Конвертер коэффициентов',
  // Страница появится на шаге 11.
  href: '/kalkulyatory/konverter-koefficientov/',
}

/** Похоже ли на дробный или американский коэффициент. */
export function looksLikeOtherOddsFormat(input: string): boolean {
  return /^\s*\d+\s*\/\s*\d+\s*$/.test(input) || /^\s*[+-]\d{3,}\s*$/.test(input)
}

export const CALC_FAILED_TEXT = 'Не получилось посчитать — проверьте поля'
export const UNEVEN_SPLIT_TEXT =
  'Ставка не делится на комбинации ровно: у букмекера возможна разница в копейках.'
export const ROWS_DIFFER_TEXT =
  'Выплаты по строкам округлены до копеек, поэтому их сумма может отличаться от итога на копейки. Итог посчитан точно.'
export const SCENARIOS_CAPTION =
  'Перебираются только исходы «зашло» и «не зашло» для событий со статусом «ждём»; возвраты и половины не перебираются. Рассчитанные события учтены со своими статусами.'
export const NOT_SETTLED_TEXT = 'Итог ещё не рассчитан: есть события со статусом «ждём».'
export const NO_JS_TEXT =
  'Калькулятору нужен JavaScript. Включите его в браузере, чтобы считать свои ставки. Ниже — готовый пример расчёта.'

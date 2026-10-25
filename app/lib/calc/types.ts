import type { Decimal } from './decimal'

export const EVENT_STATUSES = ['pending', 'win', 'lose', 'void', 'half_win', 'half_lose'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

/** Событие купона. odds — уже провалидированный коэффициент (1,01–1000). */
export interface BetEvent {
  odds: Decimal
  status: EventStatus
}

/** Коды ошибок ввода. Тексты для людей — в интерфейсе (шаг 3). */
export type InputErrorCode =
  'empty' | 'invalid_format' | 'odds_out_of_range' | 'stake_out_of_range' | 'stake_too_precise'

/** Коды ошибок параметров расчёта. */
export type CalcErrorCode =
  | 'too_few_events'
  | 'too_many_events'
  | 'invalid_system_size'
  | 'invalid_stake'
  /** Общая ставка (ставка на комбинацию × число комбинаций) больше MAX_STAKE. */
  | 'total_stake_too_large'

export type ParseResult = { ok: true; value: Decimal } | { ok: false; error: InputErrorCode }

export const MIN_ODDS = '1.01'
export const MAX_ODDS = '1000'
export const MIN_STAKE = '0.01'
export const MAX_STAKE = '10000000'
export const MAX_EVENTS = 16

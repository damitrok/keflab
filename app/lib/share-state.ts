import { EVENT_STATUSES, MAX_EVENTS, parseOdds, parseStake } from './calc'
import type { EventStatus, StakeMode } from './calc'
import type { Snapshot } from './snapshot'

/**
 * Состояние калькулятора системы в адресе страницы.
 * Пример: ?s=3000&k=2&e=1.80w,2.10w,1.65l  (m=c — ставка на каждую комбинацию).
 * Всё, что не проходит строгие регулярные выражения, отбрасывается.
 */

export const SHARE_PARAMS = ['s', 'k', 'e', 'm'] as const
export const MAX_URL_LENGTH = 2000

export type QueryValue = string | null | undefined | (string | null)[]

export type DecodeResult =
  { kind: 'none' } | { kind: 'ok'; snapshot: Snapshot } | { kind: 'invalid' }

/** Минимум событий (как в useSystemCalc). */
const MIN_EVENTS = 3
/** Длина значения параметра до разбора регулярными выражениями. */
const MAX_VALUE_LENGTH = 1000

const STATUS_TO_CODE: Record<EventStatus, string> = {
  pending: 'p',
  win: 'w',
  lose: 'l',
  void: 'v',
  half_win: 'hw',
  half_lose: 'hl',
}

const CODE_TO_STATUS = Object.fromEntries(
  EVENT_STATUSES.map((status) => [STATUS_TO_CODE[status], status]),
) as Record<string, EventStatus>

const STAKE_PARAM_RE = /^\d{1,12}(?:\.\d{1,2})?$/
const K_PARAM_RE = /^\d{1,2}$/
// hw/hl раньше однобуквенных кодов, иначе «1.5hw» разберётся как «1.5h» + «w».
const EVENT_TOKEN_RE = /^(\d{1,4}(?:[.,]\d{1,6})?)?(hw|hl|p|w|l|v)$/

/** Значение параметра: undefined — нет; null — мусор (массив, слишком длинное). */
function readParam(query: Record<string, QueryValue>, name: string): string | undefined | null {
  const value = query[name]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return null
  if (value.length > MAX_VALUE_LENGTH) return null
  return value
}

export function hasShareParams(query: Record<string, QueryValue>): boolean {
  return SHARE_PARAMS.some((name) => query[name] !== undefined && query[name] !== null)
}

export function decodeShareQuery(
  query: Record<string, QueryValue>,
  urlLength: number,
): DecodeResult {
  if (!hasShareParams(query)) return { kind: 'none' }
  if (urlLength > MAX_URL_LENGTH) return { kind: 'invalid' }

  const s = readParam(query, 's')
  const k = readParam(query, 'k')
  const e = readParam(query, 'e')
  const m = readParam(query, 'm')
  if (s === null || k === null || e === null || m === null) return { kind: 'invalid' }

  let stakeInput = ''
  if (s !== undefined) {
    if (!STAKE_PARAM_RE.test(s) || !parseStake(s).ok) return { kind: 'invalid' }
    stakeInput = s
  }

  let stakeMode: StakeMode = 'total'
  if (m !== undefined) {
    if (m !== 'c') return { kind: 'invalid' }
    stakeMode = 'per_combination'
  }

  if (e === undefined || k === undefined) return { kind: 'invalid' }

  const tokens = e.split(',')
  if (tokens.length < MIN_EVENTS || tokens.length > MAX_EVENTS) return { kind: 'invalid' }

  const events: Snapshot['events'] = []
  for (const token of tokens) {
    const match = EVENT_TOKEN_RE.exec(token)
    const code = match?.[2]
    if (!match || code === undefined) return { kind: 'invalid' }
    const status = CODE_TO_STATUS[code]
    if (status === undefined) return { kind: 'invalid' }
    const odds = (match[1] ?? '').replace('.', ',')
    if (odds !== '' && !parseOdds(odds).ok) return { kind: 'invalid' }
    events.push({ odds, status })
  }

  if (!K_PARAM_RE.test(k)) return { kind: 'invalid' }
  const kValue = Number(k)
  if (kValue < 2 || kValue >= events.length) return { kind: 'invalid' }

  return { kind: 'ok', snapshot: { stakeInput, stakeMode, k: kValue, events } }
}

export function encodeShareQuery(snapshot: Snapshot): string {
  const stake = parseStake(snapshot.stakeInput)
  const stakeText = stake.ok ? stake.value.toString() : ''
  const tokens = snapshot.events.map((event) => {
    const odds = parseOdds(event.odds)
    return (odds.ok ? odds.value.toString() : '') + STATUS_TO_CODE[event.status]
  })
  const hasOdds = snapshot.events.some((event) => parseOdds(event.odds).ok)
  if (stakeText === '' && !hasOdds) return ''

  const parts: string[] = []
  if (stakeText !== '') parts.push(`s=${stakeText}`)
  if (snapshot.stakeMode === 'per_combination') parts.push('m=c')
  parts.push(`k=${snapshot.k}`)
  // Запятые в e не кодируются: коды и числа безопасны для адреса.
  parts.push(`e=${tokens.join(',')}`)
  return parts.join('&')
}

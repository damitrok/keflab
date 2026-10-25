import {
  D,
  betShape,
  binomial,
  calcExpress,
  calcSystem,
  scenarios,
  type BetEvent,
  type CombinationRow,
  type Decimal,
} from './calc'
import { formatMoney, formatOdds } from './format'
import type { FaqItem } from './seo'
import { systemTypesTable } from './system-table'

// Данные страницы /sistema-<k>-iz-<n>/ (шаг 9). Все числа считает движок,
// руками они не набираются; big.js — только строки; округляется итог.

/** Ставка для таблицы и примера. */
export const PAGE_STAKE = '1000'

/** Одинаковые коэффициенты для таблицы «сколько нужно побед». */
export const TABLE_ODDS_LOW = '1.80'
export const TABLE_ODDS_HIGH = '2.00'

/** Коэффициенты примера: берутся первые N, одинаковые для всех страниц. */
export const EXAMPLE_ODDS = [
  '1.50',
  '1.80',
  '2.00',
  '2.20',
  '2.50',
  '1.70',
  '1.90',
  '2.10',
] as const

export interface WinsRow {
  /** Сколько событий зашло. */
  wins: number
  /** Есть ли выплата (при коэффициентах 2,00). */
  hasPayout: boolean
  /** Возврат при 1,80 и при 2,00 — точное значение, два знака. */
  payoutLow: string
  payoutHigh: string
  /** То же для показа: «1 800,00 ₽». */
  payoutLowText: string
  payoutHighText: string
  /** Возврат не меньше ставки. */
  paysBackLow: boolean
  paysBackHigh: boolean
}

export interface ExampleData {
  stake: string
  stakeText: string
  /** Коэффициенты всех событий в виде «1,50». */
  odds: string[]
  /** Сколько событий зашло (первые по порядку), остальные проиграли. */
  wins: number
  perCombinationText: string
  rows: CombinationRow[]
  winningCombinations: number
  payout: string
  profit: string
  payoutText: string
  profitText: string
}

export interface NeighborLink {
  k: number
  n: number
  path: string
  label: string
  relation: string
}

export interface SystemPageData {
  k: number
  n: number
  path: string
  title: string
  h1: string
  description: string
  combinations: number
  /** Наименьшее число зашедших событий, при котором есть выплата. */
  minWins: number
  /** Наименьшее число зашедших событий для окупаемости при 2,00 (null — нет). */
  breakEvenHigh: number | null
  breakEvenLow: number | null
  winsTable: WinsRow[]
  example: ExampleData
  neighbors: NeighborLink[]
  comparison: ComparisonRow[]
  faq: FaqItem[]
}

export interface ComparisonRow {
  k: number
  n: number
  path: string
  label: string
  current: boolean
  combinations: number
  minWins: number | null
  breakEvenHigh: number | null
}

/** Реестр страниц систем (SYSTEM_PAGES из shared/site-pages.ts); передаётся снаружи,
 * чтобы lib не зависел от алиаса #shared (юнит-тесты его не знают). */
export type SystemRegistry = readonly { k: number; n: number }[]

/** Адрес страницы; совпадает с systemPagePath из реестра (проверено тестом). */
export function systemPath(k: number, n: number): string {
  return `/sistema-${k}-iz-${n}/`
}

export function isSystemPage(k: number, n: number, registry: SystemRegistry): boolean {
  return registry.some((p) => p.k === k && p.n === n)
}

/** Разбор параметров маршрута: только строки из цифр без ведущих нулей. */
export function parseSystemParams(
  k: unknown,
  n: unknown,
  registry: SystemRegistry,
): { k: number; n: number } | null {
  const strict = (v: unknown): number | null =>
    typeof v === 'string' && /^[1-9]\d{0,2}$/.test(v) ? Number(v) : null
  const kk = strict(k)
  const nn = strict(n)
  if (kk === null || nn === null || !isSystemPage(kk, nn, registry)) return null
  return { k: kk, n: nn }
}

/** «2 события», «5 событий». */
export function eventsWord(count: number): string {
  const last = count % 10
  const word =
    count % 100 >= 11 && count % 100 <= 14
      ? 'событий'
      : last === 1
        ? 'событие'
        : last >= 2 && last <= 4
          ? 'события'
          : 'событий'
  return `${count} ${word}`
}

const money = (v: Decimal): string => formatMoney(v).text
const signed = (v: Decimal): string => `${v.gt('0') ? '+' : ''}${money(v)}`

function events(n: number, wins: number, odds: readonly string[]): BetEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    odds: D(odds[i]!),
    status: i < wins ? ('win' as const) : ('lose' as const),
  }))
}

function pending(n: number, odds: string): BetEvent[] {
  return Array.from({ length: n }, () => ({ odds: D(odds), status: 'pending' as const }))
}

function settled(k: number, list: BetEvent[]) {
  const r = calcSystem(list, k, D(PAGE_STAKE))
  if (!r.ok || !r.settlement.settled) throw new Error('страница системы: расчёт не удался')
  return { r, payout: r.settlement.payout, profit: r.settlement.profit }
}

function winsTable(k: number, n: number): WinsRow[] {
  const shape = betShape('system', n, D(PAGE_STAKE), { k })
  if (!shape.ok) throw new Error('страница системы: нет параметров ставки')
  const stake = shape.shape.totalStake
  const low = scenarios(shape.shape, pending(n, TABLE_ODDS_LOW)).rows
  const high = scenarios(shape.shape, pending(n, TABLE_ODDS_HIGH)).rows
  return high.map((h, m): WinsRow => {
    const l = low[m]!
    return {
      wins: m,
      hasPayout: h.min.gt('0'),
      payoutLow: l.min.toFixed(2),
      payoutHigh: h.min.toFixed(2),
      payoutLowText: money(l.min),
      payoutHighText: money(h.min),
      paysBackLow: l.min.gte(stake),
      paysBackHigh: h.min.gte(stake),
    }
  })
}

export function neighborsOf(k: number, n: number, registry: SystemRegistry): NeighborLink[] {
  const candidates = [
    { k: k - 1, n, relation: 'меньше событий в комбинации' },
    { k: k + 1, n, relation: 'больше событий в комбинации' },
    { k, n: n - 1, relation: 'на одно событие меньше' },
    { k, n: n + 1, relation: 'на одно событие больше' },
  ]
  return candidates
    .filter((c) => isSystemPage(c.k, c.n, registry))
    .map((c) => ({
      k: c.k,
      n: c.n,
      path: systemPath(c.k, c.n),
      label: `Система ${c.k} из ${c.n}`,
      relation: c.relation,
    }))
}

function exampleData(k: number, n: number): ExampleData {
  const wins = Math.min(k + 1, n)
  const { r, payout, profit } = settled(k, events(n, wins, EXAMPLE_ODDS))
  return {
    stake: PAGE_STAKE,
    stakeText: money(D(PAGE_STAKE)),
    odds: EXAMPLE_ODDS.slice(0, n).map((o) => formatOdds(D(o))),
    wins,
    perCombinationText: money(r.shape.stakePerCombination),
    rows: r.rows,
    winningCombinations: r.rows.filter((row) => row.payout?.gt('0')).length,
    payout: payout.toFixed(2),
    profit: profit.toFixed(2),
    payoutText: money(payout),
    profitText: signed(profit),
  }
}

function faqFor(k: number, n: number, combos: number, ex: ExampleData): FaqItem[] {
  // Один проигрыш: последнее событие не зашло, остальные зашли.
  const one = settled(k, events(n, n - 1, EXAMPLE_ODDS))
  const profitOne = one.profit
  const outcomeOne = profitOne.gte('0')
    ? `ставка окупается: прибыль ${signed(profitOne)}`
    : `ставка не окупается: итог ${signed(profitOne)}`
  const all = settled(k, events(n, n, EXAMPLE_ODDS))
  const express = calcExpress(events(n, n, EXAMPLE_ODDS), D(PAGE_STAKE))
  if (!express.ok || !express.settlement.settled) throw new Error('страница системы: нет экспресса')
  const oddsText = ex.odds.join('; ')
  return [
    {
      question: `Сколько комбинаций в системе ${k} из ${n}?`,
      answer: `${combos}. Это все наборы по ${eventsWord(k)} из ${n}. Ставка делится между ними поровну: при общей ставке ${ex.stakeText} на каждую комбинацию приходится ${ex.perCombinationText}.`,
    },
    {
      question: `Сколько событий должно зайти, чтобы была выплата?`,
      answer: `Не меньше ${k}. Если зашло ${eventsWord(k)} из ${n}, выигрывает одна комбинация; если ${k - 1} или меньше, выигрывающих комбинаций нет и возврат равен нулю.`,
    },
    {
      question: `Окупится ли система ${k} из ${n}, если одно событие не зашло?`,
      answer: `Это зависит от коэффициентов. На числах примера (ставка ${ex.stakeText}, коэффициенты ${oddsText}), если не зашло последнее событие, возврат ${money(one.payout)}: ${outcomeOne}. Другие коэффициенты дадут другой итог, проверьте их в калькуляторе.`,
    },
    {
      question: `Чем система ${k} из ${n} отличается от экспресса из ${n} событий?`,
      answer: `В экспрессе одна комбинация из всех ${n} событий, и один проигрыш обнуляет ставку. В системе комбинаций ${combos}, и проигравшее событие обнуляет только те из них, где оно есть. На числах примера, если зашли все события, экспресс вернёт ${money(express.settlement.payout)}, а система — ${money(all.payout)}.`,
    },
  ]
}

export function systemPageData(k: number, n: number, registry: SystemRegistry): SystemPageData {
  if (!isSystemPage(k, n, registry)) throw new Error(`Нет страницы системы ${k} из ${n}`)
  const combos = binomial(n, k)
  const table = winsTable(k, n)
  const minWins = table.find((r) => r.hasPayout)?.wins ?? n
  const breakEvenHigh = table.find((r) => r.paysBackHigh)?.wins ?? null
  const breakEvenLow = table.find((r) => r.paysBackLow)?.wins ?? null
  const example = exampleData(k, n)
  const rows = systemTypesTable()
  const wanted = [{ k, n }, ...neighborsOf(k, n, registry)]
  const comparison = wanted.map(({ k: kk, n: nn }, i): ComparisonRow => {
    const row = rows.find((r) => r.k === kk && r.n === nn)!
    return {
      k: kk,
      n: nn,
      path: systemPath(kk, nn),
      label: `Система ${kk} из ${nn}`,
      current: i === 0,
      combinations: row.combinations,
      minWins: row.minWinsForPayout,
      breakEvenHigh: row.breakEvenAt200,
    }
  })
  return {
    k,
    n,
    path: systemPath(k, n),
    title: `Система ${k} из ${n}: калькулятор и расчёт`,
    h1: `Система ${k} из ${n}: калькулятор и расчёт`,
    description: `Система ${k} из ${n}: ${combos} комбинаций, выплата от ${minWins} зашедших событий. Калькулятор возврата и прибыли, пример с числами и сравнение с соседними системами.`,
    combinations: combos,
    minWins,
    breakEvenHigh,
    breakEvenLow,
    winsTable: table,
    example,
    neighbors: neighborsOf(k, n, registry),
    comparison,
    faq: faqFor(k, n, combos, example),
  }
}

import {
  D,
  betShape,
  calcSystem,
  effectiveOdds,
  scenarios,
  type BetEvent,
  type EventStatus,
} from '~/lib/calc'
import { formatMoney, formatOdds } from '~/lib/format'

// Числовые примеры статьи. Каждое число считает движок, в тексте цифр руками нет.

const money = (v: Parameters<typeof formatMoney>[0]): string => formatMoney(v).text
const signed = (v: Parameters<typeof formatMoney>[0]): string =>
  `${v.gt('0') ? '+' : ''}${money(v)}`

const events = (list: [string, EventStatus][]): BetEvent[] =>
  list.map(([odds, status]) => ({ odds: D(odds), status }))

/** Система K из N на одинаковых коэффициентах: итог при m зашедших (остальные проиграли). */
function atWins(n: number, k: number, stake: string, odds: string, m: number) {
  const r = calcSystem(
    Array.from({ length: n }, (_, i): BetEvent => ({
      odds: D(odds),
      status: i < m ? 'win' : 'lose',
    })),
    k,
    D(stake),
  )
  if (!r.ok || !r.settlement.settled) throw new Error('пример статьи: расчёт не удался')
  return { payout: money(r.settlement.payout), profit: signed(r.settlement.profit) }
}

export function articleExamples() {
  const stake = D('3000')
  const base = calcSystem(
    events([
      ['1.80', 'win'],
      ['2.10', 'win'],
      ['1.65', 'lose'],
    ]),
    2,
    stake,
  )
  if (!base.ok || !base.settlement.settled) throw new Error('пример статьи: нет расчёта')
  const voided = calcSystem(
    events([
      ['1.80', 'win'],
      ['2.10', 'win'],
      ['1.65', 'void'],
    ]),
    2,
    stake,
  )
  if (!voided.ok || !voided.settlement.settled) throw new Error('пример статьи: нет расчёта')

  const shape23 = betShape('system', 3, stake, { k: 2 })
  const shape35 = betShape('system', 5, D('5000'), { k: 3 })
  if (!shape23.ok || !shape35.ok) throw new Error('пример статьи: нет параметров')
  // Сценарии «зашло m из 3» при коэффициентах 2,00 — для раздела об ошибках.
  const sc = scenarios(
    shape23.shape,
    events([
      ['2.00', 'pending'],
      ['2.00', 'pending'],
      ['2.00', 'pending'],
    ]),
  )

  const odds = D('1.80')
  return {
    stake: money(stake),
    base: {
      rows: base.rows,
      perCombination: money(base.shape.stakePerCombination),
      winners: base.rows
        .filter((r) => r.payout?.gt('0'))
        .map((r) => r.events.map((i) => i + 1).join(' + '))
        .join(', '),
      payout: money(base.settlement.payout),
      profit: signed(base.settlement.profit),
    },
    voided: { payout: money(voided.settlement.payout), profit: signed(voided.settlement.profit) },
    statusOdds: {
      base: formatOdds(odds),
      void: formatOdds(effectiveOdds(odds, 'void')!),
      halfWin: formatOdds(effectiveOdds(odds, 'half_win')!),
      halfLose: formatOdds(effectiveOdds(odds, 'half_lose')!),
    },
    twoOfThree: sc.rows.map((r) => ({
      wins: r.wins,
      payout: money(r.min),
      profit: signed(r.min.minus(shape23.shape.totalStake)),
    })),
    twoOfThreeCombos: shape23.shape.combinations,
    threeOfFive: {
      stake: money(shape35.shape.totalStake),
      combos: shape35.shape.combinations,
      perCombination: money(shape35.shape.stakePerCombination),
      three: atWins(5, 3, '5000', '2.00', 3),
      four: atWins(5, 3, '5000', '2.00', 4),
    },
  }
}

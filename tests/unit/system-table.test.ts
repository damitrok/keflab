import { describe, expect, it } from 'vitest'
import { D, binomial, calcSystem, type BetEvent } from '../../app/lib/calc'
import { systemTypesTable } from '../../app/lib/system-table'

const STAKE = D('1000')

/** Независимый расчёт: m выигрышей и n−m проигрышей, прямая подстановка в calcSystem. */
function payoutWithWins(n: number, k: number, m: number, odds: string): string {
  const events: BetEvent[] = Array.from({ length: n }, (_, i) => ({
    odds: D(odds),
    status: i < m ? 'win' : 'lose',
  }))
  const r = calcSystem(events, k, STAKE)
  if (!r.ok || !r.settlement.settled) throw new Error('расчёт не удался')
  return r.settlement.payout.toFixed(2)
}

function firstWins(n: number, k: number, odds: string, ok: (payout: string) => boolean) {
  for (let m = 0; m <= n; m++) if (ok(payoutWithWins(n, k, m, odds))) return m
  return null
}

describe('systemTypesTable', () => {
  const rows = systemTypesTable()

  it('покрывает все системы K из N для N = 3…8, 2 ≤ K < N', () => {
    expect(rows.map((r) => `${r.k}/${r.n}`)).toEqual(
      [3, 4, 5, 6, 7, 8].flatMap((n) => Array.from({ length: n - 2 }, (_, i) => `${i + 2}/${n}`)),
    )
  })

  it.each(rows.map((r) => [`${r.k} из ${r.n}`, r] as const))(
    '%s совпадает с calcSystem',
    (_, r) => {
      expect(r.combinations).toBe(binomial(r.n, r.k))
      expect(r.minWinsForPayout).toBe(firstWins(r.n, r.k, '2.00', (p) => D(p).gt('0')))
      expect(r.breakEvenAt200).toBe(firstWins(r.n, r.k, '2.00', (p) => D(p).gte(STAKE)))
      expect(r.breakEvenAt180).toBe(firstWins(r.n, r.k, '1.80', (p) => D(p).gte(STAKE)))
    },
  )

  it('выплата появляется ровно при K зашедших, окупаемость — не раньше', () => {
    for (const r of rows) {
      expect(r.minWinsForPayout).toBe(r.k)
      expect(r.breakEvenAt200!).toBeGreaterThanOrEqual(r.k)
      expect(r.breakEvenAt180!).toBeGreaterThanOrEqual(r.breakEvenAt200!)
    }
  })

  it('известные строки', () => {
    const pick = (n: number, k: number) => rows.find((r) => r.n === n && r.k === k)
    expect(pick(3, 2)?.combinations).toBe(3)
    expect(pick(5, 3)?.combinations).toBe(10)
    expect(pick(6, 4)?.combinations).toBe(15)
    expect(pick(3, 2)).toMatchInlineSnapshot(`
      {
        "breakEvenAt180": 2,
        "breakEvenAt200": 2,
        "combinations": 3,
        "k": 2,
        "minWinsForPayout": 2,
        "n": 3,
      }
    `)
    expect(pick(5, 3)).toMatchInlineSnapshot(`
      {
        "breakEvenAt180": 4,
        "breakEvenAt200": 4,
        "combinations": 10,
        "k": 3,
        "minWinsForPayout": 3,
        "n": 5,
      }
    `)
    expect(pick(6, 4)).toMatchInlineSnapshot(`
      {
        "breakEvenAt180": 5,
        "breakEvenAt200": 4,
        "combinations": 15,
        "k": 4,
        "minWinsForPayout": 4,
        "n": 6,
      }
    `)
  })

  it('учитывает границы minN и maxN', () => {
    expect(systemTypesTable(5, 5).map((r) => r.k)).toEqual([2, 3, 4])
    expect(systemTypesTable(2, 2)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { D, dogonNextStake, dogonTable } from '../../../app/lib/calc'

const stakes = (target: string, odds: string, steps: number) =>
  dogonTable({ targetProfit: D(target), odds: D(odds), steps }).map((r) => r.stake.toFixed(2))

describe('dogonNextStake', () => {
  it('точное деление не меняется', () => {
    expect(dogonNextStake({ lost: D('0'), targetProfit: D('100'), odds: D('2') }).toFixed(2)).toBe(
      '100.00',
    )
  })

  it('округляет вверх до копейки: 100 / 0,85', () => {
    // 117,6470588… → 117,65 (а не 117,64 и не 117,65 «по половине»)
    expect(
      dogonNextStake({ lost: D('0'), targetProfit: D('100'), odds: D('1.85') }).toFixed(2),
    ).toBe('117.65')
  })

  it('округляет вверх даже при малом остатке: 1,001 / 1', () => {
    expect(
      dogonNextStake({ lost: D('0'), targetProfit: D('1.001'), odds: D('2') }).toFixed(2),
    ).toBe('1.01')
  })
})

describe('dogonTable', () => {
  it('цель 100, коэф. 2,00 → 100, 200, 400, 800', () => {
    expect(stakes('100', '2', 4)).toEqual(['100.00', '200.00', '400.00', '800.00'])
  })

  it('цель 100, коэф. 1,50 → 200, 600, 1800', () => {
    expect(stakes('100', '1.5', 3)).toEqual(['200.00', '600.00', '1800.00'])
  })

  it('поля строки: коэф. 2,00, цель 100, шаг 3', () => {
    const row = dogonTable({ targetProfit: D('100'), odds: D('2'), steps: 3 })[2]!
    expect(row.step).toBe(3)
    expect(row.lostBefore.toFixed(2)).toBe('300.00')
    expect(row.stake.toFixed(2)).toBe('400.00')
    expect(row.totalSpent.toFixed(2)).toBe('700.00')
    expect(row.payoutIfWin.toFixed(2)).toBe('800.00')
    expect(row.profitIfWin.toFixed(2)).toBe('100.00')
  })

  it('на неокруглых ставках прибыль при выигрыше не меньше цели на каждом шаге', () => {
    const rows = dogonTable({ targetProfit: D('100'), odds: D('1.85'), steps: 20 })
    expect(rows).toHaveLength(20)
    for (const r of rows) {
      expect(r.profitIfWin.gte('100')).toBe(true)
      expect(r.totalSpent.eq(r.lostBefore.plus(r.stake))).toBe(true)
    }
    expect(rows[0]!.stake.toFixed(2)).toBe('117.65')
    // (117,65 + 100) / 0,85 = 256,058… → 256,06
    expect(rows[1]!.stake.toFixed(2)).toBe('256.06')
    expect(rows[0]!.profitIfWin.toFixed(2)).toBe('100.00')
  })

  it('неверные параметры дают пустую таблицу', () => {
    const t = { targetProfit: D('100'), odds: D('2') }
    expect(dogonTable({ ...t, steps: 0 })).toEqual([])
    expect(dogonTable({ ...t, steps: 21 })).toEqual([])
    expect(dogonTable({ ...t, steps: 1.5 })).toEqual([])
    expect(dogonTable({ targetProfit: D('100'), odds: D('1'), steps: 3 })).toEqual([])
    expect(dogonTable({ ...t, steps: 20 })).toHaveLength(20)
    expect(dogonTable({ ...t, steps: 1 })).toHaveLength(1)
  })
})

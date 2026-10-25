import { describe, expect, it } from 'vitest'
import { D, bookMargin } from '../../../app/lib/calc'

function run(...odds: string[]) {
  const r = bookMargin(odds.map((o) => D(o)))
  if (!r.ok) throw new Error('ожидался результат')
  return r.value
}

describe('bookMargin', () => {
  it('1,90 и 1,90 → 5,26 %, честные 2,00 / 2,00', () => {
    const v = run('1.9', '1.9')
    expect(v.marginPercent.toFixed(2)).toBe('5.26')
    expect(v.margin.round(6).toFixed()).toBe('0.052632')
    expect(v.fairOdds.map((o) => o.toFixed(2))).toEqual(['2.00', '2.00'])
    expect(v.fairProbabilities.map((p) => p.toFixed())).toEqual(['0.5', '0.5'])
  })

  it('нулевая маржа: 2,00 и 2,00', () => {
    const v = run('2', '2')
    expect(v.margin.toFixed()).toBe('0')
    expect(v.marginPercent.toFixed(2)).toBe('0.00')
  })

  it('3 исхода 2,50 / 3,20 / 2,80 → 6,96 %', () => {
    // 1/2,5 + 1/3,2 + 1/2,8 = 0,4 + 0,3125 + 0,357142857… = 1,069642857…
    const v = run('2.5', '3.2', '2.8')
    expect(v.marginPercent.toFixed(2)).toBe('6.96')
    // 2,5·1,0696428… = 2,674107… ; 3,2·… = 3,422857… ; 2,8·… = 2,995 (ровно)
    expect(v.fairOdds.map((o) => o.toFixed(2))).toEqual(['2.67', '3.42', '3.00'])
    const total = v.fairProbabilities.reduce((a, p) => a.plus(p), D('0'))
    expect(total.round(30).toFixed()).toBe('1')
  })

  it('ошибка при 1 и 4 исходах и при пустом списке', () => {
    expect(bookMargin([D('2')])).toEqual({ ok: false, error: 'outcomes_count' })
    expect(bookMargin([D('2'), D('2'), D('2'), D('2')])).toEqual({
      ok: false,
      error: 'outcomes_count',
    })
    expect(bookMargin([])).toEqual({ ok: false, error: 'outcomes_count' })
  })
})

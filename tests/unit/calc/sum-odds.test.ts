import { describe, expect, it } from 'vitest'
import { D, sumOdds } from '../../../app/lib/calc'

const list = (...v: string[]) => v.map((x) => D(x))

describe('sumOdds', () => {
  it('1,5 · 2 · 3 = 9', () => {
    const r = sumOdds(list('1.5', '2', '3'))
    expect(r.ok && r.total.toFixed()).toBe('9')
    expect(r.ok && r.totalRounded.toFixed(2)).toBe('9.00')
  })

  it('точное значение и округление итога: 1,855 · 1,855', () => {
    const r = sumOdds(list('1.855', '1.855'))
    expect(r.ok && r.total.toFixed()).toBe('3.441025')
    expect(r.ok && r.totalRounded.toFixed(2)).toBe('3.44')
  })

  it('границы числа событий', () => {
    expect(sumOdds(list('2'))).toEqual({ ok: false, error: 'too_few_events' })
    expect(sumOdds(Array.from({ length: 17 }, () => D('2')))).toEqual({
      ok: false,
      error: 'too_many_events',
    })
    const sixteen = sumOdds(Array.from({ length: 16 }, () => D('2')))
    expect(sixteen.ok && sixteen.total.toFixed()).toBe('65536')
  })
})

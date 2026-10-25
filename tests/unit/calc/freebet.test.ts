import { describe, expect, it } from 'vitest'
import { D, freebetValue, parseMargin, type FreebetType } from '../../../app/lib/calc'

function calc(amount: string, odds: string, type: FreebetType, marginPercent: string) {
  const m = parseMargin(marginPercent)
  if (!m.ok) throw new Error('margin')
  const r = freebetValue({ amount: D(amount), odds: D(odds), type, margin: m.value })
  if (!r.ok) throw new Error('calc')
  return r.value
}

describe('freebetValue', () => {
  it('приёмка ТЗ: 1000, 2,00, только выигрыш, маржа 0 → 1000 и 500', () => {
    const r = calc('1000', '2.00', 'winnings_only', '0')
    expect(r.payoutIfWin.toFixed(2)).toBe('1000.00')
    expect(r.probability.toFixed()).toBe('0.5')
    expect(r.expectedValue.toFixed(2)).toBe('500.00')
    expect(r.expectedValuePercent.toFixed(2)).toBe('50.00')
  })

  it('со ставкой: 2000 и 1000', () => {
    const r = calc('1000', '2.00', 'with_stake', '0')
    expect(r.payoutIfWin.toFixed(2)).toBe('2000.00')
    expect(r.expectedValue.toFixed(2)).toBe('1000.00')
    expect(r.expectedValuePercent.toFixed(2)).toBe('100.00')
  })

  it('маржа 5 % при 2,00: вероятность 1/2,1, ценность 476,19', () => {
    const r = calc('1000', '2.00', 'winnings_only', '5')
    expect(r.probability.toFixed(6)).toBe('0.476190')
    expect(r.probability.eq(D('1').div('2.1'))).toBe(true)
    expect(r.payoutIfWin.toFixed(2)).toBe('1000.00')
    expect(r.expectedValue.toFixed(2)).toBe('476.19')
    expect(r.expectedValuePercent.toFixed(2)).toBe('47.62')
  })

  it('некруглые: 500, 1,85, маржа 5 %', () => {
    // выплата 425; вероятность 1/1,9425 = 0,514800…; ценность 218,79…
    const r = calc('500', '1.85', 'winnings_only', '5')
    expect(r.payoutIfWin.toFixed(2)).toBe('425.00')
    expect(r.probability.toFixed(6)).toBe('0.514801')
    expect(r.expectedValue.toFixed(2)).toBe('218.79')
    expect(r.expectedValuePercent.toFixed(2)).toBe('43.76')
  })

  it('округляет итог, а не промежуточные значения', () => {
    // 100 × 0,01 = 1; 1/(1,01 × 1) = 0,990099…; ценность 0,99
    const r = calc('100', '1.01', 'winnings_only', '0')
    expect(r.payoutIfWin.toFixed(2)).toBe('1.00')
    expect(r.expectedValue.toFixed(2)).toBe('0.99')
  })

  it('«половина вверх»: 0,05 × 1/(1,5) … граница 0,005', () => {
    // 0,01 ₽ при коэф. 2 без маржи: выплата 0,01, ценность 0,005 → 0,01
    const r = calc('0.01', '2', 'winnings_only', '0')
    expect(r.expectedValue.toFixed(2)).toBe('0.01')
  })

  it('границы маржи 0 и 30 %', () => {
    const lo = calc('1000', '2', 'winnings_only', '0')
    const hi = calc('1000', '2', 'winnings_only', '30')
    expect(lo.expectedValue.toFixed(2)).toBe('500.00')
    expect(hi.probability.toFixed(6)).toBe('0.384615')
    expect(hi.expectedValue.toFixed(2)).toBe('384.62')
  })

  it('большие значения без потери точности', () => {
    const r = calc('10000000', '1000', 'with_stake', '0')
    expect(r.payoutIfWin.toFixed(2)).toBe('10000000000.00')
    expect(r.expectedValue.toFixed(2)).toBe('10000000.00')
  })

  it('неверные данные — ошибка', () => {
    const base = { amount: D('1000'), odds: D('2'), type: 'winnings_only' as const, margin: D('0') }
    expect(freebetValue({ ...base, amount: D('0') })).toEqual({ ok: false, error: 'invalid_input' })
    expect(freebetValue({ ...base, odds: D('1') }).ok).toBe(false)
    expect(freebetValue({ ...base, margin: D('-0.01') }).ok).toBe(false)
  })
})

describe('parseMargin', () => {
  it('принимает запятую и точку, возвращает долю', () => {
    const a = parseMargin('5')
    const b = parseMargin('5,5')
    const c = parseMargin('0.25')
    expect(a.ok && a.value.toFixed()).toBe('0.05')
    expect(b.ok && b.value.toFixed()).toBe('0.055')
    expect(c.ok && c.value.toFixed()).toBe('0.0025')
  })

  it('границы: 0 и 30 можно, 30,01 и 31 нельзя', () => {
    expect(parseMargin('0').ok).toBe(true)
    expect(parseMargin('30').ok).toBe(true)
    expect(parseMargin('30,00').ok).toBe(true)
    expect(parseMargin('30,01')).toEqual({ ok: false, error: 'margin_out_of_range' })
    expect(parseMargin('31')).toEqual({ ok: false, error: 'margin_out_of_range' })
  })

  it('ошибки формата и точности', () => {
    expect(parseMargin('')).toEqual({ ok: false, error: 'empty' })
    expect(parseMargin('   ')).toEqual({ ok: false, error: 'empty' })
    expect(parseMargin('-1')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseMargin('5%')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseMargin('5.')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseMargin('1'.repeat(40))).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseMargin('5,555')).toEqual({ ok: false, error: 'margin_too_precise' })
  })
})

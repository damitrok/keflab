import { describe, expect, it } from 'vitest'
import { D } from '../../app/lib/calc'
import { formatMoney, formatOdds } from '../../app/lib/format'

const NBSP = ' '
const MINUS = '−'

describe('formatMoney', () => {
  it('группирует разряды неразрывным пробелом', () => {
    expect(formatMoney(D('3780')).text).toBe(`3${NBSP}780,00${NBSP}₽`)
    expect(formatMoney(D('1234567.8')).text).toBe(`1${NBSP}234${NBSP}567,80${NBSP}₽`)
    expect(formatMoney(D('0')).text).toBe(`0,00${NBSP}₽`)
  })

  it('использует настоящий минус U+2212', () => {
    const t = formatMoney(D('-25')).text
    expect(t).toBe(`${MINUS}25,00${NBSP}₽`)
    expect(t.charCodeAt(0)).toBe(0x2212)
  })

  it('не показывает «−0,00»', () => {
    expect(formatMoney(D('-0.001')).text).toBe(`0,00${NBSP}₽`)
  })

  it('не сокращает до 999 трлн включительно', () => {
    const m = formatMoney(D('999000000000000'))
    expect(m.abbreviated).toBe(false)
    expect(m.text).toBe(m.full)
  })

  it('сокращает суммы больше 999 трлн', () => {
    const m = formatMoney(D('1e55'))
    expect(m.abbreviated).toBe(true)
    expect(m.text).toBe(`≈${NBSP}1,00·10⁵⁵${NBSP}₽`)
    expect(m.full.endsWith(`,00${NBSP}₽`)).toBe(true)
    expect(m.full.replace(/\D/g, '').length).toBe(58)
  })

  it('переносит разряд при округлении: 9,995·10¹⁸ → 1,00·10¹⁹', () => {
    expect(formatMoney(D('9995000000000000000')).text).toBe(`≈${NBSP}1,00·10¹⁹${NBSP}₽`)
    expect(formatMoney(D('9994000000000000000')).text).toBe(`≈${NBSP}9,99·10¹⁸${NBSP}₽`)
  })

  it('сокращённый отрицательный итог с минусом', () => {
    expect(formatMoney(D('-1e20')).text).toBe(`≈${NBSP}${MINUS}1,00·10²⁰${NBSP}₽`)
  })
})

describe('formatOdds', () => {
  it('запятая и без лишних нулей', () => {
    expect(formatOdds(D('3.78'))).toBe('3,78')
    expect(formatOdds(D('1.005'))).toBe('1,005')
    expect(formatOdds(D('2.50'))).toBe('2,5')
  })

  it('целые и тысячи', () => {
    expect(formatOdds(D('1000'))).toBe(`1${NBSP}000`)
    expect(formatOdds(D('2'))).toBe('2')
  })
})

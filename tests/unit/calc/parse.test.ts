import { describe, expect, it } from 'vitest'
import { parseOdds, parseStake } from '../../../app/lib/calc/parse'

function okValue(result: ReturnType<typeof parseOdds>): string {
  if (!result.ok) throw new Error(`ожидался успех, получено ${result.error}`)
  return result.value.toString()
}

describe('parseOdds', () => {
  it('запятая, точка и пробелы по краям дают одно число', () => {
    expect(okValue(parseOdds('1,85'))).toBe('1.85')
    expect(okValue(parseOdds('1.85'))).toBe('1.85')
    expect(okValue(parseOdds(' 1,85 '))).toBe('1.85')
    expect(okValue(parseOdds(' 1,85 '))).toBe('1.85')
  })

  it('не округляет «1,855»', () => {
    expect(okValue(parseOdds('1,855'))).toBe('1.855')
  })

  it('принимает границы 1,01 и 1000', () => {
    expect(okValue(parseOdds('1,01'))).toBe('1.01')
    expect(okValue(parseOdds('1000'))).toBe('1000')
    expect(okValue(parseOdds('1000,00'))).toBe('1000')
  })

  it.each(['', '   ', '  '])('пусто: %j → empty', (s) => {
    expect(parseOdds(s)).toEqual({ ok: false, error: 'empty' })
  })

  it.each([
    '1,234.5',
    '2,1,0',
    '1e3',
    'Infinity',
    'NaN',
    '−2',
    '-2',
    '+2',
    'abc',
    '0x10',
    '1.',
    '.5',
    '1 85',
    '1 85',
    '١,٨٥',
  ])('%j → invalid_format', (s) => {
    expect(parseOdds(s)).toEqual({ ok: false, error: 'invalid_format' })
  })

  it.each(['1', '1,00', '1,009', '1000,01', '0', '0,5', '5000'])('%j → odds_out_of_range', (s) => {
    expect(parseOdds(s)).toEqual({ ok: false, error: 'odds_out_of_range' })
  })

  it('длинный ввод даёт ошибку и не виснет', () => {
    const long = '1'.repeat(10_000)
    expect(parseOdds(long)).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseOdds('1,' + '0'.repeat(31))).toEqual({ ok: false, error: 'invalid_format' })
  })

  it('граница длины: 32 символа допустимы, 33 — нет', () => {
    expect(okValue(parseOdds('1,' + '5'.repeat(30)))).toBe('1.' + '5'.repeat(30))
    expect(parseOdds('1,' + '5'.repeat(31))).toEqual({ ok: false, error: 'invalid_format' })
  })
})

describe('parseStake', () => {
  it('«1500» и «1 500,50»', () => {
    expect(okValue(parseStake('1500'))).toBe('1500')
    expect(okValue(parseStake('1 500,50'))).toBe('1500.5')
    expect(okValue(parseStake('1 500.5'))).toBe('1500.5')
  })

  it('пробелы тысяч: обычный, U+00A0, U+202F', () => {
    expect(okValue(parseStake('1 000'))).toBe('1000')
    expect(okValue(parseStake('1 000'))).toBe('1000')
    expect(okValue(parseStake('1 000'))).toBe('1000')
    expect(okValue(parseStake('  1 000  '))).toBe('1000')
  })

  it('границы 0,01 и 10 000 000', () => {
    expect(okValue(parseStake('0,01'))).toBe('0.01')
    expect(okValue(parseStake('10 000 000'))).toBe('10000000')
    expect(okValue(parseStake('10000000'))).toBe('10000000')
  })

  it.each(['', '  ', ' '])('пусто: %j → empty', (s) => {
    expect(parseStake(s)).toEqual({ ok: false, error: 'empty' })
  })

  it.each([
    '1,234.5',
    '2,1,0',
    '1e3',
    'Infinity',
    'NaN',
    '−2',
    '-2',
    '+2',
    'abc',
    '0x10',
    '1.',
    '.5',
    '1 00',
    '1 0000',
    '1 5 0',
    '1  000',
  ])('%j → invalid_format', (s) => {
    expect(parseStake(s)).toEqual({ ok: false, error: 'invalid_format' })
  })

  it.each(['0', '0,00', '0,00', '10 000 001', '99999999'])('%j → stake_out_of_range', (s) => {
    expect(parseStake(s)).toEqual({ ok: false, error: 'stake_out_of_range' })
  })

  it.each(['0,001', '1,234', '1,500', '10 000 001,555'])('%j → stake_too_precise', (s) => {
    expect(parseStake(s)).toEqual({ ok: false, error: 'stake_too_precise' })
  })

  it('длинный ввод даёт ошибку и не виснет', () => {
    expect(parseStake('9'.repeat(10_000))).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseStake('1 000'.repeat(100))).toEqual({ ok: false, error: 'invalid_format' })
  })
})

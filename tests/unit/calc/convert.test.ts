import { describe, expect, it } from 'vitest'
import {
  D,
  convertOdds,
  formatConverted,
  parseOddsAs,
  type OddsFormat,
} from '../../../app/lib/calc'

const NB = '\u00A0'
const fmt = (decimal: string) => formatConverted(convertOdds(D(decimal)))

describe('convertOdds + formatConverted', () => {
  it('2,50 ↔ 3/2 ↔ +150 ↔ 40 %', () => {
    expect(fmt('2.5')).toEqual({
      decimal: '2,5',
      fractional: '3/2',
      american: '+150',
      probability: `40${NB}%`,
    })
  })

  it('1,50 ↔ 1/2 ↔ −200 ↔ 66,67 %', () => {
    expect(fmt('1.5')).toEqual({
      decimal: '1,5',
      fractional: '1/2',
      american: '−200',
      probability: `66,67${NB}%`,
    })
  })

  it('2,00 ↔ 1/1 ↔ +100 ↔ 50 %', () => {
    expect(fmt('2')).toEqual({
      decimal: '2',
      fractional: '1/1',
      american: '+100',
      probability: `50${NB}%`,
    })
  })

  it('1,855 → 171/200, американский округляется до целого', () => {
    const r = fmt('1.855')
    expect(r.fractional).toBe('171/200')
    expect(r.decimal).toBe('1,855')
    // −100 / 0,855 = −116,959… → −117
    expect(r.american).toBe('−117')
  })

  it('американский: половина округляется от нуля', () => {
    // d = 1,8 → −125 ровно; d = 2,005 → +100,5 → +101
    expect(convertOdds(D('1.8')).american.toFixed()).toBe('-125')
    expect(convertOdds(D('2.005')).american.toFixed()).toBe('101')
  })

  it('периодические значения: сжатая запись десятичного, вероятность точная', () => {
    const c = convertOdds(D('3'))
    expect(c.probability.toFixed().length).toBeGreaterThan(30)
    expect(formatConverted(c).probability).toBe(`33,33${NB}%`)
    const p = parseOddsAs('33,33', 'probability')
    expect(p.ok && formatConverted(convertOdds(p.decimal)).decimal).toBe('3,0003')
  })

  it('большие числа: пробелы в тысячах десятичного', () => {
    expect(fmt('1000').decimal).toBe('1\u00A0000')
    expect(fmt('1000').american).toBe('+99900')
  })
})

describe('parseOddsAs: обратное направление (всё → 2,5)', () => {
  const cases: [OddsFormat, string][] = [
    ['decimal', '2,50'],
    ['decimal', '2.5'],
    ['fractional', '3/2'],
    ['fractional', ' 3 / 2 '],
    ['american', '+150'],
    ['american', '150'],
    ['probability', '40'],
    ['probability', '40%'],
    ['probability', '40 %'],
    ['probability', '40,0 %'],
  ]
  it.each(cases)('%s «%s» → 2,5', (format, input) => {
    const r = parseOddsAs(input, format)
    expect(r.ok && r.decimal.toFixed()).toBe('2.5')
    expect(r.ok && formatConverted(convertOdds(r.decimal)).fractional).toBe('3/2')
  })

  it('−200 и 66,67 % → 1,5', () => {
    for (const input of ['-200', '−200']) {
      const r = parseOddsAs(input, 'american')
      expect(r.ok && r.decimal.toFixed()).toBe('1.5')
    }
    const f = parseOddsAs('1/2', 'fractional')
    expect(f.ok && f.decimal.toFixed()).toBe('1.5')
    const p = parseOddsAs('66,67%', 'probability')
    expect(p.ok && formatConverted(convertOdds(p.decimal)).decimal).toBe('1,4999')
  })

  it('1/1, +100, -100, 50 % → 2', () => {
    for (const [format, input] of [
      ['fractional', '1/1'],
      ['american', '+100'],
      ['american', '-100'],
      ['probability', '50'],
    ] as const) {
      const r = parseOddsAs(input, format)
      expect(r.ok && r.decimal.toFixed()).toBe('2')
    }
  })

  it('границы диапазона', () => {
    const ok: [OddsFormat, string][] = [
      ['decimal', '1,01'],
      ['decimal', '1000'],
      ['probability', '0,1'],
      ['probability', '99'],
      ['american', '+99900'],
      ['american', '-10000'],
      ['fractional', '999/1'],
    ]
    for (const [format, input] of ok) expect(parseOddsAs(input, format).ok).toBe(true)
  })

  it('ошибки', () => {
    const bad: [OddsFormat, string, string][] = [
      ['fractional', '3/0', 'invalid_format'],
      ['fractional', 'abc', 'invalid_format'],
      ['fractional', '3/-2', 'invalid_format'],
      ['fractional', '0/5', 'out_of_range'],
      ['fractional', '1000/1', 'out_of_range'],
      ['american', '+50', 'out_of_range'],
      ['american', '-99', 'out_of_range'],
      ['american', '+100000', 'out_of_range'],
      ['american', '1,5', 'invalid_format'],
      ['american', 'abc', 'invalid_format'],
      ['probability', '0 %', 'out_of_range'],
      ['probability', '100 %', 'out_of_range'],
      ['probability', '99,01', 'out_of_range'],
      ['probability', '0,05', 'out_of_range'],
      ['probability', '-5', 'invalid_format'],
      ['probability', 'abc', 'invalid_format'],
      ['decimal', '1,00', 'out_of_range'],
      ['decimal', '1001', 'out_of_range'],
      ['decimal', 'abc', 'invalid_format'],
      ['decimal', '', 'empty'],
      ['fractional', '   ', 'empty'],
      ['american', '', 'empty'],
      ['probability', '', 'empty'],
      ['decimal', '1'.repeat(40), 'invalid_format'],
    ]
    for (const [format, input, error] of bad) {
      expect(parseOddsAs(input, format), `${format} «${input}»`).toEqual({ ok: false, error })
    }
  })
})

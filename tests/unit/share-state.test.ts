import { describe, expect, it } from 'vitest'
import { EVENT_STATUSES, MAX_EVENTS } from '../../app/lib/calc'
import type { EventStatus } from '../../app/lib/calc'
import {
  MAX_URL_LENGTH,
  decodeShareQuery,
  encodeShareQuery,
  hasShareParams,
} from '../../app/lib/share-state'
import type { QueryValue } from '../../app/lib/share-state'
import type { Snapshot } from '../../app/lib/snapshot'

function decode(query: Record<string, QueryValue>, urlLength = 100) {
  return decodeShareQuery(query, urlLength)
}

function parseQs(qs: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(qs))
}

describe('decodeShareQuery', () => {
  it('разбирает пример из ТЗ', () => {
    const result = decode({ s: '3000', k: '2', e: '1.80w,2.10w,1.65l' })
    expect(result).toEqual({
      kind: 'ok',
      snapshot: {
        stakeInput: '3000',
        stakeMode: 'total',
        k: 2,
        events: [
          { odds: '1,80', status: 'win' },
          { odds: '2,10', status: 'win' },
          { odds: '1,65', status: 'lose' },
        ],
      },
    })
  })

  it('m=c даёт per_combination, отсутствие m — total', () => {
    const base = { s: '100', k: '2', e: '1.5hw,2p,3hl' }
    const c = decode({ ...base, m: 'c' })
    expect(c.kind === 'ok' && c.snapshot.stakeMode).toBe('per_combination')
    const t = decode(base)
    expect(t.kind === 'ok' && t.snapshot.stakeMode).toBe('total')
    expect(t.kind === 'ok' && t.snapshot.events.map((x) => x.status)).toEqual([
      'half_win',
      'pending',
      'half_lose',
    ])
  })

  it('без s ставка пустая; пустые коэффициенты допустимы', () => {
    const r = decode({ k: '2', e: 'p,v,w' })
    expect(r.kind === 'ok' && r.snapshot.stakeInput).toBe('')
    expect(r.kind === 'ok' && r.snapshot.events.map((x) => x.odds)).toEqual(['', '', ''])
  })

  it('none: пустой query и только посторонние параметры', () => {
    expect(decode({})).toEqual({ kind: 'none' })
    expect(decode({ utm_source: 'tg' })).toEqual({ kind: 'none' })
    expect(decode({ s: undefined, k: null })).toEqual({ kind: 'none' })
  })

  it('игнорирует посторонние параметры', () => {
    expect(decode({ utm_source: 'x', k: '2', e: 'p,p,p' }).kind).toBe('ok')
  })

  const bad: [string, Record<string, QueryValue>][] = [
    ['e=abc', { k: '2', e: 'abc' }],
    ['k равен N', { k: '3', e: '1.5w,1.5w,1.5w' }],
    ['k больше N', { k: '9', e: '1.5w,1.5w,1.5w' }],
    ['k=1', { k: '1', e: '1.5w,1.5w,1.5w' }],
    ['k не число', { k: 'a', e: '1.5w,1.5w,1.5w' }],
    ['k с минусом', { k: '-2', e: '1.5w,1.5w,1.5w' }],
    ['k из трёх цифр', { k: '002', e: '1.5w,1.5w,1.5w' }],
    ['17 событий', { k: '2', e: Array(17).fill('1.5w').join(',') }],
    ['2 события', { k: '2', e: '1.5w,1.5w' }],
    ['e без k', { e: '1.5w,1.5w,1.5w' }],
    ['k без e', { k: '2' }],
    ['только s', { s: '100' }],
    ['неизвестный статус', { k: '2', e: '1.5x,1.5w,1.5w' }],
    ['коэффициент 1000.01', { k: '2', e: '1000.01w,1.5w,1.5w' }],
    ['коэффициент 1,00', { k: '2', e: '1.00w,1.5w,1.5w' }],
    ['запятая внутри коэффициента', { k: '2', e: '1,5w,1.5w,1.5w' }],
    ['s=0', { s: '0', k: '2', e: '1.5w,1.5w,1.5w' }],
    ['s=abc', { s: 'abc', k: '2', e: '1.5w,1.5w,1.5w' }],
    ['s с тремя знаками', { s: '1.234', k: '2', e: '1.5w,1.5w,1.5w' }],
    ['m=x', { m: 'x', k: '2', e: '1.5w,1.5w,1.5w' }],
    ['массив k', { k: ['2', '3'], e: '1.5w,1.5w,1.5w' }],
    ['массив с null', { k: [null], e: '1.5w,1.5w,1.5w' }],
    ['script в e', { k: '2', e: '<script>alert(1)</script>w,1.5w,1.5w' }],
    ['img в s', { s: '<img src=x onerror=alert(1)>', k: '2', e: '1.5w,1.5w,1.5w' }],
    ['слишком длинное значение', { k: '2', e: '1.5w,'.repeat(300) + '1.5w' }],
  ]
  it.each(bad)('invalid: %s', (_name, query) => {
    expect(decode(query)).toEqual({ kind: 'invalid' })
  })

  it('адрес длиннее MAX_URL_LENGTH — invalid, ровно MAX — ok', () => {
    const q = { k: '2', e: '1.5w,1.5w,1.5w' }
    expect(decode(q, MAX_URL_LENGTH + 1)).toEqual({ kind: 'invalid' })
    expect(decode(q, MAX_URL_LENGTH).kind).toBe('ok')
  })
})

describe('hasShareParams', () => {
  it('true при любом из s, k, e, m', () => {
    for (const name of ['s', 'k', 'e', 'm']) expect(hasShareParams({ [name]: 'x' })).toBe(true)
    expect(hasShareParams({ s: '' })).toBe(true)
  })
  it('false без них', () => {
    expect(hasShareParams({})).toBe(false)
    expect(hasShareParams({ utm_source: 'a', s: null, k: undefined })).toBe(false)
  })
})

describe('encodeShareQuery', () => {
  const ev = (odds: string, status: EventStatus) => ({ odds, status })

  it('пример: нормализует ставку и коэффициенты, порядок s, m, k, e', () => {
    const qs = encodeShareQuery({
      stakeInput: '1 000',
      stakeMode: 'per_combination',
      k: 2,
      events: [ev('1,80', 'win'), ev('2.10', 'half_win'), ev('', 'pending')],
    })
    expect(qs).toBe('s=1000&m=c&k=2&e=1.8w,2.1hw,p')
  })

  it('total: m не пишется; невалидная ставка и коэффициент отбрасываются', () => {
    expect(
      encodeShareQuery({
        stakeInput: 'abc',
        stakeMode: 'total',
        k: 2,
        events: [ev('1,5', 'lose'), ev('x', 'void'), ev('', 'half_lose')],
      }),
    ).toBe('k=2&e=1.5l,v,hl')
  })

  it('пустой ввод — пустая строка', () => {
    expect(
      encodeShareQuery({
        stakeInput: '',
        stakeMode: 'per_combination',
        k: 2,
        events: [ev('', 'pending'), ev('', 'win'), ev('', 'pending')],
      }),
    ).toBe('')
  })

  it('ставка 250,5 -> s=250.5', () => {
    const qs = encodeShareQuery({
      stakeInput: '250,5',
      stakeMode: 'total',
      k: 2,
      events: [ev('', 'pending'), ev('', 'pending'), ev('', 'pending')],
    })
    expect(qs).toBe('s=250.5&k=2&e=p,p,p')
  })
})

describe('круговая проверка', () => {
  function rng(seed: number) {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('encode -> decode возвращает тот же snapshot (60 случаев)', () => {
    const rand = rng(12345)
    const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
    for (let i = 0; i < 60; i++) {
      const n = i < 3 ? [3, MAX_EVENTS, 5][i]! : int(3, MAX_EVENTS)
      const events = Array.from({ length: n }, (_, j) => {
        const status = EVENT_STATUSES[(i + j + int(0, 5)) % EVENT_STATUSES.length]!
        const odds =
          rand() < 0.2
            ? ''
            : `${int(1, 999)},${String(int(1, 99)).padStart(2, '0')}`.replace(/0$/, '5')
        return { odds, status }
      })
      events[0] = {
        odds: events[0]!.odds === '' ? '1,5' : events[0]!.odds,
        status: events[0]!.status,
      }
      const snapshot: Snapshot = {
        stakeInput: rand() < 0.2 ? '' : `${int(1, 99999)}${rand() < 0.5 ? `,${int(1, 9)}5` : ''}`,
        stakeMode: rand() < 0.5 ? 'total' : 'per_combination',
        k: int(2, n - 1),
        events,
      }
      const qs = encodeShareQuery(snapshot)
      const result = decode(parseQs(qs), qs.length)
      expect(result.kind).toBe('ok')
      if (result.kind !== 'ok') continue
      expect(result.snapshot.k).toBe(snapshot.k)
      expect(result.snapshot.stakeMode).toBe(snapshot.stakeMode)
      expect(result.snapshot.events.map((x) => x.status)).toEqual(events.map((x) => x.status))
      expect(result.snapshot.events.map((x) => x.odds)).toEqual(events.map((x) => x.odds))
      // повторное кодирование стабильно
      expect(encodeShareQuery(result.snapshot)).toBe(qs)
      if (snapshot.stakeInput !== '') {
        expect(Number(result.snapshot.stakeInput)).toBe(
          Number(snapshot.stakeInput.replace(',', '.')),
        )
      } else {
        expect(result.snapshot.stakeInput).toBe('')
      }
    }
  })
})

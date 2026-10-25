import { describe, expect, it } from 'vitest'
import { D, type BetEvent, type EventStatus } from '../../../app/lib/calc/index'
import { expressIfOneVoided } from '../../../app/lib/calc/what-if'

const ev = (odds: string, status: EventStatus): BetEvent => ({ odds: D(odds), status })

function rows(events: BetEvent[], stake: string) {
  const r = expressIfOneVoided(events, D(stake))
  if (!r.ok) throw new Error(r.error)
  return r
}

describe('expressIfOneVoided', () => {
  it('100 ₽, 2,00 и 1,50: вернули первое — 150,00, второе — 200,00', () => {
    const r = rows([ev('2', 'win'), ev('1.5', 'win')], '100')
    expect(r.rows.map((x) => x.payout.toFixed(2))).toEqual(['150.00', '200.00'])
    expect(r.rows.map((x) => x.profit.toFixed(2))).toEqual(['50.00', '100.00'])
    expect(r.rows.map((x) => x.index)).toEqual([1, 2])
    expect(r.rows[0]!.odds.toFixed()).toBe('2')
    expect(r.assumesPendingWin).toBe(false)
  })

  it('ждём считается выигрышем и помечается допущением', () => {
    const r = rows([ev('2', 'pending'), ev('1.5', 'pending'), ev('3', 'win')], '100')
    expect(r.rows.map((x) => x.payout.toFixed(2))).toEqual(['450.00', '600.00', '300.00'])
    expect(r.assumesPendingWin).toBe(true)
  })

  it('проигранное событие обнуляет возврат, пока его не «вернули»', () => {
    const r = rows([ev('2', 'lose'), ev('1.5', 'win')], '100')
    expect(r.rows.map((x) => x.payout.toFixed(2))).toEqual(['150.00', '0.00'])
    expect(r.rows[1]!.profit.toFixed(2)).toBe('-100.00')
  })

  it('учитывает половины и возврат у остальных событий', () => {
    const r = rows([ev('1.9', 'half_win'), ev('2', 'half_lose'), ev('3', 'void')], '100')
    // эффективные: 1,45; 0,5; 1
    expect(r.rows.map((x) => x.payout.toFixed(2))).toEqual(['50.00', '145.00', '72.50'])
  })

  it('округляет только итог, половина вверх', () => {
    const r = rows([ev('1.01', 'win'), ev('1.01', 'win')], '0.5')
    expect(r.rows[0]!.payout.toFixed(2)).toBe('0.51')
  })

  it('ошибки параметров', () => {
    expect(expressIfOneVoided([ev('2', 'win')], D('100'))).toEqual({
      ok: false,
      error: 'too_few_events',
    })
    expect(expressIfOneVoided([ev('2', 'win'), ev('2', 'win')], D('0'))).toEqual({
      ok: false,
      error: 'invalid_stake',
    })
  })
})

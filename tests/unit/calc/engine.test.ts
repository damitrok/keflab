import { describe, expect, it } from 'vitest'
import {
  D,
  betShape,
  binomial,
  calcExpress,
  calcSingles,
  calcSystem,
  combinations,
  effectiveOdds,
  elementarySymmetric,
  exactPayout,
  scenarios,
  toMoney,
  type BetEvent,
  type BetShape,
  type Decimal,
  type EventStatus,
  type Settlement,
} from '../../../app/lib/calc'

const ev = (odds: string, status: EventStatus = 'win'): BetEvent => ({ odds: D(odds), status })

function settled(s: Settlement): { payout: string; profit: string } {
  if (!s.settled) throw new Error('ожидался рассчитанный итог')
  return { payout: s.payout.toFixed(2), profit: s.profit.toFixed(2) }
}

function systemShape(n: number, k: number, stake: string): BetShape {
  const r = betShape('system', n, D(stake), { k })
  if (!r.ok) throw new Error(r.error)
  return r.shape
}

describe('приёмка шага 2 (точные значения из ТЗ)', () => {
  it('система 2 из 3, 3 000, 1,80 W, 2,10 W, 1,65 L → 3 780,00, прибыль 780,00', () => {
    const r = calcSystem([ev('1.80'), ev('2.10'), ev('1.65', 'lose')], 2, D('3000'))
    expect(r.ok && settled(r.settlement)).toEqual({ payout: '3780.00', profit: '780.00' })
  })

  it('то же, но третье событие — возврат → 7 680,00', () => {
    const r = calcSystem([ev('1.80'), ev('2.10'), ev('1.65', 'void')], 2, D('3000'))
    expect(r.ok && settled(r.settlement).payout).toBe('7680.00')
  })

  it('система 3 из 5, 1 000, все 2,00, выиграли 4 из 5 → 3 200,00', () => {
    const events = [ev('2.00'), ev('2.00'), ev('2.00'), ev('2.00'), ev('2.00', 'lose')]
    const r = calcSystem(events, 3, D('1000'))
    expect(r.ok && settled(r.settlement).payout).toBe('3200.00')
  })

  it('экспресс на 100: 1,90 ½ выигрыша и 2,00 выигрыш → 290,00', () => {
    const r = calcExpress([ev('1.90', 'half_win'), ev('2.00')], D('100'))
    expect(r.ok && settled(r.settlement).payout).toBe('290.00')
  })

  it('экспресс на 100: 2,00 ½ проигрыша и 1,50 выигрыш → 75,00', () => {
    const r = calcExpress([ev('2.00', 'half_lose'), ev('1.50')], D('100'))
    expect(r.ok && settled(r.settlement)).toEqual({ payout: '75.00', profit: '-25.00' })
  })

  it('система 2 из 3, 100, 1,5 / 2,0 / 3,0, все выиграли → ровно 450,00, а не 449,96', () => {
    const r = calcSystem([ev('1.5'), ev('2.0'), ev('3.0')], 2, D('100'))
    expect(r.ok && settled(r.settlement).payout).toBe('450.00')
    expect(r.ok && r.shape.unevenSplit).toBe(true)
  })

  it('система 2 из 3, 300, все три — возвраты → 300,00', () => {
    const events = [ev('1.5', 'void'), ev('2.0', 'void'), ev('3.0', 'void')]
    const r = calcSystem(events, 2, D('300'))
    expect(r.ok && settled(r.settlement)).toEqual({ payout: '300.00', profit: '0.00' })
  })

  it('сценарии 3 из 5, 1 000, 1,5 1,8 2,0 2,2 2,5 → 3: 540–1 100, 4: 2 586–3 782, 5: 7 826', () => {
    const odds = ['1.5', '1.8', '2.0', '2.2', '2.5']
    const sc = scenarios(
      systemShape(5, 3, '1000'),
      odds.map((o) => ev(o, 'pending')),
    )
    const row = (m: number) => {
      const r = sc.rows[m]!
      return [r.min.toFixed(2), r.max.toFixed(2)]
    }
    expect(row(3)).toEqual(['540.00', '1100.00'])
    expect(row(4)).toEqual(['2586.00', '3782.00'])
    expect(row(5)).toEqual(['7826.00', '7826.00'])
    expect(row(0)).toEqual(['0.00', '0.00'])
    expect(row(2)).toEqual(['0.00', '0.00'])
    // При 3 зашедших окупается только лучший случай (1 100 ≥ 1 000), при 4 — любой.
    expect(sc.breakEvenMin).toBe(4)
    expect(sc.breakEvenMax).toBe(3)
  })

  it('сценарии 8 из 16 считаются быстрее 200 мс', () => {
    const odds = Array.from({ length: 16 }, (_, i) => `${1 + (i + 1) * 0.37}`.slice(0, 6))
    const events = odds.map((o) => ev(o, 'pending'))
    const start = performance.now()
    const sc = scenarios(systemShape(16, 8, '1000'), events)
    const elapsed = performance.now() - start
    expect(sc.rows).toHaveLength(17)
    expect(elapsed).toBeLessThan(200)
  })
})

describe('сценарии и крайние случаи шага 2', () => {
  it('все события — возвраты: возврат равен ставке (экспресс, система, одиночные)', () => {
    const events = [ev('1.7', 'void'), ev('2.3', 'void'), ev('4.1', 'void'), ev('1.2', 'void')]
    for (const r of [
      calcExpress(events, D('777.77')),
      calcSystem(events, 3, D('777.77')),
      calcSingles(events, D('777.77')),
    ]) {
      expect(r.ok && settled(r.settlement)).toEqual({ payout: '777.77', profit: '0.00' })
    }
  })

  it('все события проиграли: возврат 0, прибыль — минус ставка', () => {
    const events = [ev('1.7', 'lose'), ev('2.3', 'lose'), ev('4.1', 'lose')]
    for (const r of [
      calcExpress(events, D('500')),
      calcSystem(events, 2, D('500')),
      calcSingles(events, D('500')),
    ]) {
      expect(r.ok && settled(r.settlement)).toEqual({ payout: '0.00', profit: '-500.00' })
    }
  })

  it('половина выигрыша при коэффициенте 1,01 → эффективный 1,005 без округления', () => {
    expect(effectiveOdds(D('1.01'), 'half_win')!.toString()).toBe('1.005')
  })

  it('«1,855» участвует в расчёте как есть, без округления до сотых', () => {
    const r = calcExpress([ev('1.855'), ev('2')], D('1000'))
    expect(r.ok && settled(r.settlement).payout).toBe('3710.00')
  })

  it('эффективные коэффициенты по всем статусам', () => {
    const o = D('2.4')
    expect(effectiveOdds(o, 'win')!.toString()).toBe('2.4')
    expect(effectiveOdds(o, 'lose')!.toString()).toBe('0')
    expect(effectiveOdds(o, 'void')!.toString()).toBe('1')
    expect(effectiveOdds(o, 'half_win')!.toString()).toBe('1.7')
    expect(effectiveOdds(o, 'half_lose')!.toString()).toBe('0.5')
    expect(effectiveOdds(o, 'pending')).toBeNull()
  })

  it('купон ещё играется: итог «ещё не рассчитан», сценарии перебирают только pending', () => {
    // Два рассчитаны (2,00 выиграл, 1,80 вернули), три ждём. Система 3 из 5, 1 000.
    const events = [
      ev('2.00', 'win'),
      ev('1.80', 'void'),
      ev('1.5', 'pending'),
      ev('2.5', 'pending'),
      ev('3.0', 'pending'),
    ]
    const r = calcSystem(events, 3, D('1000'))
    expect(r.ok && r.settlement).toEqual({ settled: false, pendingCount: 3 })
    // В каждой комбинации 3 из 5 есть несыгравшее событие — выплат по строкам нет.
    expect(r.ok && r.rows.filter((row) => row.payout === null)).toHaveLength(10)

    const sc = scenarios(systemShape(5, 3, '1000'), events)
    expect(sc.pendingCount).toBe(3)
    expect(sc.rows.map((row) => row.wins)).toEqual([0, 1, 2, 3])
    // Ни одного зашедшего из трёх: все комбинации содержат проигрыш → 0.
    expect(sc.rows[0]!.min.toFixed(2)).toBe('0.00')
    // Один зашёл: из всех комбинаций выживает только {2,00; 1,80→1; x}: 100 × 2 × x.
    expect([sc.rows[1]!.min.toFixed(2), sc.rows[1]!.max.toFixed(2)]).toEqual(['300.00', '600.00'])
    // Все три зашли — совпадает с прямым расчётом при всех выигрышах.
    const allWin = calcSystem(
      events.map((e) => (e.status === 'pending' ? { ...e, status: 'win' as const } : e)),
      3,
      D('1000'),
    )
    expect(allWin.ok && settled(allWin.settlement).payout).toBe(sc.rows[3]!.max.toFixed(2))
  })

  it('ставка не делится на комбинации ровно — флаг; делится — нет флага', () => {
    expect(systemShape(3, 2, '100').unevenSplit).toBe(true)
    expect(systemShape(3, 2, '300').unevenSplit).toBe(false)
    expect(systemShape(3, 2, '0.03').unevenSplit).toBe(false)
    expect(systemShape(3, 2, '0.04').unevenSplit).toBe(true)
  })

  it('ставка на одну комбинацию: общая ставка = ставка × C(N, K)', () => {
    const events = [ev('1.80'), ev('2.10'), ev('1.65', 'lose')]
    const r = calcSystem(events, 2, D('1000'), 'per_combination')
    expect(r.ok && r.shape.totalStake.toString()).toBe('3000')
    expect(r.ok && r.shape.unevenSplit).toBe(false)
    expect(r.ok && settled(r.settlement)).toEqual({ payout: '3780.00', profit: '780.00' })
  })

  it('одиночные: ставка делится поровну на N событий', () => {
    const r = calcSingles([ev('2.0'), ev('3.0', 'lose'), ev('1.5', 'void')], D('300'))
    // 100 × 2 + 0 + 100 × 1 = 300
    expect(r.ok && settled(r.settlement)).toEqual({ payout: '300.00', profit: '0.00' })
    const odd = calcSingles([ev('1.5'), ev('2.0'), ev('3.0')], D('100'))
    // 100/3 × 6,5 = 216,666… → 216,67
    expect(odd.ok && settled(odd.settlement).payout).toBe('216.67')
    expect(odd.ok && odd.shape.unevenSplit).toBe(true)
  })

  it('разбивка по комбинациям: номера, события, коэффициенты, ставки, выплаты', () => {
    const r = calcSystem([ev('1.80'), ev('2.10'), ev('1.65', 'lose')], 2, D('3000'))
    if (!r.ok) throw new Error(r.error)
    expect(
      r.rows.map((row) => [
        row.index,
        row.events,
        row.odds.toString(),
        row.effectiveOdds!.toString(),
        row.stake.toString(),
        row.payout!.toFixed(2),
      ]),
    ).toEqual([
      [1, [0, 1], '3.78', '3.78', '1000', '3780.00'],
      [2, [0, 2], '2.97', '0', '1000', '0.00'],
      [3, [1, 2], '3.465', '0', '1000', '0.00'],
    ])
  })

  it('огромный итог: 16 событий по 1000 не падает и считается точно', () => {
    const events = Array.from({ length: 16 }, () => ev('1000'))
    const r = calcExpress(events, D('10000000'))
    expect(r.ok && settled(r.settlement).payout).toBe(`1${'0'.repeat(55)}.00`)
    const sys = calcSystem(events, 15, D('10000000'))
    // C(16,15)=16 комбинаций по 10^45, ставка на комбинацию 625 000.
    expect(sys.ok && settled(sys.settlement).payout).toBe(`1${'0'.repeat(52)}.00`)
  })
})

describe('валидация параметров', () => {
  const three = [ev('2'), ev('2'), ev('2')]

  it('система: 2 ≤ K < N ≤ 16', () => {
    expect(calcSystem(three, 3, D('100'))).toEqual({ ok: false, error: 'invalid_system_size' })
    expect(calcSystem(three, 1, D('100'))).toEqual({ ok: false, error: 'invalid_system_size' })
    expect(calcSystem(three, 2.5, D('100'))).toEqual({ ok: false, error: 'invalid_system_size' })
    expect(calcSystem([ev('2'), ev('2')], 1, D('100'))).toEqual({
      ok: false,
      error: 'too_few_events',
    })
    const seventeen = Array.from({ length: 17 }, () => ev('2'))
    expect(calcSystem(seventeen, 8, D('100'))).toEqual({ ok: false, error: 'too_many_events' })
  })

  it('экспресс — от 2 событий, одиночные — от 1, максимум 16', () => {
    expect(calcExpress([ev('2')], D('100'))).toEqual({ ok: false, error: 'too_few_events' })
    expect(calcSingles([], D('100'))).toEqual({ ok: false, error: 'too_few_events' })
    expect(calcSingles([ev('2')], D('100')).ok).toBe(true)
    const seventeen = Array.from({ length: 17 }, () => ev('2'))
    expect(calcExpress(seventeen, D('100'))).toEqual({ ok: false, error: 'too_many_events' })
  })

  it('ставка должна быть больше нуля', () => {
    expect(calcExpress(three, D('0'))).toEqual({ ok: false, error: 'invalid_stake' })
    expect(calcSystem(three, 2, D('-1'))).toEqual({ ok: false, error: 'invalid_stake' })
  })
})

describe('комбинаторика', () => {
  it('C(N, K) и список сочетаний', () => {
    expect(binomial(16, 8)).toBe(12870)
    expect(binomial(5, 3)).toBe(10)
    expect(binomial(3, 4)).toBe(0)
    expect(binomial(3, -1)).toBe(0)
    expect(combinations(4, 2)).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ])
    expect(combinations(3, 4)).toEqual([])
    expect(combinations(16, 8)).toHaveLength(12870)
  })

  it('e_k совпадает с прямой суммой произведений по всем сочетаниям', () => {
    const values = ['1.5', '1.8', '2.0', '2.2', '2.5', '3.1'].map((v) => D(v))
    for (let k = 0; k <= values.length; k++) {
      const brute = combinations(values.length, k).reduce(
        (sum, idx) => sum.plus(idx.reduce((p, i) => p.times(values[i]!), D('1'))),
        D('0'),
      )
      expect(elementarySymmetric(values, k).toString()).toBe(brute.toString())
    }
    expect(elementarySymmetric(values, 7).toString()).toBe('0')
  })
})

describe('сценарии против полного перебора подмножеств', () => {
  // Детерминированный генератор, чтобы тест был воспроизводимым.
  let seed = 42
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
  const randomOdds = () => (1.01 + Math.floor(rand() * 500) / 100).toFixed(2)

  function bruteForce(s: BetShape, events: BetEvent[]) {
    const pendingIdx = events.flatMap((e, i) => (e.status === 'pending' ? [i] : []))
    const rows: { min: Decimal; max: Decimal }[] = []
    for (let m = 0; m <= pendingIdx.length; m++) {
      let min: Decimal | null = null
      let max: Decimal | null = null
      for (const winners of combinations(pendingIdx.length, m)) {
        const won = new Set(winners.map((w) => pendingIdx[w]))
        const values = events.map((e, i) =>
          e.status === 'pending'
            ? won.has(i)
              ? e.odds
              : D('0')
            : effectiveOdds(e.odds, e.status)!,
        )
        const p = toMoney(exactPayout(s, values))
        if (min === null || p.lt(min)) min = p
        if (max === null || p.gt(max)) max = p
      }
      rows.push({ min: min!, max: max! })
    }
    return rows
  }

  it('совпадает на 40 случайных купонах (система, экспресс, одиночные, со статусами)', () => {
    const statuses: EventStatus[] = [
      'pending',
      'pending',
      'pending',
      'win',
      'lose',
      'void',
      'half_win',
      'half_lose',
    ]
    for (let t = 0; t < 40; t++) {
      const n = 3 + Math.floor(rand() * 6)
      const events = Array.from({ length: n }, () =>
        ev(randomOdds(), statuses[Math.floor(rand() * statuses.length)]!),
      )
      const k = 2 + Math.floor(rand() * (n - 2))
      for (const r of [
        betShape('system', n, D('1000'), { k }),
        betShape('express', n, D('1000')),
        betShape('singles', n, D('1000')),
      ]) {
        if (!r.ok) throw new Error(r.error)
        const fast = scenarios(r.shape, events).rows.map((x) => [
          x.min.toFixed(2),
          x.max.toFixed(2),
        ])
        const slow = bruteForce(r.shape, events).map((x) => [x.min.toFixed(2), x.max.toFixed(2)])
        expect(fast).toEqual(slow)
      }
    }
  })

  it('точка безубыточности null, если окупиться нельзя', () => {
    // Одно событие уже проиграло: выжить может только комбинация из двух 1,01.
    const sc = scenarios(systemShape(3, 2, '1000'), [
      ev('1.01', 'pending'),
      ev('1.01', 'pending'),
      ev('3.00', 'lose'),
    ])
    expect(sc.breakEvenMin).toBeNull()
    expect(sc.breakEvenMax).toBeNull()
  })
})

describe('замечания ревью денежной логики', () => {
  it('сумма строк может отличаться от итога — для интерфейса есть признак', () => {
    const differ = calcSystem([ev('1.85'), ev('1.85'), ev('1.85')], 2, D('100'))
    expect(differ.ok && settled(differ.settlement).payout).toBe('342.25')
    expect(differ.ok && differ.rows.reduce((s, r) => s.plus(r.payout!), D('0')).toFixed(2)).toBe(
      '342.24',
    )
    expect(differ.ok && differ.rowsDifferFromTotal).toBe(true)

    const same = calcSystem([ev('1.80'), ev('2.10'), ev('1.65', 'lose')], 2, D('3000'))
    expect(same.ok && same.rowsDifferFromTotal).toBe(false)

    const pending = calcSystem([ev('1.80', 'pending'), ev('2.10'), ev('1.65')], 2, D('3000'))
    expect(pending.ok && pending.rowsDifferFromTotal).toBe(false)
  })

  it('общая ставка в режиме «на комбинацию» не больше 10 000 000', () => {
    const events = Array.from({ length: 16 }, () => ev('2'))
    // C(16, 8) = 12 870; 777 × 12 870 = 9 999 990 — можно, 778 — уже нет.
    expect(calcSystem(events, 8, D('777'), 'per_combination').ok).toBe(true)
    expect(calcSystem(events, 8, D('778'), 'per_combination')).toEqual({
      ok: false,
      error: 'total_stake_too_large',
    })
  })

  it('сценарии отказываются считать по параметрам от другого числа событий', () => {
    const shape5 = systemShape(5, 3, '1000')
    const four = [ev('2', 'pending'), ev('2', 'pending'), ev('2', 'pending'), ev('2', 'pending')]
    expect(() => scenarios(shape5, four)).toThrow(/не соответствуют/)
  })
})

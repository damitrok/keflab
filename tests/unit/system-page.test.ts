import { describe, expect, it } from 'vitest'
import { SYSTEM_PAGES, systemPagePath } from '../../shared/site-pages'
import { D, binomial, calcSystem, scenarios, betShape, type BetEvent } from '../../app/lib/calc'
import { hasHandwrittenIntro, systemIntro } from '../../app/lib/system-intros'
import {
  EXAMPLE_ODDS,
  eventsWord,
  parseSystemParams,
  systemPath,
  systemPageData,
} from '../../app/lib/system-page'

const pages = SYSTEM_PAGES.map(({ k, n }) => systemPageData(k, n, SYSTEM_PAGES))
const FORBIDDEN = /выигрывайте|гарантир|лёгк|легк|заработ|прогноз/i

describe('systemPageData: все страницы', () => {
  it('21 страница', () => expect(pages).toHaveLength(21))

  it('адрес совпадает с реестром', () => {
    for (const { k, n } of SYSTEM_PAGES) expect(systemPath(k, n)).toBe(systemPagePath(k, n))
    expect(pages.map((p) => p.path)).toEqual(SYSTEM_PAGES.map((p) => systemPagePath(p.k, p.n)))
  })

  it('title до 47 символов и уникальны', () => {
    for (const p of pages) expect(p.title.length).toBeLessThanOrEqual(47)
    expect(new Set(pages.map((p) => p.title)).size).toBe(21)
  })

  it('description до 160 символов и уникальны', () => {
    for (const p of pages) expect(p.description.length).toBeLessThanOrEqual(160)
    expect(new Set(pages.map((p) => p.description)).size).toBe(21)
  })

  it('H1 уникальны и в формате ТЗ', () => {
    expect(new Set(pages.map((p) => p.h1)).size).toBe(21)
    expect(systemPageData(3, 5, SYSTEM_PAGES).h1).toBe('Система 3 из 5: калькулятор и расчёт')
  })

  it('соседи существуют в реестре и ссылаются на реальные страницы', () => {
    const paths = new Set(SYSTEM_PAGES.map(({ k, n }) => systemPagePath(k, n)))
    for (const p of pages) {
      expect(p.neighbors.length).toBeGreaterThan(0)
      for (const nb of p.neighbors) expect(paths.has(nb.path)).toBe(true)
      expect(p.comparison[0]!.current).toBe(true)
    }
    expect(systemPageData(2, 3, SYSTEM_PAGES).neighbors.map((x) => x.path)).toEqual([
      '/sistema-2-iz-4/',
    ])
  })

  it('число комбинаций, минимум побед и FAQ', () => {
    for (const p of pages) {
      expect(p.combinations).toBe(binomial(p.n, p.k))
      expect(p.minWins).toBe(p.k)
      expect(p.faq.length).toBeGreaterThanOrEqual(3)
      expect(p.faq.length).toBeLessThanOrEqual(5)
      expect(p.description).toContain(String(p.combinations))
    }
  })

  it('тексты без запрещённых слов', () => {
    for (const p of pages) {
      const text = [p.description, systemIntro(p), ...p.faq.map((f) => f.question + f.answer)]
      for (const t of text) expect(t).not.toMatch(FORBIDDEN)
    }
  })
})

describe('пример совпадает с calcSystem', () => {
  for (const { k, n } of SYSTEM_PAGES) {
    it(`${k} из ${n}`, () => {
      const wins = Math.min(k + 1, n)
      const events: BetEvent[] = Array.from({ length: n }, (_, i) => ({
        odds: D(EXAMPLE_ODDS[i]!),
        status: i < wins ? 'win' : 'lose',
      }))
      const r = calcSystem(events, k, D('1000'))
      if (!r.ok || !r.settlement.settled) throw new Error('нет расчёта')
      const ex = systemPageData(k, n, SYSTEM_PAGES).example
      expect(ex.payout).toBe(r.settlement.payout.toFixed(2))
      expect(ex.profit).toBe(r.settlement.profit.toFixed(2))
      expect(ex.wins).toBe(wins)
    })
  }

  it('снапшот: система 3 из 5', () => {
    const ex = systemPageData(3, 5, SYSTEM_PAGES).example
    // Ставка 1 000 ₽ на 10 комбинаций по 100 ₽; зашли первые 4 события.
    expect({
      stake: ex.stake,
      odds: ex.odds,
      wins: ex.wins,
      winningCombinations: ex.winningCombinations,
      payout: ex.payout,
      profit: ex.profit,
    }).toMatchInlineSnapshot(`
      {
        "odds": [
          "1,5",
          "1,8",
          "2",
          "2,2",
          "2,5",
        ],
        "payout": "2586.00",
        "profit": "1586.00",
        "stake": "1000",
        "winningCombinations": 4,
        "wins": 4,
      }
    `)
  })
})

describe('таблица зашедших событий совпадает со scenarios', () => {
  for (const { k, n } of SYSTEM_PAGES) {
    it(`${k} из ${n}`, () => {
      const table = systemPageData(k, n, SYSTEM_PAGES).winsTable
      expect(table).toHaveLength(n + 1)
      const shape = betShape('system', n, D('1000'), { k })
      if (!shape.ok) throw new Error('нет параметров')
      for (const odds of ['1.80', '2.00'] as const) {
        const sc = scenarios(
          shape.shape,
          Array.from({ length: n }, () => ({ odds: D(odds), status: 'pending' as const })),
        )
        sc.rows.forEach((row, m) => {
          const t = table[m]!
          expect(t.wins).toBe(m)
          expect(odds === '1.80' ? t.payoutLow : t.payoutHigh).toBe(row.min.toFixed(2))
          expect(row.min.toFixed(2)).toBe(row.max.toFixed(2))
        })
      }
      table.forEach((t) => expect(t.hasPayout).toBe(t.wins >= k))
    })
  }
})

describe('вводные абзацы', () => {
  const words = (s: string): number => s.split(/\s+/).filter(Boolean).length

  it('шесть популярных систем имеют отдельные тексты по 60-120 слов', () => {
    const popular = [
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 5],
      [4, 6],
    ] as const
    for (const [k, n] of popular) {
      expect(hasHandwrittenIntro(k, n)).toBe(true)
      const w = words(systemIntro(systemPageData(k, n, SYSTEM_PAGES)))
      expect(w).toBeGreaterThanOrEqual(60)
      expect(w).toBeLessThanOrEqual(120)
    }
  })

  it('остальные - шаблон с переменными, у каждой системы свой текст', () => {
    const texts = pages.map((p) => systemIntro(p))
    expect(new Set(texts).size).toBe(21)
    expect(hasHandwrittenIntro(5, 8)).toBe(false)
    expect(systemIntro(systemPageData(5, 8, SYSTEM_PAGES))).toContain('56 комбинаций')
  })
})

describe('parseSystemParams', () => {
  it('принимает только существующие страницы и целые без нулей', () => {
    expect(parseSystemParams('3', '5', SYSTEM_PAGES)).toEqual({ k: 3, n: 5 })
    const bad: [unknown, unknown][] = [
      ['3', '3'],
      ['1', '3'],
      ['2', '9'],
      ['02', '3'],
      ['3.0', '5'],
      ['x', '5'],
      [undefined, '5'],
      [['3'], '5'],
    ]
    for (const [k, n] of bad) expect(parseSystemParams(k, n, SYSTEM_PAGES)).toBeNull()
  })

  it('eventsWord', () => {
    expect([1, 2, 5, 11, 21].map(eventsWord)).toEqual([
      '1 событие',
      '2 события',
      '5 событий',
      '11 событий',
      '21 событие',
    ])
  })
})

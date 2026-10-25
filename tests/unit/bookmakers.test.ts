import { describe, expect, it } from 'vitest'
import {
  RULES_MAX_AGE_DAYS,
  bookmakerPagePath,
  daysBetween,
  isBookmakerPublishable,
  publishableBookmakers,
  todayMoscow,
} from '../../shared/bookmakers.ts'

// Только вымышленные БК: реальных данных здесь быть не должно (правило 3).
const rules = { stakeSplit: 'total' }
const TODAY = '2026-10-25'

function ago(days: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10)
}

describe('todayMoscow', () => {
  it('граница суток по Москве', () => {
    expect(todayMoscow(new Date('2026-10-24T21:00:00Z'))).toBe('2026-10-25')
    expect(todayMoscow(new Date('2026-10-24T20:59:59Z'))).toBe('2026-10-24')
  })
  it('без аргумента возвращает дату ГГГГ-ММ-ДД', () => {
    expect(todayMoscow()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('daysBetween', () => {
  it('считает дни', () => {
    expect(daysBetween('2026-10-25', '2026-10-25')).toBe(0)
    expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1)
    expect(daysBetween('2026-10-26', '2026-10-25')).toBe(-1)
  })
  it('через границу месяца и високосный год', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2025-10-25', '2026-10-25')).toBe(365)
  })
})

describe('isBookmakerPublishable', () => {
  const bk = (systemRules: unknown, checkedAt: string | null) => ({
    slug: 'test-bk',
    systemRules,
    checkedAt,
  })

  it('порог — 180 дней', () => {
    expect(RULES_MAX_AGE_DAYS).toBe(180)
  })
  it('правил нет — не публикуется', () => {
    expect(isBookmakerPublishable(bk(null, ago(1)), TODAY)).toBe(false)
  })
  it('даты проверки нет — не публикуется', () => {
    expect(isBookmakerPublishable(bk(rules, null), TODAY)).toBe(false)
  })
  it('проверено сегодня — публикуется', () => {
    expect(isBookmakerPublishable(bk(rules, TODAY), TODAY)).toBe(true)
  })
  it('ровно 180 дней — публикуется', () => {
    expect(isBookmakerPublishable(bk(rules, ago(180)), TODAY)).toBe(true)
  })
  it('181 день — не публикуется', () => {
    expect(isBookmakerPublishable(bk(rules, ago(181)), TODAY)).toBe(false)
  })
  it('дата в будущем — не публикуется', () => {
    expect(isBookmakerPublishable(bk(rules, ago(-1)), TODAY)).toBe(false)
  })
})

describe('publishableBookmakers', () => {
  it('оставляет только свежие записи с правилами и сохраняет порядок', () => {
    const list = [
      { slug: 'test-fresh', systemRules: rules, checkedAt: ago(10) },
      { slug: 'test-stale', systemRules: rules, checkedAt: ago(181) },
      { slug: 'test-norules', systemRules: null, checkedAt: ago(10) },
      { slug: 'test-edge', systemRules: rules, checkedAt: ago(180) },
      { slug: 'test-future', systemRules: rules, checkedAt: ago(-5) },
    ]
    expect(publishableBookmakers(list, TODAY).map((b) => b.slug)).toEqual([
      'test-fresh',
      'test-edge',
    ])
  })
  it('пустой список', () => {
    expect(publishableBookmakers([], TODAY)).toEqual([])
  })
})

describe('bookmakerPagePath', () => {
  it('адрес со слешем на конце', () => {
    expect(bookmakerPagePath('test-bk')).toBe('/bk/test-bk/kak-schitaetsya-sistema/')
  })
})

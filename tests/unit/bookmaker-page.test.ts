import { describe, expect, it } from 'vitest'
import {
  BK_DESCRIPTION_MAX,
  BK_TITLE_MAX,
  bookmakerDescription,
  bookmakerTitle,
  formatRuDate,
  isBelowMinStake,
  sourceText,
  stakeSplitText,
} from '../../app/lib/bookmaker-page'

describe('formatRuDate', () => {
  const expected = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]
  it.each(expected.map((m, i) => [i + 1, m] as const))('месяц %i — %s', (n, word) => {
    const mm = String(n).padStart(2, '0')
    expect(formatRuDate(`2026-${mm}-05`)).toBe(`5 ${word} 2026`)
  })
  it('двузначный день и невалидный ввод', () => {
    expect(formatRuDate('2026-10-12')).toBe('12 октября 2026')
    expect(formatRuDate('2026-13-01')).toBe('')
    expect(formatRuDate('12.10.2026')).toBe('')
  })
})

describe('sourceText', () => {
  it('убирает протокол, www, query, фрагмент и конечный слеш', () => {
    expect(sourceText('https://www.example.ru/rules/system/?a=1#x')).toBe('example.ru/rules/system')
    expect(sourceText('http://example.ru/')).toBe('example.ru')
    expect(sourceText('https://example.ru/rules')).toBe('example.ru/rules')
  })
  it('результат не содержит протокола', () => {
    expect(sourceText('HTTPS://Example.ru/a')).not.toMatch(/:\/\//)
  })
})

describe('title и description', () => {
  it('короткое имя', () => {
    expect(bookmakerTitle('Тест')).toBe('Как Тест считает систему ставок')
  })
  it('длина title не больше лимита для любых имён', () => {
    for (const len of [1, 5, 10, 15, 20, 30, 80, 300]) {
      const t = bookmakerTitle('Б'.repeat(len))
      expect(t.length).toBeLessThanOrEqual(BK_TITLE_MAX)
    }
  })
  it('длинное имя обрезается с многоточием', () => {
    const t = bookmakerTitle('Очень длинное название букмекерской компании')
    expect(t.length).toBeLessThanOrEqual(BK_TITLE_MAX)
    expect(t).toContain('…')
  })
  it('description не длиннее 160 для любых имён', () => {
    for (const len of [1, 10, 100, 400]) {
      const d = bookmakerDescription('Б'.repeat(len), '12 октября 2026')
      expect(d.length).toBeLessThanOrEqual(BK_DESCRIPTION_MAX)
    }
    expect(bookmakerDescription('Тест', '12 октября 2026')).toContain('12 октября 2026')
  })
})

describe('правила', () => {
  it('текст деления ставки', () => {
    expect(stakeSplitText('total')).toContain('на всю систему')
    expect(stakeSplitText('per_combination')).toContain('на одну комбинацию')
  })
  it('сравнение с минимумом точное', () => {
    expect(isBelowMinStake('9.99', '10')).toBe(true)
    expect(isBelowMinStake('10', '10')).toBe(false)
    expect(isBelowMinStake('0.1', '0.10')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  converterContent,
  dogonContent,
  marginContent,
  sumOddsContent,
  type SmallCalcContent,
} from '../../app/lib/small-calc-content'

const PAGES: [string, () => SmallCalcContent][] = [
  ['маржа', marginContent],
  ['сложение коэффициентов', sumOddsContent],
  ['догон', dogonContent],
  ['конвертер', converterContent],
]

const FORBIDDEN = [
  'гарантир',
  'без риска',
  'лёгкие деньги',
  'легкие деньги',
  'заработок',
  'заработа',
  'выигрывайте',
  'стратегия, которая работает',
  'верный способ',
  'прогноз',
]

/** Рендерящийся текст: лид, разделы и FAQ (без формы и таблиц). */
function visibleText(c: SmallCalcContent): string {
  const sections = c.sections.flatMap((s) => [s.heading, ...s.paragraphs])
  const faq = c.faq.flatMap((q) => [q.question, q.answer])
  return [c.lead, ...sections, ...faq].join(' ')
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

describe.each(PAGES)('текст страницы «%s»', (name, build) => {
  const content = build()
  const text = visibleText(content)

  it('300–600 слов', () => {
    const words = countWords(text)
    console.info(`слов (${name}): ${words}`)
    expect(words).toBeGreaterThanOrEqual(300)
    expect(words).toBeLessThanOrEqual(600)
  })

  it('FAQ из 3–5 вопросов', () => {
    expect(content.faq.length).toBeGreaterThanOrEqual(3)
    expect(content.faq.length).toBeLessThanOrEqual(5)
  })

  it('нет запрещённых слов и обещаний', () => {
    const lower = text.toLowerCase()
    for (const bad of FORBIDDEN) expect(lower).not.toContain(bad)
  })

  it('без незаполненных подстановок', () => {
    expect(text).not.toMatch(/undefined|NaN|\[object/)
  })
})

describe('числа в примерах берутся из движка', () => {
  it('маржа 1,90 и 1,90 — 5,26 %', () => {
    expect(visibleText(marginContent())).toContain('5,26')
  })

  it('конвертер: 2,5 = 3/2 = +150 = 40 %', () => {
    const text = visibleText(converterContent())
    for (const s of ['2,5', '3/2', '+150', '40']) expect(text).toContain(s)
  })

  it('догон: шанс восьми проигрышей подряд при 50 % — 0,39 %', () => {
    expect(visibleText(dogonContent())).toContain('0,39')
  })
})

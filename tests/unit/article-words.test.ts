import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  new URL('../../app/pages/chto-takoe-sistema-v-stavkah.vue', import.meta.url),
  'utf8',
)

/** Видимый текст статьи из шаблона: без таблиц, калькулятора, комментариев и крошек. */
export function articleText(source: string): string {
  const template = /<template>([\s\S]*)<\/template>\s*<style/.exec(source)?.[1] ?? ''
  return template
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(SystemTypesTable|SystemCalculator|CombinationsTable|Breadcrumbs)\b[^>]*?\/>/g, ' ')
    .replace(/<Breadcrumbs[\s\S]*?\/>/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' 0 ') // подстановка числа из движка — одно слово
    .replace(/<[^>]+>/g, ' ')
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

describe('статья «Что такое система в ставках»', () => {
  it('1000–1500 слов видимого текста без таблицы и калькулятора', () => {
    const words = countWords(articleText(SOURCE))
    console.info(`слов в статье: ${words}`)
    expect(words).toBeGreaterThanOrEqual(1000)
    expect(words).toBeLessThanOrEqual(1500)
  })

  it('один h1, обязательные h2, ссылки на оба калькулятора дважды, пометка TODO(text)', () => {
    expect(SOURCE.match(/<h1\b/g)).toHaveLength(1)
    for (const h of [
      'Что такое система',
      'Как делится ставка и считается выплата',
      'Таблица типов систем',
      'Как статусы влияют на расчёт',
      'Ошибки новичков',
      'Посчитайте свою систему',
    ]) {
      expect(SOURCE).toContain(`<h2>${h}</h2>`)
    }
    expect(SOURCE.match(/<NuxtLink to="\/">Калькулятор системы<\/NuxtLink>/g)).toHaveLength(2)
    expect(
      SOURCE.match(/<NuxtLink to="\/kalkulyator-ekspressa\/">Калькулятор экспресса<\/NuxtLink>/g),
    ).toHaveLength(2)
    expect(SOURCE).toContain('TODO(text): текст написан ИИ, вычитывает человек')
    expect(SOURCE).toContain(':share="false" :storage-key="null"')
  })

  it('нет запрещённых слов и обещаний', () => {
    const text = articleText(SOURCE).toLowerCase()
    for (const bad of [
      'выигрывайте',
      'гарантир',
      'лёгкие деньги',
      'легкие деньги',
      'заработок',
      'прогноз',
    ]) {
      expect(text).not.toContain(bad)
    }
  })
})

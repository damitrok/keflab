import { describe, expect, it } from 'vitest'
import { articleFaq } from '../../app/components/article/faq'
import { buildBreadcrumbList, buildFaqPage, buildWebApplication } from '../../app/lib/seo'

const SITE = 'https://keflab.ru'

describe('BreadcrumbList', () => {
  const ld = buildBreadcrumbList(
    [{ label: 'Главная', to: '/' }, { label: 'Реклама на сайте' }],
    SITE,
    '/reklama/',
  )
  const items = ld.itemListElement as { position: number; name: string; item: string }[]

  it('позиции с 1, адреса абсолютные', () => {
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(items.map((i) => i.position)).toEqual([1, 2])
    expect(items.map((i) => i.item)).toEqual(['https://keflab.ru/', 'https://keflab.ru/reklama/'])
    expect(items.map((i) => i.name)).toEqual(['Главная', 'Реклама на сайте'])
  })

  it('не дублирует слеш при siteUrl со слешем', () => {
    const l = buildBreadcrumbList([{ label: 'A', to: '/' }], 'https://keflab.ru/', '/x/')
    expect((l.itemListElement as { item: string }[])[0]!.item).toBe('https://keflab.ru/')
  })
})

describe('FAQPage', () => {
  it('строится из массива дословно', () => {
    const ld = buildFaqPage(articleFaq)
    const q = ld.mainEntity as {
      name: string
      acceptedAnswer: { text: string }
    }[]
    expect(ld['@type']).toBe('FAQPage')
    expect(q).toHaveLength(articleFaq.length)
    q.forEach((e, i) => {
      expect(e.name).toBe(articleFaq[i]!.question)
      expect(e.acceptedAnswer.text).toBe(articleFaq[i]!.answer)
    })
  })
})

describe('WebApplication', () => {
  it('бесплатное приложение без оценок', () => {
    const ld = buildWebApplication({ name: 'Калькулятор', description: 'Описание' }, SITE, '/')
    expect(ld).toMatchObject({
      '@type': 'WebApplication',
      url: 'https://keflab.ru/',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'ru',
      isAccessibleForFree: true,
      offers: { price: '0', priceCurrency: 'RUB' },
    })
    expect(ld).not.toHaveProperty('aggregateRating')
  })
})

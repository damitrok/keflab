import { describe, expect, it } from 'vitest'
import {
  allowlistSchema,
  bookmakersSchema,
  offerSchema,
  offersSchema,
  siteSchema,
} from '../../data/schema.ts'

const validOffer = {
  id: 'offer-1',
  bookmakerSlug: 'bk-1',
  advertiserName: 'ООО Тест',
  advertiserInn: '7707083893',
  erid: 'TEST-ERID',
  trackingUrl: 'https://example.ru/ref',
  title: 'Заголовок',
  conditionsShort: 'Условия',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  geo: ['RU'],
  placements: ['calc'],
}

const validBk = {
  slug: 'bk-1',
  name: 'БК',
  legalEntity: 'ООО БК',
  licenseInfo: 'Лицензия №1',
  systemRules: {
    stakeSplit: 'поровну',
    minStakePerCombination: '10',
    voidRule: 'a',
    halfRule: 'b',
    maxEvents: 12,
  },
  sourceUrl: 'https://example.ru/rules',
  checkedAt: '2026-05-01',
}

const validSite = {
  siteName: 'keflab.ru',
  siteUrl: 'https://keflab.ru',
  media: {
    registered: false,
    name: '',
    founder: '',
    editorInChief: '',
    email: '',
    phone: '',
    registrationNumber: '',
    registrationAuthority: '',
  },
  riskWarning: '',
  stopWords: [],
}

describe('пустые массивы', () => {
  it('допустимы', () => {
    expect(bookmakersSchema.safeParse([]).success).toBe(true)
    expect(offersSchema.safeParse([]).success).toBe(true)
    expect(allowlistSchema.safeParse({ domains: [] }).success).toBe(true)
  })
})

describe('offers', () => {
  it('принимает корректный оффер', () => {
    expect(offerSchema.safeParse(validOffer).success).toBe(true)
  })
  it.each(['erid', 'advertiserName', 'advertiserInn'])('требует %s', (field) => {
    const { [field]: _omit, ...rest } = validOffer as Record<string, unknown>
    expect(offerSchema.safeParse(rest).success).toBe(false)
    expect(offerSchema.safeParse({ ...validOffer, [field]: '  ' }).success).toBe(false)
  })
  it('проверяет ИНН: 10 или 12 цифр', () => {
    expect(offerSchema.safeParse({ ...validOffer, advertiserInn: '770708389300' }).success).toBe(
      true,
    )
    expect(offerSchema.safeParse({ ...validOffer, advertiserInn: '12345678901' }).success).toBe(
      false,
    )
    expect(offerSchema.safeParse({ ...validOffer, advertiserInn: '77070838ab' }).success).toBe(
      false,
    )
  })
  it('отвергает несуществующую дату и validFrom > validTo', () => {
    expect(offerSchema.safeParse({ ...validOffer, validFrom: '2026-02-30' }).success).toBe(false)
    expect(offerSchema.safeParse({ ...validOffer, validFrom: '2027-01-01' }).success).toBe(false)
  })
  it('отвергает опечатку в имени поля', () => {
    expect(offerSchema.safeParse({ ...validOffer, eridd: 'x' }).success).toBe(false)
  })
  it('отвергает дубли id', () => {
    expect(offersSchema.safeParse([validOffer, validOffer]).success).toBe(false)
  })
})

describe('bookmakers', () => {
  it('принимает корректную запись', () => {
    expect(bookmakersSchema.safeParse([validBk]).success).toBe(true)
  })
  it('отвергает плохие URL, дату и maxEvents', () => {
    expect(bookmakersSchema.safeParse([{ ...validBk, sourceUrl: 'not-url' }]).success).toBe(false)
    expect(bookmakersSchema.safeParse([{ ...validBk, checkedAt: '01.05.2026' }]).success).toBe(
      false,
    )
    expect(
      bookmakersSchema.safeParse([
        { ...validBk, systemRules: { ...validBk.systemRules, maxEvents: 0 } },
      ]).success,
    ).toBe(false)
  })
  it('отвергает дубли slug', () => {
    expect(bookmakersSchema.safeParse([validBk, validBk]).success).toBe(false)
  })
})

describe('allowlist', () => {
  it('принимает хосты', () => {
    expect(allowlistSchema.safeParse({ domains: ['example.ru', 'sub.example.com'] }).success).toBe(
      true,
    )
  })
  it.each(['https://example.ru', 'example.ru/path', 'Example.ru', 'example.ru:8080', 'localhost'])(
    'отвергает %s',
    (d) => {
      expect(allowlistSchema.safeParse({ domains: [d] }).success).toBe(false)
    },
  )
  it('отвергает дубли и лишние поля', () => {
    expect(allowlistSchema.safeParse({ domains: ['a.ru', 'a.ru'] }).success).toBe(false)
    expect(allowlistSchema.safeParse({ domains: [], extra: 1 }).success).toBe(false)
  })
})

describe('site', () => {
  it('принимает незарегистрированное СМИ с пустыми полями', () => {
    expect(siteSchema.safeParse(validSite).success).toBe(true)
  })
  it('при registered=true требует все поля', () => {
    const site = { ...validSite, media: { ...validSite.media, registered: true } }
    const res = siteSchema.safeParse(site)
    expect(res.success).toBe(false)
    expect(res.error?.issues.length).toBe(7)
  })
  it('при registered=true проверяет email', () => {
    const filled = {
      registered: true,
      name: 'a',
      founder: 'b',
      editorInChief: 'c',
      email: 'bad',
      phone: '+7',
      registrationNumber: '1',
      registrationAuthority: 'Роскомнадзор',
    }
    expect(siteSchema.safeParse({ ...validSite, media: filled }).success).toBe(false)
    expect(
      siteSchema.safeParse({ ...validSite, media: { ...filled, email: 'a@b.ru' } }).success,
    ).toBe(true)
  })
  it('отвергает опечатку в поле', () => {
    expect(siteSchema.safeParse({ ...validSite, stopWord: [] }).success).toBe(false)
  })
})

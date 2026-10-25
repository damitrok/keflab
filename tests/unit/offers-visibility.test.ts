import { describe, expect, it } from 'vitest'
import type { Offer } from '../../data/schema'
import { todayMoscow } from '../../shared/bookmakers'
import {
  buildRedirectUrl,
  findStopWords,
  hostAllowed,
  offerShowable,
  offerVisible,
  publicOffer,
} from '../../shared/offers'
import { countryFromHeaders, parseCountry } from '../../server/utils/geo'

const offer: Offer = {
  id: 'test-offer',
  bookmakerSlug: 'test-bk',
  advertiserName: 'Тестовый рекламодатель',
  advertiserInn: '1234567890',
  erid: 'TESTerid0001',
  trackingUrl: 'https://example.com/promo?utm=1',
  title: 'Тестовое предложение',
  conditionsShort: 'Условия.',
  validFrom: '2026-10-01',
  validTo: '2026-10-25',
  geo: ['RU'],
  placements: ['calc-result'],
}
const ctx = {
  today: '2026-10-25',
  enabled: true,
  country: 'RU' as string | null,
  placement: 'calc-result' as const,
}

describe('offerVisible', () => {
  it('виден, когда выполнены все условия', () => {
    expect(offerVisible(offer, ctx)).toEqual({ visible: true })
  })
  it('выключатель выключен (или СМИ не зарегистрировано) → disabled', () => {
    expect(offerVisible(offer, { ...ctx, enabled: false })).toEqual({
      visible: false,
      reason: 'disabled',
    })
  })
  it.each(['', '   ', '\t'])('пустой erid «%s» → no_erid', (erid) => {
    expect(offerVisible({ ...offer, erid }, ctx).reason).toBe('no_erid')
  })
  it('пустой рекламодатель → no_advertiser', () => {
    expect(offerVisible({ ...offer, advertiserName: '  ' }, ctx).reason).toBe('no_advertiser')
  })
  it('пустой ИНН → no_inn', () => {
    expect(offerVisible({ ...offer, advertiserInn: '' }, ctx).reason).toBe('no_inn')
  })
  it('validTo = сегодня → виден (включительно)', () => {
    expect(offerVisible(offer, ctx).visible).toBe(true)
  })
  it('validTo вчера → expired', () => {
    expect(offerVisible({ ...offer, validTo: '2026-10-24' }, ctx).reason).toBe('expired')
  })
  it('validFrom завтра → not_started', () => {
    expect(offerVisible({ ...offer, validFrom: '2026-10-26' }, ctx).reason).toBe('not_started')
  })
  it('граница суток по Москве: 21:00 UTC уже следующий день', () => {
    const before = todayMoscow(new Date('2026-10-25T20:59:59Z'))
    const after = todayMoscow(new Date('2026-10-25T21:00:00Z'))
    expect(offerVisible(offer, { ...ctx, today: before }).visible).toBe(true)
    expect(after).toBe('2026-10-26')
    expect(offerVisible(offer, { ...ctx, today: after }).reason).toBe('expired')
  })
  it('страна неизвестна → unknown_country', () => {
    expect(offerVisible(offer, { ...ctx, country: null }).reason).toBe('unknown_country')
  })
  it('страна US → geo', () => {
    expect(offerVisible(offer, { ...ctx, country: 'US' }).reason).toBe('geo')
  })
  it('другое место показа → placement', () => {
    expect(offerVisible({ ...offer, placements: ['other'] }, ctx).reason).toBe('placement')
  })
})

describe('publicOffer', () => {
  it('не отдаёт trackingUrl, гео и места показа', () => {
    const p = publicOffer(offer)
    expect(Object.keys(p).sort()).toEqual(
      [
        'advertiserInn',
        'advertiserName',
        'bookmakerSlug',
        'conditionsShort',
        'erid',
        'id',
        'title',
        'validTo',
      ].sort(),
    )
    expect(JSON.stringify(p)).not.toContain('example.com')
  })
})

describe('buildRedirectUrl', () => {
  it('добавляет erid', () => {
    expect(buildRedirectUrl('https://example.com/a', 'E1')).toBe('https://example.com/a?erid=E1')
  })
  it('заменяет существующий erid и сохраняет остальное', () => {
    expect(buildRedirectUrl('https://example.com/a?x=1&erid=OLD&y=2#frag', 'E1')).toBe(
      'https://example.com/a?x=1&erid=E1&y=2#frag',
    )
  })
})

describe('hostAllowed', () => {
  const list = ['example.com']
  it('точный домен и поддомен', () => {
    expect(hostAllowed('https://example.com/x', list)).toBe(true)
    expect(hostAllowed('https://go.example.com/x', list)).toBe(true)
  })
  it('чужой домен, похожий суффикс, не http', () => {
    expect(hostAllowed('https://evil.net/', list)).toBe(false)
    expect(hostAllowed('https://notexample.com/', list)).toBe(false)
    expect(hostAllowed('https://example.com.evil.net/', list)).toBe(false)
    expect(hostAllowed('javascript:alert(1)', list)).toBe(false)
    expect(hostAllowed('не url', list)).toBe(false)
  })
  it('пустой allowlist — всё запрещено', () => {
    expect(hostAllowed('https://example.com/', [])).toBe(false)
  })
})

describe('findStopWords', () => {
  it('регистр и ё не важны', () => {
    expect(findStopWords('ЛЕГКИЕ деньги!', ['лёгкие деньги'])).toEqual(['лёгкие деньги'])
    expect(findStopWords('Спокойный текст', ['без риска'])).toEqual([])
  })
})

describe('страна из заголовка Nginx', () => {
  it('без GEO_HEADER_TRUSTED=true → null', () => {
    expect(parseCountry('RU', undefined)).toBeNull()
    expect(parseCountry('RU', 'false')).toBeNull()
  })
  it('доверенный заголовок: только две заглавные буквы', () => {
    expect(parseCountry('RU', 'true')).toBe('RU')
    expect(parseCountry('ru', 'true')).toBeNull()
    expect(parseCountry('RUS', 'true')).toBeNull()
    expect(parseCountry('', 'true')).toBeNull()
    expect(parseCountry(undefined, 'true')).toBeNull()
    expect(parseCountry(['RU', 'US'], 'true')).toBeNull()
  })
  it('X-Forwarded-For не читается', () => {
    expect(
      countryFromHeaders({ 'x-forwarded-for': 'RU' }, { GEO_HEADER_TRUSTED: 'true' }),
    ).toBeNull()
    expect(countryFromHeaders({ 'x-keflab-country': 'RU' }, { GEO_HEADER_TRUSTED: 'true' })).toBe(
      'RU',
    )
  })
})

describe('offerShowable', () => {
  const base = {
    today: '2026-10-25',
    enabled: true,
    country: 'RU',
    placement: 'calc-result' as const,
  }
  it('домен вне allowlist → скрыт (domain)', () => {
    expect(offerShowable(offer, { ...base, allowlist: ['example.org'] })).toEqual({
      visible: false,
      reason: 'domain',
    })
  })
  it('домен в allowlist → виден; остальные причины сохраняются', () => {
    expect(offerShowable(offer, { ...base, allowlist: ['example.com'] }).visible).toBe(true)
    expect(
      offerShowable(offer, { ...base, allowlist: ['example.com'], country: 'US' }).reason,
    ).toBe('geo')
  })
})

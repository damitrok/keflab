import { describe, expect, it } from 'vitest'
import type { Offer } from '../../data/schema'
import { decideGo } from '../../shared/offers'

const offer: Offer = {
  id: 'test-offer',
  bookmakerSlug: 'test-bk',
  advertiserName: 'Тестовый рекламодатель',
  advertiserInn: '1234567890',
  erid: 'TESTerid0001',
  trackingUrl: 'https://example.com/promo?erid=old',
  title: 'Тест',
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
  allowlist: ['example.com'],
}

describe('decideGo', () => {
  it('всё в порядке → 302 с erid в адресе', () => {
    expect(decideGo(offer, ctx)).toEqual({
      status: 302,
      location: 'https://example.com/promo?erid=TESTerid0001',
    })
  })
  it('неизвестный id → 404', () => {
    expect(decideGo(undefined, ctx)).toEqual({ status: 404, reason: 'unknown_id' })
  })
  it('домен вне allowlist → 404', () => {
    expect(decideGo(offer, { ...ctx, allowlist: ['example.org'] })).toEqual({
      status: 404,
      reason: 'domain',
    })
  })
  it('выключатель выключен → 404', () => {
    expect(decideGo(offer, { ...ctx, enabled: false }).status).toBe(404)
  })
  it('срок кончился → 410 без редиректа', () => {
    const d = decideGo({ ...offer, validTo: '2026-10-24' }, ctx)
    expect(d).toEqual({ status: 410, reason: 'expired' })
  })
  it('ещё не начался → 410', () => {
    expect(decideGo({ ...offer, validFrom: '2026-10-26' }, ctx).status).toBe(410)
  })
  it('страна не RU или неизвестна → 404, даже при истёкшем сроке', () => {
    expect(decideGo(offer, { ...ctx, country: 'US' }).status).toBe(404)
    expect(decideGo(offer, { ...ctx, country: null }).status).toBe(404)
    expect(decideGo({ ...offer, validTo: '2026-10-01' }, { ...ctx, country: null }).status).toBe(
      404,
    )
  })
  it('нет erid / рекламодателя / ИНН → 404', () => {
    expect(decideGo({ ...offer, erid: ' ' }, ctx).status).toBe(404)
    expect(decideGo({ ...offer, advertiserName: '' }, ctx).status).toBe(404)
    expect(decideGo({ ...offer, advertiserInn: '' }, ctx).status).toBe(404)
  })
})

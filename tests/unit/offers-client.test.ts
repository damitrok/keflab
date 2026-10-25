import { describe, expect, it, vi } from 'vitest'
import {
  createImpressionTracker,
  createOffersCache,
  isOfferActive,
  msUntilMoscowMidnight,
  fetchOffers,
  parseGeoResponse,
  sendImpression,
} from '../../app/lib/offers-client'
import { GEO_TIMEOUT_MS } from '#shared/offers-api'

const offer = {
  id: 'test-1',
  bookmakerSlug: 'test',
  advertiserName: 'ООО Тест',
  advertiserInn: '7700000000',
  erid: 'Test-erid',
  title: 'Заголовок',
  conditionsShort: 'Условия',
  validTo: '2099-12-31',
}
const ok = { country: 'RU', offersEnabled: true, offers: [offer] }
const reply = (body: unknown, init?: ResponseInit) => async () =>
  new Response(JSON.stringify(body), init)

describe('parseGeoResponse', () => {
  it('нормальный ответ -> офферы', () => expect(parseGeoResponse(ok)).toEqual([offer]))
  it('выключатель выключен -> пусто', () =>
    expect(parseGeoResponse({ ...ok, offersEnabled: false })).toEqual([]))
  it('не Россия или страна неизвестна -> пусто', () => {
    expect(parseGeoResponse({ ...ok, country: 'DE' })).toEqual([])
    expect(parseGeoResponse({ ...ok, country: null })).toEqual([])
  })
  it('не тот формат -> пусто', () => {
    for (const v of [null, 'x', 1, [], {}, { ...ok, offers: 'a' }]) {
      expect(parseGeoResponse(v)).toEqual([])
    }
  })
  it('битые офферы отбрасываются, остальные остаются', () => {
    const bad = { ...offer, erid: '' }
    const evil = { ...offer, id: '../x' }
    expect(parseGeoResponse({ ...ok, offers: [bad, evil, offer] })).toEqual([offer])
  })
})

describe('fetchOffers', () => {
  it('запрашивает нужное место', async () => {
    const f = vi.fn(reply(ok))
    expect(await fetchOffers('calc-result', f)).toEqual([offer])
    expect(f.mock.calls[0]?.[0]).toBe('/api/geo?placement=calc-result')
  })
  it('неизвестное место -> пусто, без запроса', async () => {
    const f = vi.fn(reply(ok))
    // @ts-expect-error проверка неверного значения
    expect(await fetchOffers('sidebar', f)).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
  it('ошибка сервера, сеть, не JSON -> пусто', async () => {
    expect(await fetchOffers('calc-result', reply(ok, { status: 500 }))).toEqual([])
    expect(
      await fetchOffers('calc-result', async () => {
        throw new Error('net')
      }),
    ).toEqual([])
    expect(await fetchOffers('calc-result', async () => new Response('<html>'))).toEqual([])
  })
  it('нет ответа за таймаут -> пусто', async () => {
    vi.useFakeTimers()
    const hang = (_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) =>
        init.signal?.addEventListener('abort', () => rej(new Error('abort'))),
      )
    const p = fetchOffers('calc-result', hang)
    await vi.advanceTimersByTimeAsync(GEO_TIMEOUT_MS + 1)
    expect(await p).toEqual([])
    vi.useRealTimers()
  })
})

describe('показы', () => {
  it('один раз на erid', () => {
    const send = vi.fn()
    const track = createImpressionTracker(send)
    expect(track('a')).toBe(true)
    expect(track('a')).toBe(false)
    expect(track('b')).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
  })
  it('sendBeacon, при отказе — fetch keepalive без cookie', async () => {
    const beacon = vi.fn(() => false)
    const f = vi.fn(async () => new Response(''))
    sendImpression('e1', { sendBeacon: beacon, fetch: f })
    expect(beacon).toHaveBeenCalledWith('/api/stat', expect.any(Blob))
    const init = f.mock.calls[0]?.[1] as RequestInit
    expect(init.keepalive).toBe(true)
    expect(init.credentials).toBe('omit')
    expect(JSON.parse(init.body as string)).toEqual({ erid: 'e1', event: 'impression' })
  })
  it('не бросает без sendBeacon и fetch', () => {
    expect(() => sendImpression('e', {})).not.toThrow()
  })
})

describe('кеш с TTL', () => {
  it('повторный запрос после 60 с, раньше — из кеша', async () => {
    let t = 0
    const load = vi.fn(async () => [offer])
    const get = createOffersCache(load, () => t, 60_000)
    await get('calc-result')
    t = 59_999
    await get('calc-result')
    expect(load).toHaveBeenCalledTimes(1)
    t = 60_000
    await get('calc-result')
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('validTo по Москве', () => {
  const o = { validTo: '2026-10-25' }
  it('последний день включительно, с полуночи МСК скрыт', () => {
    // 2026-10-25 23:59:59 МСК = 20:59:59Z
    expect(isOfferActive(o, new Date('2026-10-25T20:59:59Z'))).toBe(true)
    // 2026-10-26 00:00:00 МСК = 21:00:00Z
    expect(isOfferActive(o, new Date('2026-10-25T21:00:00Z'))).toBe(false)
  })
  it('до полуночи МСК', () => {
    expect(msUntilMoscowMidnight(new Date('2026-10-25T20:59:59Z'))).toBe(1000)
    expect(msUntilMoscowMidnight(new Date('2026-10-25T09:00:00Z'))).toBe(12 * 3_600_000)
  })
})

// Клиентская часть офферов (шаг 13): чистые функции без Vue.
// Любая ошибка сети, формата или страны -> офферов нет, страница работает.
import {
  GEO_TIMEOUT_MS,
  OFFER_PLACEMENTS,
  type GeoResponse,
  type OfferPlacement,
  type PublicOffer,
} from '#shared/offers-api'
import { todayMoscow } from '#shared/bookmakers'

export const OFFERS_COUNTRY = 'RU'

export function isPlacement(value: string): value is OfferPlacement {
  return (OFFER_PLACEMENTS as readonly string[]).includes(value)
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

export function isPublicOffer(v: unknown): v is PublicOffer {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    isStr(o.id) &&
    /^[A-Za-z0-9_-]+$/.test(o.id) &&
    isStr(o.bookmakerSlug) &&
    isStr(o.advertiserName) &&
    isStr(o.advertiserInn) &&
    isStr(o.erid) &&
    isStr(o.title) &&
    typeof o.conditionsShort === 'string' &&
    isStr(o.validTo)
  )
}

/** Из ответа сервера — список офферов к показу; всё сомнительное -> []. */
export function parseGeoResponse(data: unknown): PublicOffer[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  if (d.offersEnabled !== true) return []
  if (d.country !== OFFERS_COUNTRY) return []
  if (!Array.isArray(d.offers)) return []
  return d.offers.filter(isPublicOffer)
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

/** Запрос /api/geo с таймаутом; не бросает исключений. */
export async function fetchOffers(
  placement: OfferPlacement,
  fetcher: FetchLike = (url, init) => fetch(url, init),
  timeoutMs: number = GEO_TIMEOUT_MS,
): Promise<PublicOffer[]> {
  if (!isPlacement(placement)) return []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetcher(`/api/geo?placement=${encodeURIComponent(placement)}`, {
      signal: controller.signal,
      credentials: 'omit',
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return []
    const json: unknown = await res.json()
    return parseGeoResponse(json)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

export type { GeoResponse }

/** Показ засчитывается один раз на erid за загрузку страницы. */
export function createImpressionTracker(send: (erid: string) => void) {
  const seen = new Set<string>()
  return (erid: string): boolean => {
    if (seen.has(erid)) return false
    seen.add(erid)
    send(erid)
    return true
  }
}

export interface BeaconEnv {
  sendBeacon?: (url: string, data: Blob | string) => boolean
  fetch?: FetchLike
}

/** Счётчик показа в /api/stat: text/plain, без cookie. Не бросает исключений. */
export function sendImpression(erid: string, env: BeaconEnv): void {
  const body = JSON.stringify({ erid, event: 'impression' })
  try {
    if (env.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
      if (env.sendBeacon('/api/stat', blob)) return
    }
  } catch {
    // запасной путь ниже
  }
  try {
    void env
      .fetch?.('/api/stat', {
        method: 'POST',
        body,
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        keepalive: true,
        credentials: 'omit',
      })
      .catch(() => {})
  } catch {
    // статистика не должна ломать страницу
  }
}

/** Ответ /api/geo не живёт дольше этого: выключатель и сроки меняются. */
export const OFFERS_CACHE_TTL_MS = 60_000

/** Кеш запросов по месту с TTL; сбой тоже кешируется (на тот же срок). */
export function createOffersCache(
  load: (placement: OfferPlacement) => Promise<PublicOffer[]>,
  now: () => number = () => Date.now(),
  ttlMs: number = OFFERS_CACHE_TTL_MS,
) {
  const entries = new Map<OfferPlacement, { at: number; promise: Promise<PublicOffer[]> }>()
  return (placement: OfferPlacement): Promise<PublicOffer[]> => {
    const t = now()
    const hit = entries.get(placement)
    if (hit && t - hit.at < ttlMs && t >= hit.at) return hit.promise
    const promise = load(placement)
    entries.set(placement, { at: t, promise })
    return promise
  }
}

/** Оффер ещё действует (validTo включительно, по Москве). Часы клиента только убирают рекламу. */
export function isOfferActive(offer: Pick<PublicOffer, 'validTo'>, now: Date): boolean {
  return todayMoscow(now) <= offer.validTo
}

/** Сколько мс до ближайшей полуночи по Москве (минимум 1 с, чтобы не крутиться). */
export function msUntilMoscowMidnight(now: Date): number {
  const msk = now.getTime() + 3 * 3_600_000
  const next = (Math.floor(msk / 86_400_000) + 1) * 86_400_000
  return Math.max(1000, next - msk)
}

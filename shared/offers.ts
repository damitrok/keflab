// Чистая логика офферов (шаг 13): видимость, публичный вид, ссылка перехода,
// решение для /go/<id>. Без Vue, Nitro и других зависимостей (файл
// импортируют сервер и скрипты); «сегодня» всегда приходит снаружи, по Москве.
import type { Offer } from '../data/schema'
import type { OfferPlacement, PublicOffer } from './offers-api'

export type HiddenReason =
  | 'disabled'
  | 'no_erid'
  | 'no_advertiser'
  | 'no_inn'
  | 'not_started'
  | 'expired'
  | 'geo'
  | 'unknown_country'
  | 'placement'
  | 'domain'

export interface VisibilityContext {
  /** Сегодня по Москве, ГГГГ-ММ-ДД. */
  today: string
  /** Результат offersEnabledNow(): флаг включён и сайт зарегистрирован как СМИ. */
  enabled: boolean
  /** Страна из доверенного заголовка или null. */
  country: string | null
  /** Место показа; не задано — не проверяется (для /go/<id>). */
  placement?: OfferPlacement
}

export interface Visibility {
  visible: boolean
  reason?: HiddenReason
}

const blank = (v: string | undefined | null): boolean => (v ?? '').trim() === ''

/**
 * Оффер виден, только если выполнены все условия сразу. Пустые и пробельные
 * erid, рекламодатель и ИНН считаются отсутствующими, даже если схема их пропустила.
 * Срок: validFrom ≤ today ≤ validTo (включительно; в 00:00 по Москве следующего дня оффера нет).
 */
export function offerVisible(offer: Offer, ctx: VisibilityContext): Visibility {
  const no = (reason: HiddenReason): Visibility => ({ visible: false, reason })
  if (!ctx.enabled) return no('disabled')
  if (blank(offer.erid)) return no('no_erid')
  if (blank(offer.advertiserName)) return no('no_advertiser')
  if (blank(offer.advertiserInn)) return no('no_inn')
  if (ctx.today < offer.validFrom) return no('not_started')
  if (ctx.today > offer.validTo) return no('expired')
  if (ctx.country === null) return no('unknown_country')
  if (!offer.geo.includes(ctx.country)) return no('geo')
  if (ctx.placement !== undefined && !offer.placements.includes(ctx.placement)) {
    return no('placement')
  }
  return { visible: true }
}

export interface ShowableContext extends VisibilityContext {
  allowlist: readonly string[]
}

/**
 * Единое условие «оффер можно показывать и вести на него»: видимость плюс
 * домен trackingUrl в allowlist. Используют /api/geo, /api/stat и /go.
 */
export function offerShowable(offer: Offer, ctx: ShowableContext): Visibility {
  const v = offerVisible(offer, ctx)
  if (!v.visible) return v
  if (!hostAllowed(offer.trackingUrl, ctx.allowlist)) return { visible: false, reason: 'domain' }
  return v
}

/** Поля оффера для браузера: без trackingUrl, гео и мест показа. */
export function publicOffer(offer: Offer): PublicOffer {
  return {
    id: offer.id,
    bookmakerSlug: offer.bookmakerSlug,
    advertiserName: offer.advertiserName,
    advertiserInn: offer.advertiserInn,
    erid: offer.erid,
    title: offer.title,
    conditionsShort: offer.conditionsShort,
    validTo: offer.validTo,
  }
}

/** Адрес перехода: параметр erid добавляется или заменяется, остальное сохраняется. */
export function buildRedirectUrl(trackingUrl: string, erid: string): string {
  const url = new URL(trackingUrl)
  url.searchParams.set('erid', erid)
  return url.toString()
}

/** Хост разрешён, если совпадает с записью allowlist или является её поддоменом. */
export function hostAllowed(url: string, allowlist: readonly string[]): boolean {
  let host: string
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    host = parsed.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return false
  }
  return allowlist.some((raw) => {
    const d = raw.trim().toLowerCase()
    return d !== '' && (host === d || host.endsWith(`.${d}`))
  })
}

export type GoReason =
  'unknown_id' | 'disabled' | 'geo' | 'domain' | 'incomplete' | 'expired' | 'not_started'

export type GoDecision =
  | { status: 302; location: string }
  | { status: 404; reason: Exclude<GoReason, 'expired' | 'not_started'> }
  | { status: 410; reason: 'expired' | 'not_started' }

export interface GoContext {
  today: string
  enabled: boolean
  country: string | null
  allowlist: readonly string[]
}

/**
 * Решение для /go/<id>. Те же условия, что и для показа, но истёкший срок
 * даёт 410 (только для своей страны: чужим 404 без подробностей).
 */
export function decideGo(offer: Offer | undefined, ctx: GoContext): GoDecision {
  if (!offer) return { status: 404, reason: 'unknown_id' }
  if (!ctx.enabled) return { status: 404, reason: 'disabled' }
  if (ctx.country === null || !offer.geo.includes(ctx.country)) {
    return { status: 404, reason: 'geo' }
  }
  if (!hostAllowed(offer.trackingUrl, ctx.allowlist)) return { status: 404, reason: 'domain' }
  const v = offerVisible(offer, { today: ctx.today, enabled: true, country: ctx.country })
  if (v.visible) return { status: 302, location: buildRedirectUrl(offer.trackingUrl, offer.erid) }
  if (v.reason === 'expired' || v.reason === 'not_started') {
    return { status: 410, reason: v.reason }
  }
  return { status: 404, reason: 'incomplete' }
}

/** Нижний регистр и ё=е: для сравнения со стоп-листом. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е').replace(/\s+/g, ' ')
}

/** Стоп-слова, найденные в тексте (регистр и ё не важны). */
export function findStopWords(text: string, stopWords: readonly string[]): string[] {
  const t = normalizeText(text)
  return stopWords.filter((w) => {
    const n = normalizeText(w).trim()
    return n !== '' && t.includes(n)
  })
}

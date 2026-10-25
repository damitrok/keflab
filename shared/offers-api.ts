// Контракт ответа /api/geo (шаг 13): сервер решает, какие офферы видны, и
// отдаёт браузеру только безопасные для показа поля — без trackingUrl
// (переход идёт только через /go/<id>, где сервер проверяет всё заново).

/** Места показа офферов. По умолчанию — под результатом калькулятора. */
export const OFFER_PLACEMENTS = ['calc-result'] as const
export type OfferPlacement = (typeof OFFER_PLACEMENTS)[number]

/** Оффер для показа в браузере. */
export interface PublicOffer {
  id: string
  bookmakerSlug: string
  /** Рекламодатель — показывается в карточке. */
  advertiserName: string
  advertiserInn: string
  /** Идентификатор рекламы — показывается видимым текстом. */
  erid: string
  title: string
  conditionsShort: string
  /** Последний день показа (включительно, по Москве), ГГГГ-ММ-ДД. */
  validTo: string
}

export interface GeoResponse {
  /** Страна по GeoIP (ISO 3166-1 alpha-2) или null — неизвестна (офферов нет). */
  country: string | null
  /** Текущее значение выключателя с учётом регистрации СМИ. */
  offersEnabled: boolean
  /** Офферы, видимые сейчас для этой страны и места; пусто, если нельзя. */
  offers: PublicOffer[]
}

/** Сколько ждать /api/geo в браузере: дольше — офферов нет. */
export const GEO_TIMEOUT_MS = 300

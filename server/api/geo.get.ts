import { defineEventHandler, getQuery, setResponseHeaders } from 'h3'
import { OFFER_PLACEMENTS, type GeoResponse, type OfferPlacement } from '../../shared/offers-api'
import { offerShowable, publicOffer } from '../../shared/offers'
import { todayMoscow } from '../../shared/bookmakers'
import { allOffers, allowlistDomains } from '../utils/offers-data'
import { countryFromHeaders } from '../utils/geo'
import { offersEnabledNow } from '../utils/offers'

function placementOf(value: unknown): OfferPlacement | null {
  const v = Array.isArray(value) ? value[0] : value
  return OFFER_PLACEMENTS.find((p) => p === v) ?? null
}

// Страна и выключатель; офферы — только при включённом выключателе и стране RU.
// Без cookie, IP не возвращается и не логируется. Внешних запросов нет.
export default defineEventHandler((event): GeoResponse => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    Vary: 'X-Keflab-Country',
  })
  const country = countryFromHeaders(event.node.req.headers)
  const offersEnabled = offersEnabledNow()
  const placement = placementOf(getQuery(event).placement)
  if (!offersEnabled || country !== 'RU' || placement === null) {
    return { country, offersEnabled, offers: [] }
  }
  const today = todayMoscow()
  const offers = allOffers
    .filter(
      (o) =>
        offerShowable(o, {
          today,
          enabled: offersEnabled,
          country,
          placement,
          allowlist: allowlistDomains,
        }).visible,
    )
    .map(publicOffer)
  return { country, offersEnabled, offers }
})

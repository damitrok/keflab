import site from '../../data/site.json'
import { checkOffers, offersFlag, type OffersGuardSite } from '../../shared/offers-guard'
import { reportError } from './report-error'

const REPORT_INTERVAL_MS = 60_000

export interface OffersSwitchDeps {
  /** Читает сырое значение OFFERS_ENABLED в момент вызова. */
  readFlag: () => string | undefined
  site: OffersGuardSite
  report: (error: Error, context: { where: string }) => void
  now: () => number
}

/** Выключатель офферов без привязки к Nitro: флаг читается при каждом вызове. */
export function createOffersSwitch(deps: OffersSwitchDeps): () => boolean {
  const lastReported = new Map<string, number>()
  return () => {
    const result = checkOffers(offersFlag(deps.readFlag()), deps.site)
    if (result.enabled) return true
    if (result.misconfigured && result.reason !== null) {
      const t = deps.now()
      const last = lastReported.get(result.reason)
      if (last === undefined || t - last >= REPORT_INTERVAL_MS) {
        lastReported.set(result.reason, t)
        deps.report(new Error(result.reason), { where: 'offers' })
      }
    }
    return false
  }
}

/**
 * Показывать ли офферы сейчас. process.env читается при каждом вызове, поэтому
 * включение и выключение действуют без пересборки.
 */
export const offersEnabledNow = createOffersSwitch({
  readFlag: () => process.env.OFFERS_ENABLED,
  site,
  report: reportError,
  now: () => Date.now(),
})

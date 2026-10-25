import type { Offer } from '../../data/schema'
import allowlistData from '../../data/allowlist.json'
import offersData from '../../data/offers.json'

// Данные запекаются в сборку; включение и выключение действуют в рантайме
// через OFFERS_ENABLED (offersEnabledNow), а состав офферов — при выпуске.
export const allOffers: readonly Offer[] = offersData as unknown as Offer[]
export const allowlistDomains: readonly string[] = allowlistData.domains

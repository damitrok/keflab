import { defineEventHandler, setResponseHeaders } from 'h3'
import { offersEnabledNow } from '../utils/offers'

// Заготовка шага 13: страна определяется GeoIP позже. null — «неизвестна»,
// при неизвестной стране офферов нет. Без cookie, IP не возвращается и не логируется.
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  })
  return { country: null as string | null, offersEnabled: offersEnabledNow() }
})

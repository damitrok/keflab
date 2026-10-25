import {
  createError,
  defineEventHandler,
  readRawBody,
  setResponseHeaders,
  setResponseStatus,
} from 'h3'
import { z } from 'zod'
import { todayMoscow } from '../../shared/bookmakers'
import { offerShowable } from '../../shared/offers'
import { createRateLimiter, isSameOriginReport } from '../utils/error-intake'
import { countryFromHeaders } from '../utils/geo'
import { allOffers, allowlistDomains } from '../utils/offers-data'
import { offersEnabledNow } from '../utils/offers'
import { reportError } from '../utils/report-error'
import { recordEvent } from '../utils/stats-store'

const MAX_BODY_BYTES = 512
// Лимит по erid (не общий): двое клиентов не могут исчерпать лимит других офферов.
// В 10 раз выше лимита Nginx для одной сети (5 r/s × 60 = 300/мин), чтобы одна
// машина не гасила честные показы; отброшенное пишется как throttled.
// В памяти процесса; ключи — только erid видимых офферов, данных клиента нет.
// От скрипта с поддельным Origin полной защиты нет — см. README.
const MAX_IMPRESSIONS_PER_MINUTE = 3000
const limiters = new Map<string, ReturnType<typeof createRateLimiter>>()
function takeFor(erid: string): boolean {
  let l = limiters.get(erid)
  if (!l) {
    l = createRateLimiter(MAX_IMPRESSIONS_PER_MINUTE)
    limiters.set(erid, l)
  }
  return l.take()
}

const bodySchema = z
  .object({
    erid: z
      .string()
      .max(64)
      .regex(/^[A-Za-z0-9._-]+$/),
    event: z.literal('impression'),
  })
  .strip()

// Счётчик показов: без cookie и IP. Показ учитывается, только если оффер с
// этим erid виден сейчас; иначе молча 204.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
  const bad = () => createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const declared = Number(event.node.req.headers['content-length'] ?? 0)
  if (declared > MAX_BODY_BYTES) throw bad()
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw bad()
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw bad()
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw bad()

  const h = event.node.req.headers
  const sameOrigin = isSameOriginReport(
    {
      origin: typeof h.origin === 'string' ? h.origin : undefined,
      secFetchSite: typeof h['sec-fetch-site'] === 'string' ? h['sec-fetch-site'] : undefined,
    },
    h.host,
  )
  // Браузеры шлют Sec-Fetch-Site (sendBeacon тоже) или Origin; без обоих — не учитываем.
  const fromBrowser = typeof h['sec-fetch-site'] === 'string' || typeof h.origin === 'string'
  if (sameOrigin && fromBrowser) {
    const today = todayMoscow()
    const enabled = offersEnabledNow()
    const country = countryFromHeaders(h)
    const shown = allOffers.some(
      (o) =>
        o.erid === parsed.data.erid &&
        offerShowable(o, { today, enabled, country, allowlist: allowlistDomains }).visible,
    )
    if (shown) {
      try {
        await recordEvent(parsed.data.erid, takeFor(parsed.data.erid) ? 'impression' : 'throttled')
      } catch (error) {
        reportError(error, { where: 'stats' })
      }
    }
  }
  setResponseStatus(event, 204)
  return null
})

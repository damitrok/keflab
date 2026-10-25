import {
  createError,
  defineEventHandler,
  readRawBody,
  setResponseHeaders,
  setResponseStatus,
} from 'h3'
import {
  MAX_BODY_BYTES,
  createRateLimiter,
  formatClientLine,
  isSameOriginReport,
  parseErrorBody,
} from '../utils/error-intake'
import { reportClientLine } from '../utils/report-error'

// Приём ошибок из браузера. Без cookie, IP и User-Agent в логе. Лимит —
// 60 записей в минуту на процесс, остальное молча отбрасывается (тоже 204).
const limiter = createRateLimiter()

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })

  const declared = Number(event.node.req.headers['content-length'] ?? 0)
  if (declared > MAX_BODY_BYTES)
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const raw = (await readRawBody(event, 'utf8')) ?? ''
  const report = parseErrorBody(raw)
  if (!report) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const headers = event.node.req.headers
  const sameOrigin = isSameOriginReport(
    {
      origin: typeof headers.origin === 'string' ? headers.origin : undefined,
      secFetchSite:
        typeof headers['sec-fetch-site'] === 'string' ? headers['sec-fetch-site'] : undefined,
    },
    headers.host,
  )
  if (sameOrigin && limiter.take()) reportClientLine(formatClientLine(report))
  setResponseStatus(event, 204)
  return null
})

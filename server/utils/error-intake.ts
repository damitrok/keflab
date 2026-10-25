// Чистая логика приёма ошибок из браузера (без h3 и Nitro, чтобы тестировать).
// Принимаются только where/name/message; всё остальное отбрасывается.
import { z } from 'zod'

export const MAX_BODY_BYTES = 2048
export const MAX_REPORTS_PER_MINUTE = 60

/**
 * Без управляющих и форматирующих символов (переводы строк, C1, смена
 * направления текста): иначе можно подделать вид строки лога.
 */
const NO_CONTROL = /^[^\p{Cc}\p{Cf}]*$/u
const CONTROL_RUNS = /[\p{Cc}\p{Cf}\u2028\u2029]+/gu

export const errorReportSchema = z
  .object({
    where: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_.:-]+$/),
    name: z.string().min(1).max(64).regex(NO_CONTROL),
    message: z.string().max(500),
  })
  .strip()

export type ErrorReport = z.infer<typeof errorReportSchema>

/** Разбор тела: null — не по схеме (ответ 400). Лишние поля отбрасываются. */
export function parseErrorReport(body: unknown): ErrorReport | null {
  const parsed = errorReportSchema.safeParse(body)
  return parsed.success ? parsed.data : null
}

/** Разбор сырого текста тела с проверкой размера в байтах. */
export function parseErrorBody(raw: string): ErrorReport | null {
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return null
  try {
    return parseErrorReport(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Одна строка для лога: переводы строк в сообщении заменяются пробелами. */
export function formatClientLine(r: ErrorReport): string {
  const message = r.message.replace(CONTROL_RUNS, ' ')
  return `client:${r.where}: ${r.name}: ${message}`
}

/** Простой счётчик в памяти процесса: не больше `limit` записей в минуту. */
export function createRateLimiter(limit = MAX_REPORTS_PER_MINUTE, windowMs = 60_000) {
  let windowStart = 0
  let count = 0
  return {
    /** true — запись принять; false — молча отбросить. */
    take(now: number = Date.now()): boolean {
      if (now - windowStart >= windowMs || now < windowStart) {
        windowStart = now
        count = 0
      }
      if (count >= limit) return false
      count++
      return true
    },
  }
}

/**
 * Отчёт пришёл со своей страницы. Запрос text/plain идёт без preflight, его
 * может прислать любой сайт — такие отчёты молча отбрасываем (ответ 204).
 * Без Origin и Sec-Fetch-Site (старые браузеры, sendBeacon) — принимаем.
 */
export function isSameOriginReport(
  headers: { origin?: string; secFetchSite?: string },
  host: string | undefined,
): boolean {
  if (headers.secFetchSite && headers.secFetchSite !== 'same-origin') return false
  if (headers.origin) {
    try {
      return !!host && new URL(headers.origin).host === host
    } catch {
      return false
    }
  }
  return true
}

import { defineEventHandler, setResponseHeaders } from 'h3'

// Для мониторинга и проверки выпуска. Внешние сервисы не трогает.
export default defineEventHandler((event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
  return { ok: true }
})

/**
 * Серверная отправка ошибки в мониторинг. Передаётся только тип и текст
 * ошибки плюс место — без данных запроса, IP и cookie.
 *
 * TODO(шаг 8): подключить сервис мониторинга, работающий из России.
 */
export function reportError(error: unknown, context: { where: string }): void {
  const name = error instanceof Error ? error.name : 'UnknownError'
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[keflab] ${context.where}: ${name}: ${message}`)
}

/**
 * Отправка ошибки в мониторинг. Передаётся только тип и текст ошибки плюс
 * место — никаких введённых пользователем данных и stack.
 * В браузере ещё и уходит на /api/error (sendBeacon, не чаще 10 раз за загрузку).
 * Серверный мониторинг: server/utils/report-error.ts.
 */
export const MAX_CLIENT_REPORTS = 10
const MAX_MESSAGE = 500
const MAX_NAME = 64

let sent = 0

export function reportError(error: unknown, context: { where: string }): void {
  const name = error instanceof Error ? error.name : 'UnknownError'
  const message = error instanceof Error ? error.message : String(error)
  try {
    console.error(`[keflab] ${context.where}: ${name}: ${message}`)
    if (typeof window === 'undefined') return
    if (sent >= MAX_CLIENT_REPORTS) return
    sent++
    const body = JSON.stringify({
      where: context.where.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 64) || 'unknown',
      // eslint-disable-next-line no-control-regex
      name: name.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, MAX_NAME) || 'Error',
      message: message.slice(0, MAX_MESSAGE),
    })
    // text/plain — «простой» запрос без preflight; сервер читает тело как JSON.
    const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/error', blob)) {
      return
    }
    void fetch('/api/error', {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    // Сообщение об ошибке не должно само ломать сайт.
  }
}

/** Только для тестов. */
export function resetReportErrorForTests(): void {
  sent = 0
}

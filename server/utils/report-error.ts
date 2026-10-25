/**
 * Серверная отправка ошибки в мониторинг. Передаётся только тип и текст
 * ошибки плюс место — без данных запроса, IP, User-Agent и cookie.
 * Строка уходит в stderr, её собирает journald.
 *
 * TODO(шаг 8, человек): подключить внешний сервис ошибок, работающий из
 * России (выбор за человеком). Подключать здесь, в writeLine(): сюда
 * приходят и серверные ошибки, и ошибки браузера из /api/error.
 */
function writeLine(line: string): void {
  console.error(`[keflab] ${line}`)
}

export function reportError(error: unknown, context: { where: string }): void {
  const name = error instanceof Error ? error.name : 'UnknownError'
  const message = error instanceof Error ? error.message : String(error)
  writeLine(`${context.where}: ${name}: ${message}`)
}

/** Ошибка браузера, уже проверенная error-intake: строка вида `client:<where>: <name>: <message>`. */
export function reportClientLine(line: string): void {
  writeLine(line)
}

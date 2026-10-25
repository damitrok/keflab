// Признак «сеанс виджета» (шаг 13): липкий на всё время жизни приложения.
// Виджет внутри чужого iframe не должен показывать рекламу, баннер cookie и
// Метрику даже после клиентской навигации на обычные страницы.
import { isEmbedPath } from './widget-code'

/** Страница открыта внутри iframe (или это недоступно — считаем iframe). */
export function isInsideFrame(win: { self: unknown; top: unknown } | undefined): boolean {
  if (!win) return false
  try {
    return win.self !== win.top
  } catch {
    return true
  }
}

/** Сеанс — виджет, если первый маршрут /embed/ или страница в iframe. */
export function isEmbedSession(firstPath: string, inFrame: boolean): boolean {
  return isEmbedPath(firstPath) || inFrame
}

/** В сеансе виджета уходить на путь вне /embed/ нельзя. */
export function shouldBlockNavigation(embedSession: boolean, toPath: string): boolean {
  return embedSession && !isEmbedPath(toPath)
}

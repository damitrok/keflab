// Яндекс Метрика: чистая логика без Vue. Загружается только после согласия
// на cookie (см. app/plugins/metrika.client.ts). Домен mc.yandex.ru — в
// data/allowlist.json. Без <noscript>-пикселя: он грузился бы без согласия.

export const METRIKA_SRC = 'https://mc.yandex.ru/metrika/tag.js'

/** Параметры init: Вебвизор и карта кликов выключены (ТЗ, шаг 8). */
export const METRIKA_PARAMS = {
  webvisor: false,
  clickmap: false,
  trackLinks: true,
  accurateTrackBounce: true,
  defer: false,
} as const

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }

/** Минимальный срез window, нужный Метрике (для тестов без DOM). */
export interface MetrikaWindow {
  ym?: YmFn
  [key: string]: unknown
}

export interface MetrikaDocument {
  createElement(tag: 'script'): {
    async: boolean
    src: string
    onerror: (() => void) | null
  }
  head: { appendChild(node: unknown): unknown }
}

/**
 * Номер счётчика: только цифры, иначе считаем, что Метрика не настроена.
 * Nuxt превращает числовое значение из env в number, поэтому принимаем оба вида.
 */
export function parseCounterId(raw: unknown): number | null {
  const str = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d{1,12}$/.test(str)) return null
  const id = Number(str)
  return id > 0 ? id : null
}

/** Метрика грузится только при согласии и валидном номере счётчика. */
export function shouldLoadMetrika(allowed: boolean, rawId: unknown): boolean {
  return allowed && parseCounterId(rawId) !== null
}

let counterId: number | null = null
let enabled = false
let loaded = false

/** Стандартная очередь ym до загрузки tag.js; безопасна, если скрипт заблокирован. */
function installStub(win: MetrikaWindow): void {
  if (typeof win.ym === 'function') return
  const ym: YmFn = (...args: unknown[]) => {
    ;(ym.a = ym.a || []).push(args)
  }
  ym.l = Date.now()
  win.ym = ym
}

function callYm(win: MetrikaWindow, ...args: unknown[]): void {
  try {
    if (typeof win.ym === 'function') win.ym(...args)
  } catch {
    // Метрика не должна ломать сайт.
  }
}

/**
 * Включить или выключить отправку. Скрипт грузится один раз за вкладку; после
 * «Отклонить» новые хиты не отправляются (флаг disableYaCounter<id> и наш
 * reachGoal), перезагружать страницу не нужно.
 */
export function setMetrikaEnabled(
  win: MetrikaWindow,
  doc: MetrikaDocument,
  allowed: boolean,
  rawId: unknown,
): void {
  const id = parseCounterId(rawId)
  if (id === null) return
  const on = shouldLoadMetrika(allowed, rawId)
  if (counterId === null) counterId = id
  win[`disableYaCounter${counterId}`] = !on
  enabled = on
  if (!on || loaded) return
  loaded = true
  try {
    installStub(win)
    const script = doc.createElement('script')
    script.async = true
    script.src = METRIKA_SRC
    // Блокировщик рекламы: молча, без ошибок в консоли.
    script.onerror = () => {}
    callYm(win, counterId, 'init', { ...METRIKA_PARAMS })
    doc.head.appendChild(script)
  } catch {
    // Ничего не ломаем.
  }
}

/** Цель Метрики. Молча ничего не делает без согласия, счётчика или при блокировке. */
export function reachGoal(name: string, params?: Record<string, unknown>): void {
  if (!enabled || counterId === null || typeof window === 'undefined') return
  const win = window as unknown as MetrikaWindow
  if (params) callYm(win, counterId, 'reachGoal', name, params)
  else callYm(win, counterId, 'reachGoal', name)
}

/** Только для тестов. */
export function resetMetrikaForTests(): void {
  counterId = null
  enabled = false
  loaded = false
}

// Код виджета для чужого сайта (шаг 12). Чистые функции без Vue.
// Ссылки в коде ведут только на собственный домен.

export const WIDGET_ORIGIN = 'https://keflab.ru'
export const WIDGET_MESSAGE_TYPE = 'keflab:height'
export const WIDGET_TITLE = 'Калькулятор системы ставок keflab.ru'
export const WIDGET_CAPTION = 'Калькулятор системы — keflab.ru'
export const WIDGET_DEFAULT_HEIGHT = 640
export const WIDGET_MIN_HEIGHT = 200
export const WIDGET_MAX_HEIGHT = 5000
export const WIDGET_MIN_WIDTH = 320
export const WIDGET_MAX_WIDTH = 1200

export type WidgetTheme = 'dark' | 'light'
export type WidgetWidth = '100%' | number

export interface WidgetOptions {
  width?: unknown
  theme?: unknown
  origin?: string
  /** id iframe; по умолчанию случайный, чтобы два виджета не мешали друг другу. */
  id?: string
}

/** Маршрут встраиваемой страницы: на нём нет шапки, подвала, баннера и Метрики. */
export function isEmbedPath(path: string): boolean {
  return path === '/embed' || path.startsWith('/embed/')
}

export function normalizeTheme(value: unknown): WidgetTheme {
  return value === 'light' ? 'light' : 'dark'
}

/** '100%' или целое число px 320..1200; всё остальное — '100%'. */
export function normalizeWidth(value: unknown): WidgetWidth {
  const n = typeof value === 'string' && /^\d{1,5}$/.test(value.trim()) ? Number(value) : value
  if (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= WIDGET_MIN_WIDTH &&
    n <= WIDGET_MAX_WIDTH
  ) {
    return n
  }
  return '100%'
}

/** Origin вида scheme://host[:port]; иначе — адрес сайта. */
function normalizeOrigin(value: string | undefined): string {
  if (value && /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(value)) return value
  return WIDGET_ORIGIN
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Строка для JS-кода внутри <script>: JSON без «<», чтобы не закрыть тег. */
function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function randomId(): string {
  return `keflab-widget-${Math.random().toString(36).slice(2, 8)}`
}

function safeId(value: string | undefined): string {
  return value && /^[A-Za-z][\w-]{0,63}$/.test(value) ? value : randomId()
}

/** Адрес iframe с темой. */
export function widgetSrc(theme: unknown, origin?: string): string {
  return `${normalizeOrigin(origin)}/embed/sistema/?theme=${normalizeTheme(theme)}`
}

/** Скрипт подгонки высоты: проверяет origin, source, тип и диапазон высоты. */
export function buildResizeScript(id: string, origin: string): string {
  return (
    `(function(){var f=document.getElementById(${jsString(id)});if(!f)return;` +
    `window.addEventListener("message",function(e){` +
    `if(e.origin!==${jsString(origin)}||e.source!==f.contentWindow)return;` +
    `var d=e.data;if(!d||d.type!==${jsString(WIDGET_MESSAGE_TYPE)})return;` +
    `var h=d.height;if(typeof h!=="number"||!isFinite(h)||h<${WIDGET_MIN_HEIGHT}||h>${WIDGET_MAX_HEIGHT})return;` +
    `f.style.height=Math.round(h)+"px"})})();`
  )
}

export function buildWidgetCode(options: WidgetOptions = {}): string {
  const origin = normalizeOrigin(options.origin)
  const id = safeId(options.id)
  const width = normalizeWidth(options.width)
  const src = widgetSrc(options.theme, origin)
  const iframe =
    `<iframe id="${escapeHtml(id)}" src="${escapeHtml(src)}" ` +
    `title="${escapeHtml(WIDGET_TITLE)}" width="${width}" height="${WIDGET_DEFAULT_HEIGHT}" ` +
    `loading="lazy" style="border:0;max-width:100%"></iframe>`
  const caption =
    `<p><a href="${escapeHtml(origin)}/" target="_blank" rel="noopener">` +
    `${escapeHtml(WIDGET_CAPTION)}</a></p>`
  const script = `<script>${buildResizeScript(id, origin)}</script>`
  return `${iframe}\n${caption}\n${script}`
}

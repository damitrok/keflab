// Единый формат адресов: со слешем на конце. Чистая функция решения о редиректе.

const SKIP_PREFIXES = ['/_nuxt/', '/api/', '/__nuxt', '/go/', '/_ipx/']
const SKIP_EXACT = new Set(['/sitemap.xml', '/robots.txt'])

/**
 * Возвращает новый путь (без query), если нужен 301, иначе null.
 * Сжимает `//` в `/`, добавляет слеш на конце. Файлы с расширением и
 * служебные пути не трогает.
 */
export function shouldRedirect(path: string): string | null {
  if (!path.startsWith('/')) return null
  const collapsed = path.replace(/\/{2,}/g, '/')
  if (SKIP_EXACT.has(collapsed)) return collapsed === path ? null : collapsed
  if (SKIP_PREFIXES.some((p) => collapsed.startsWith(p) || collapsed + '/' === p)) {
    // Служебные пути (/go/<id> без слеша — шаг 13) не трогаем.
    return null
  }
  let target = collapsed
  if (!target.endsWith('/')) {
    const last = target.slice(target.lastIndexOf('/') + 1)
    if (!last.includes('.')) target += '/'
  }
  return target === path ? null : target
}

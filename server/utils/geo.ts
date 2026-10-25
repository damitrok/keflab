/** Заголовок, который ставит Nginx (GeoIP); клиентский заголовок Nginx перетирает. */
export const COUNTRY_HEADER = 'x-keflab-country'

/**
 * Страна запроса. Верим заголовку только при GEO_HEADER_TRUSTED=true (за
 * Nginx); иначе любой клиент мог бы подделать страну. Определения по IP в
 * Node нет, X-Forwarded-For не читаем.
 */
export function parseCountry(
  header: string | string[] | undefined,
  trusted: string | undefined,
): string | null {
  if (trusted?.trim().toLowerCase() !== 'true') return null
  if (typeof header !== 'string') return null
  return /^[A-Z]{2}$/.test(header) ? header : null
}

export function countryFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  env: Record<string, string | undefined> = process.env,
): string | null {
  return parseCountry(headers[COUNTRY_HEADER], env.GEO_HEADER_TRUSTED)
}

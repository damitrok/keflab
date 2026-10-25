import type { StakeMode } from './calc'
import { D } from './calc'

// Чистые функции страницы правил БК (шаг 10): даты, источник, title/description.

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const

/** Максимум для title (к нему usePageSeo добавляет суффикс сайта). */
export const BK_TITLE_MAX = 47
export const BK_DESCRIPTION_MAX = 160

/** «2026-10-12» → «12 октября 2026». Невалидная дата — пустая строка. */
export function formatRuDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  const month = MONTHS_GENITIVE[Number(m[2]) - 1]
  if (!month) return ''
  return `${Number(m[3])} ${month} ${m[1]}`
}

/**
 * Адрес источника текстом: без протокола и «www.», без query и фрагмента,
 * без слеша на конце. Это не ссылка: на странице он показывается обычным текстом.
 */
export function sourceText(url: string): string {
  const withoutProtocol = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const withoutQuery = withoutProtocol.split(/[?#]/)[0] ?? ''
  return withoutQuery.replace(/^www\./i, '').replace(/\/+$/, '')
}

function ellipsize(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/** Самый информативный заголовок, который помещается в BK_TITLE_MAX. */
export function bookmakerTitle(name: string): string {
  const candidates = [
    `Как ${name} считает систему ставок`,
    `Как ${name} считает систему`,
    `${name}: как считается система`,
    `${name}: расчёт системы`,
  ]
  const fit = candidates.find((c) => c.length <= BK_TITLE_MAX)
  if (fit) return fit
  // Имя очень длинное: обрезаем само имя, а не середину фразы.
  const head = 'Как '
  const tail = ' считает систему'
  return `${head}${ellipsize(name, BK_TITLE_MAX - head.length - tail.length)}${tail}`
}

export function bookmakerDescription(name: string, checkedAtRu: string): string {
  const build = (n: string) =>
    `Как ${n} считает систему ставок: как делится ставка, минимальная ставка на комбинацию, возвраты, половины и максимум событий. Правила проверены ${checkedAtRu}.`
  const full = build(name)
  if (full.length <= BK_DESCRIPTION_MAX) return full
  const overflow = full.length - BK_DESCRIPTION_MAX
  return build(ellipsize(name, Math.max(1, name.length - overflow)))
}

export function stakeSplitText(mode: StakeMode): string {
  return mode === 'total'
    ? 'Ставка вводится на всю систему и делится между комбинациями поровну.'
    : 'Ставка вводится на одну комбинацию: общая сумма — это ставка, умноженная на число комбинаций.'
}

/** Ставка на одну комбинацию (строкой) меньше минимума БК (строкой): сравнение точное. */
export function isBelowMinStake(stakePerCombination: string, minStake: string): boolean {
  return D(stakePerCombination).lt(D(minStake))
}

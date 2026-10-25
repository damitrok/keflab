// Какие БК получают страницу /bk/<slug>/kak-schitaetsya-sistema/ (шаг 10).
// Без зависимостей: модуль импортируют реестр страниц, сервер и скрипты.

/** Правила старше этого срока не публикуются (check:rules на шаге 15). */
export const RULES_MAX_AGE_DAYS = 180

export interface BookmakerRulesInput {
  slug: string
  systemRules: unknown | null
  checkedAt: string | null
}

export function bookmakerPagePath(slug: string): string {
  return `/bk/${slug}/kak-schitaetsya-sistema/`
}

/** Сегодня по Москве (UTC+3, без перехода на летнее время) в формате ГГГГ-ММ-ДД. */
export function todayMoscow(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Сколько полных дней прошло от date до today (обе — ГГГГ-ММ-ДД). */
export function daysBetween(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000,
  )
}

/**
 * Страница БК собирается, только если правила заполнены, а проверка не старше
 * 180 дней (и не в будущем — это опечатка в данных).
 */
export function isBookmakerPublishable(b: BookmakerRulesInput, today: string): boolean {
  if (!b.systemRules || !b.checkedAt) return false
  const age = daysBetween(b.checkedAt, today)
  return age >= 0 && age <= RULES_MAX_AGE_DAYS
}

export function publishableBookmakers<T extends BookmakerRulesInput>(
  list: readonly T[],
  today: string,
): T[] {
  return list.filter((b) => isBookmakerPublishable(b, today))
}

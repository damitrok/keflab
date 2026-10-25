// Построители JSON-LD (schema.org) как чистые функции: без Vue и Nuxt.

export interface Crumb {
  label: string
  to?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface WebAppInfo {
  name: string
  description: string
  /** Категория schema.org; для калькуляторов — FinanceApplication. */
  category?: 'FinanceApplication' | 'UtilitiesApplication'
}

export type JsonLd = Record<string, unknown>

const CONTEXT = 'https://schema.org'

/** Адрес страницы: `${siteUrl}${path}`, path начинается со слеша. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${path}`
}

/**
 * Хлебные крошки. Последняя крошка — текущая страница: у неё нет `to`,
 * поэтому её адрес — `currentPath`.
 */
export function buildBreadcrumbList(
  items: readonly Crumb[],
  siteUrl: string,
  currentPath: string,
): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: absoluteUrl(siteUrl, item.to ?? currentPath),
    })),
  }
}

export function buildFaqPage(items: readonly FaqItem[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  }
}

export function buildWebApplication(info: WebAppInfo, siteUrl: string, path: string): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebApplication',
    name: info.name,
    description: info.description,
    url: absoluteUrl(siteUrl, path),
    applicationCategory: info.category ?? 'FinanceApplication',
    operatingSystem: 'Any',
    inLanguage: 'ru',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
  }
}

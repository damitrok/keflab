// Построение sitemap.xml — чистая функция, без обращения к файлам и git.

import type { SitePage } from './site-pages'

export type LastmodMap = Readonly<Record<string, string>>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Дата YYYY-MM-DD (UTC). */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildSitemap(
  pages: readonly Pick<SitePage, 'path' | 'indexable'>[],
  lastmod: LastmodMap,
  siteUrl: string,
  fallbackDate: string = formatDate(new Date()),
): string {
  const base = siteUrl.replace(/\/+$/, '')
  const urls = pages
    .filter((p) => p.indexable)
    .map((p) => {
      const raw = lastmod[p.path]
      const date = raw && DATE_RE.test(raw) ? raw : fallbackDate
      return `  <url>\n    <loc>${escapeXml(base + p.path)}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`
    })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

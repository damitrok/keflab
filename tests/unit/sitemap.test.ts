import { describe, expect, it } from 'vitest'
import { SITE_PAGES } from '../../shared/site-pages'
import { buildSitemap, escapeXml, formatDate } from '../../shared/sitemap'
import lastmod from '../../shared/lastmod.json'

describe('buildSitemap', () => {
  const pages = [
    { path: '/a/', indexable: true },
    { path: '/b/', indexable: false },
    { path: '/c&d/<x>/', indexable: true },
  ]
  const xml = buildSitemap(
    pages,
    { '/a/': '2026-01-02', '/c&d/<x>/': 'мусор' },
    'https://x.ru/',
    '2026-05-06',
  )

  it('включает только indexable', () => {
    expect(xml).toContain('<loc>https://x.ru/a/</loc>')
    expect(xml).not.toContain('/b/')
  })
  it('экранирует XML и подставляет запасную дату при неверной', () => {
    expect(xml).toContain('<loc>https://x.ru/c&amp;d/&lt;x&gt;/</loc>')
    expect(xml).toContain('<lastmod>2026-05-06</lastmod>')
  })
  it('lastmod в формате YYYY-MM-DD, URL абсолютные', () => {
    expect(xml).toContain('<lastmod>2026-01-02</lastmod>')
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) expect(m[1]).toMatch(/^https:\/\//)
    for (const m of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g))
      expect(m[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('заголовок XML и пространство имён', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })
})

describe('вспомогательные функции', () => {
  it('escapeXml', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;')
  })
  it('formatDate', () => {
    expect(formatDate(new Date('2026-03-04T23:59:59Z'))).toBe('2026-03-04')
  })
})

describe('реестр и lastmod.json', () => {
  it('для каждой страницы реестра есть дата', () => {
    for (const p of SITE_PAGES) expect(lastmod).toHaveProperty([p.path])
  })
})

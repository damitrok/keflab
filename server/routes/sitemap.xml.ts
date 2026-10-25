import { SITE_PAGES, SITE_URL } from '#shared/site-pages'
import { buildSitemap } from '#shared/sitemap'
import lastmod from '#shared/lastmod.json'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return buildSitemap(SITE_PAGES, lastmod, SITE_URL)
})

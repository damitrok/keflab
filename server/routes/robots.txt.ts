import { SITE_URL } from '#shared/site-pages'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return ['User-agent: *', 'Disallow: /go/', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
})

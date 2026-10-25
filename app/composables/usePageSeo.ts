import {
  absoluteUrl,
  buildBreadcrumbList,
  buildFaqPage,
  buildWebApplication,
  type Crumb,
  type FaqItem,
  type JsonLd,
  type WebAppInfo,
} from '~/lib/seo'

export interface PageSeoOptions {
  /** Адрес страницы со слешем на конце (из реестра shared/site-pages.ts). */
  path: string
  /** До 47 символов: к нему добавляется суффикс « · keflab.ru» (итог до 60). */
  title: string
  /** До 160 символов. */
  description: string
  /** Те же items, что у компонента Breadcrumbs. */
  breadcrumbs?: readonly Crumb[]
  type?: 'website' | 'article'
  webApp?: WebAppInfo
  /** Только если FAQ виден на странице; тексты — те же, что в разметке. */
  faq?: readonly FaqItem[]
  /** Страница-копия (например, главная с параметрами расчёта). */
  noindex?: boolean
  /** Задать полный title без суффикса. */
  fullTitle?: boolean
}

/** Title, description, Open Graph, canonical и JSON-LD одной страницы. */
export function usePageSeo(opts: PageSeoOptions): void {
  const { public: site } = useRuntimeConfig()
  const url = absoluteUrl(site.siteUrl, opts.path)

  const jsonLd: JsonLd[] = []
  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    jsonLd.push(buildBreadcrumbList(opts.breadcrumbs, site.siteUrl, opts.path))
  }
  if (opts.webApp) jsonLd.push(buildWebApplication(opts.webApp, site.siteUrl, opts.path))
  if (opts.faq && opts.faq.length > 0) jsonLd.push(buildFaqPage(opts.faq))

  useHead({
    title: opts.title,
    titleTemplate: opts.fullTitle ? null : undefined,
    link: [{ rel: 'canonical', href: url }],
    meta: opts.noindex ? [{ name: 'robots', content: 'noindex, follow' }] : [],
    script: jsonLd.map((data, i) => ({
      key: `ld-json-${i}`,
      type: 'application/ld+json',
      // Содержимое сериализуем сами; «<» экранируем, чтобы данные не закрыли тег.
      innerHTML: JSON.stringify(data).replace(/</g, '\\u003c'),
    })),
  })

  const ogTitle = opts.fullTitle ? opts.title : `${opts.title} · ${site.siteName}`
  useSeoMeta({
    description: opts.description,
    ogTitle,
    ogDescription: opts.description,
    ogUrl: url,
    ogType: opts.type ?? 'website',
    ogLocale: 'ru_RU',
    ogSiteName: site.siteName,
  })
}

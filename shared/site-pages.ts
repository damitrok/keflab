// Реестр страниц сайта: из него строятся предсборка, sitemap.xml и проверки
// SEO. Новую страницу нужно добавить сюда (шаги 9–11 дополняют список).
// Импорт: `#shared/site-pages` — доступен и приложению, и серверу.

export type PageKind = 'calculator' | 'article' | 'service'

export interface SitePage {
  /** Адрес со слешем на конце. */
  path: string
  /** Файл-источник страницы: по нему считается lastmod в sitemap. */
  source: string
  kind: PageKind
  /** Попадает в sitemap и не имеет noindex. */
  indexable: boolean
  /**
   * Предсобирается в готовый HTML. Главная — нет: у неё бывают параметры
   * расчёта (шаг 4), а предсобранный файл отдаётся для любого query без
   * noindex и без расчёта на сервере.
   */
  prerender: boolean
}

export const SITE_URL = 'https://keflab.ru'

export const SITE_PAGES: readonly SitePage[] = [
  {
    path: '/',
    source: 'app/pages/index.vue',
    kind: 'calculator',
    indexable: true,
    prerender: false,
  },
  {
    path: '/kalkulyator-ekspressa/',
    source: 'app/pages/kalkulyator-ekspressa.vue',
    kind: 'calculator',
    indexable: true,
    prerender: true,
  },
  {
    path: '/chto-takoe-sistema-v-stavkah/',
    source: 'app/pages/chto-takoe-sistema-v-stavkah.vue',
    kind: 'article',
    indexable: true,
    prerender: true,
  },
  {
    path: '/o-proekte/',
    source: 'app/pages/o-proekte.vue',
    kind: 'service',
    indexable: true,
    prerender: true,
  },
  {
    path: '/reklama/',
    source: 'app/pages/reklama.vue',
    kind: 'service',
    indexable: true,
    prerender: true,
  },
  {
    path: '/politika-konfidencialnosti/',
    source: 'app/pages/politika-konfidencialnosti.vue',
    kind: 'service',
    indexable: true,
    prerender: true,
  },
  {
    path: '/otvetstvennaya-igra/',
    source: 'app/pages/otvetstvennaya-igra.vue',
    kind: 'service',
    indexable: true,
    prerender: true,
  },
]

/** Удалённые адреса: отвечают 410 Gone. Добавлять сюда при удалении страниц. */
export const GONE_PATHS: readonly string[] = []

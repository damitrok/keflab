// Реестр страниц сайта: из него строятся предсборка, sitemap.xml и проверки
// SEO. Новую страницу нужно добавить сюда (шаги 9–11 дополняют список).
// Импорт: `#shared/site-pages` — доступен и приложению, и серверу.

import bookmakers from '../data/bookmakers.json' with { type: 'json' }
import { bookmakerPagePath, publishableBookmakers, todayMoscow } from './bookmakers.ts'

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

/** Системы K из N со своими страницами (шаг 9): 3 ≤ N ≤ 8, 2 ≤ K < N — 21 страница. */
export const SYSTEM_PAGE_RANGE = { minN: 3, maxN: 8 } as const

export function systemPagePath(k: number, n: number): string {
  return `/sistema-${k}-iz-${n}/`
}

export const SYSTEM_PAGES: readonly { k: number; n: number }[] = (() => {
  const out: { k: number; n: number }[] = []
  for (let n = SYSTEM_PAGE_RANGE.minN; n <= SYSTEM_PAGE_RANGE.maxN; n++) {
    for (let k = 2; k < n; k++) out.push({ k, n })
  }
  return out
})()

const STATIC_PAGES: readonly SitePage[] = [
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

/**
 * Страницы правил БК (шаг 10): только с заполненными правилами и проверкой не
 * старше 180 дней на дату сборки (по Москве). Остальные не собираются и не
 * попадают в sitemap.
 */
export const BOOKMAKER_PAGES: readonly SitePage[] = publishableBookmakers(
  bookmakers as { slug: string; systemRules: unknown | null; checkedAt: string | null }[],
  todayMoscow(),
).map((b) => ({
  path: bookmakerPagePath(b.slug),
  source: 'data/bookmakers.json',
  kind: 'article',
  indexable: true,
  prerender: true,
}))

/** Мелкие калькуляторы (шаг 11): адрес → файл страницы. */
export const SMALL_CALCULATORS = [
  { slug: 'marzha', title: 'Маржа букмекера' },
  { slug: 'slozhenie-koefficientov', title: 'Сложение коэффициентов' },
  { slug: 'dogon', title: 'Калькулятор догона' },
  { slug: 'konverter-koefficientov', title: 'Конвертер коэффициентов' },
] as const

const SMALL_CALCULATOR_PAGES: readonly SitePage[] = [
  {
    path: '/kalkulyatory/',
    source: 'app/pages/kalkulyatory/index.vue',
    kind: 'article',
    indexable: true,
    prerender: true,
  },
  ...SMALL_CALCULATORS.map(({ slug }): SitePage => ({
    path: `/kalkulyatory/${slug}/`,
    source: `app/pages/kalkulyatory/${slug}.vue`,
    kind: 'calculator',
    indexable: true,
    prerender: true,
  })),
]

/**
 * Виджет (шаг 12): страница с описанием и генератором кода и сама
 * встраиваемая страница. /embed/ — noindex и не в sitemap; не предсобирается,
 * потому что тема и размеры приходят в query (?theme=light).
 */
const WIDGET_PAGES: readonly SitePage[] = [
  {
    path: '/vidzhet/',
    source: 'app/pages/vidzhet.vue',
    kind: 'service',
    indexable: true,
    prerender: true,
  },
  {
    path: '/embed/sistema/',
    source: 'app/pages/embed/sistema.vue',
    kind: 'calculator',
    indexable: false,
    prerender: false,
  },
]

export const SITE_PAGES: readonly SitePage[] = [
  ...STATIC_PAGES,
  ...SYSTEM_PAGES.map(({ k, n }): SitePage => ({
    path: systemPagePath(k, n),
    source: 'app/pages/sistema-[k]-iz-[n].vue',
    kind: 'calculator',
    indexable: true,
    prerender: true,
  })),
  ...SMALL_CALCULATOR_PAGES,
  ...WIDGET_PAGES,
  ...BOOKMAKER_PAGES,
]

/** Удалённые адреса: отвечают 410 Gone. Добавлять сюда при удалении страниц. */
export const GONE_PATHS: readonly string[] = []

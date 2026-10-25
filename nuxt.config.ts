// https://nuxt.com/docs/api/configuration/nuxt-config
import { SITE_PAGES } from './shared/site-pages'

const prerenderRoutes = SITE_PAGES.filter((p) => p.prerender).map((p) => p.path)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],

  css: ['~/assets/styles/main.scss'],

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      titleTemplate: '%s · keflab.ru',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [{ rel: 'icon', href: '/favicon.ico' }],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: 'https://keflab.ru',
      siteName: 'keflab.ru',
      // Метатеги подтверждения Вебмастера и Search Console — из окружения:
      // NUXT_PUBLIC_YANDEX_VERIFICATION, NUXT_PUBLIC_GOOGLE_VERIFICATION.
      // Предсобранные страницы берут значения на этапе сборки.
      yandexVerification: '',
      googleVerification: '',
    },
  },

  typescript: { strict: true },

  nitro: {
    preset: 'node-server',
    // Предсжатые .br и .gz для статики: Nitro отдаёт их по Accept-Encoding.
    // HTML страниц на лету (главная) сжимает Nginx (шаг 8).
    compressPublicAssets: { gzip: true, brotli: true },
    prerender: {
      // Список страниц — из shared/site-pages.ts; по ссылкам не ходим, чтобы
      // в сборку не попало лишнее.
      crawlLinks: false,
      routes: [...prerenderRoutes, '/sitemap.xml', '/robots.txt'],
      failOnError: true,
    },
  },
})

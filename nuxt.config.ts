// https://nuxt.com/docs/api/configuration/nuxt-config
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
    },
  },

  typescript: { strict: true },

  nitro: { preset: 'node-server' },
})

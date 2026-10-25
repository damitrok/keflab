import { reportError } from '~/lib/report-error'

// Необработанные ошибки браузера → мониторинг. Только name и message, без
// stack и данных ввода. Не больше 10 отправок за загрузку (см. reportError).
// Свой vueApp.config.errorHandler не ставим: он затёр бы обработчик Nuxt.
// Вместо него — хуки Nuxt, которые тот вызывает.
export default defineNuxtPlugin((nuxtApp) => {
  // Одна и та же ошибка может прийти из обоих хуков — шлём один раз.
  const seen = new WeakSet<object>()
  const reportVue = (error: unknown) => {
    if (typeof error === 'object' && error !== null) {
      if (seen.has(error)) return
      seen.add(error)
    }
    reportError(error, { where: 'vue' })
  }
  nuxtApp.hook('vue:error', reportVue)
  nuxtApp.hook('app:error', reportVue)
  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, { where: 'window' })
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { where: 'window' })
  })
})

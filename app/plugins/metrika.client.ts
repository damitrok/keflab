import { setMetrikaEnabled, type MetrikaDocument, type MetrikaWindow } from '~/lib/metrika'

// Подключает Метрику только после «Принять» и только если задан
// NUXT_PUBLIC_METRIKA_ID. Выбор читает useConsent().load() в layout.
export default defineNuxtPlugin((nuxtApp) => {
  const { analyticsAllowed } = useConsent()
  const metrikaId = useRuntimeConfig().public.metrikaId

  nuxtApp.vueApp.runWithContext(() => {
    watch(
      analyticsAllowed,
      (allowed) =>
        setMetrikaEnabled(
          window as unknown as MetrikaWindow,
          document as unknown as MetrikaDocument,
          allowed,
          metrikaId,
        ),
      { immediate: true },
    )
  })
})

import { setMetrikaEnabled, type MetrikaDocument, type MetrikaWindow } from '~/lib/metrika'
import { isEmbedPath } from '~/lib/widget-code'

// Подключает Метрику только после «Принять» и только если задан
// NUXT_PUBLIC_METRIKA_ID. Выбор читает useConsent().load() в layout.
export default defineNuxtPlugin((nuxtApp) => {
  // Виджет (/embed/): Метрика не грузится ни при каком согласии.
  if (useEmbedSession().value || isEmbedPath(window.location.pathname)) return

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

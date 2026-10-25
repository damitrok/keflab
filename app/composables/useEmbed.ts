import { computed } from 'vue'
import { isEmbedPath, normalizeTheme } from '../lib/widget-code'

/**
 * Страница показана как виджет (/embed/…), возможно внутри чужого iframe.
 *
 * ПРАВИЛО: компоненты офферов и любая реклама (шаг 13) НЕ рендерятся при
 * isEmbed ни при каких флагах (OFFERS_ENABLED и т. п.): иначе сайт-владелец
 * стал бы распространителем рекламы без маркировки. Проверять
 * useIsEmbed() внутри компонента, а не только на странице.
 */
export function useIsEmbed() {
  const route = useRoute()
  const session = useEmbedSession()
  return computed(() => session.value || isEmbedPath(route.path))
}

/** Липкий признак сеанса виджета (см. app/lib/embed-session.ts); не сбрасывается. */
export function useEmbedSession() {
  return useState<boolean>('keflab:embed-session', () => false)
}

/** Тема виджета из ?theme= (по умолчанию тёмная); работает на SSR. */
export function useEmbedTheme() {
  const route = useRoute()
  return computed(() => {
    const raw = route.query.theme
    return normalizeTheme(Array.isArray(raw) ? raw[0] : raw)
  })
}

import { shouldBlockNavigation } from '../lib/embed-session'

// В сеансе виджета обычные страницы не открываются в iframe: переход
// отменяется и уходит в новую вкладку (там уже обычный сайт с баннером).
export default defineNuxtPlugin(() => {
  const state = useEmbedSession()
  const router = useRouter()
  router.beforeEach((to, from) => {
    if (!shouldBlockNavigation(state.value, to.path)) return
    // Первый переход (from.matched пуст) — это загрузка самой страницы.
    if (from.matched.length === 0) return
    window.open(to.fullPath, '_blank', 'noopener')
    return false
  })
})

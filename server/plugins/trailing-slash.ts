import { shouldRedirect } from '#shared/trailing-slash'

// Хук `request` вызывается до раздачи предсобранных файлов, поэтому 301
// работает и для предсобранных страниц (middleware для них не вызывается).
// Берём сырой event.path: getRequestURL схлопывает двойные слеши.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    const raw = event.path
    const q = raw.indexOf('?')
    const pathname = q === -1 ? raw : raw.slice(0, q)
    const search = q === -1 ? '' : raw.slice(q)
    const target = shouldRedirect(pathname)
    if (target) return sendRedirect(event, target + search, 301)
  })
})

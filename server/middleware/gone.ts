import { GONE_PATHS } from '#shared/site-pages'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (GONE_PATHS.includes(path)) throw createError({ statusCode: 410 })
})

import { isEmbedSession, isInsideFrame } from '../lib/embed-session'

// Выставляет липкий признак виджета: на сервере по первому адресу, в браузере
// ещё и по iframe. Никогда не сбрасывается. Имя файла идёт раньше metrika.
export default defineNuxtPlugin(() => {
  const state = useEmbedSession()
  if (state.value) return
  const path = import.meta.server ? useRequestURL().pathname : window.location.pathname
  const frame = import.meta.client ? isInsideFrame(window) : false
  if (isEmbedSession(path, frame)) state.value = true
})

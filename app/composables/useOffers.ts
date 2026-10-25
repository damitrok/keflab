import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createOffersCache,
  fetchOffers,
  isOfferActive,
  msUntilMoscowMidnight,
} from '../lib/offers-client'
import { isInsideFrame } from '../lib/embed-session'
import type { OfferPlacement, PublicOffer } from '#shared/offers-api'
import { useIsEmbed } from './useEmbed'

// Кеш ответа /api/geo с TTL 60 с (только в браузере): повторный запрос при
// навигации, если ответ старше; выключатель и сроки не залипают.
const load = createOffersCache((placement) => fetchOffers(placement))

/**
 * Офферы для места показа. Только в браузере после монтирования, никогда в
 * SSR-HTML. В виджете (/embed/, сеанс виджета, любой iframe) не ходит в
 * /api/geo вообще (ПРАВИЛО шага 12). Карточки с истёкшим validTo прячутся
 * на клиенте, в том числе по таймеру в полночь по Москве.
 */
export function useOffers(placement: OfferPlacement) {
  const isEmbed = useIsEmbed()
  const raw = ref<PublicOffer[]>([])
  const clock = ref(Date.now())
  let timer: ReturnType<typeof setTimeout> | null = null

  const offers = computed(() => {
    const now = new Date(clock.value)
    return raw.value.filter((o) => isOfferActive(o, now))
  })

  function schedule() {
    timer = setTimeout(
      () => {
        clock.value = Date.now()
        schedule()
      },
      msUntilMoscowMidnight(new Date()) + 1000,
    )
  }

  async function refresh() {
    const result = await load(placement)
    if (isEmbed.value) return
    clock.value = Date.now()
    raw.value = result
  }

  // Таймеры спят вместе с телефоном и замороженной вкладкой: при возврате
  // сразу пересчитываем сроки по реальным часам и перезапрашиваем /api/geo,
  // если кеш устарел (выключатель и сроки не «висят» после сна).
  function onWake() {
    if (document.visibilityState === 'hidden') return
    clock.value = Date.now()
    void refresh()
  }

  onMounted(async () => {
    if (isEmbed.value || isInsideFrame(window)) return
    schedule()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('pageshow', onWake)
    window.addEventListener('focus', onWake)
    await refresh()
  })
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    document.removeEventListener('visibilitychange', onWake)
    window.removeEventListener('pageshow', onWake)
    window.removeEventListener('focus', onWake)
  })

  return { offers, isEmbed }
}

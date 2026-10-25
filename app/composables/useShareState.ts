import { onMounted, ref, watch } from 'vue'
import { decodeShareQuery, encodeShareQuery, type DecodeResult } from '~/lib/share-state'
import type { SystemCalc } from './useSystemCalc'

export const SHARE_BROKEN_TEXT =
  'Ссылка на расчёт повреждена или устарела — показан расчёт по умолчанию.'

/** Разбор параметров расчёта из текущего адреса (работает и на сервере). */
export function useShareQuery(): DecodeResult {
  const route = useRoute()
  const url = useRequestURL()
  return decodeShareQuery(route.query, url.href.length)
}

/**
 * Синхронизация калькулятора с адресом: изменения полей пишутся в адрес через
 * history.replaceState (без новых записей в истории), ссылку можно скопировать.
 */
export function useShareState(calc: SystemCalc, decoded: DecodeResult) {
  const notice = ref<string | null>(decoded.kind === 'invalid' ? SHARE_BROKEN_TEXT : null)
  /** idle — ничего; copied — скопировано; manual — буфер недоступен, показать поле. */
  const copyState = ref<'idle' | 'copied' | 'manual'>('idle')
  const shareUrl = ref('')

  function currentUrl(): string {
    const query = encodeShareQuery(calc.snapshot.value)
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`
  }

  function syncAddress(): void {
    const url = currentUrl()
    shareUrl.value = url
    if (url !== window.location.href) {
      // Состояние роутера в history.state сохраняем как есть.
      window.history.replaceState(window.history.state, '', url)
    }
  }

  onMounted(() => {
    // Битую ссылку сразу заменяем чистым адресом, расчёт — по умолчанию.
    syncAddress()
    watch(calc.snapshot, () => {
      syncAddress()
      copyState.value = 'idle'
    })
  })

  async function copy(): Promise<void> {
    syncAddress()
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl.value)
      copyState.value = 'copied'
    } catch {
      // Встроенные браузеры мессенджеров часто не дают доступа к буферу.
      copyState.value = 'manual'
    }
  }

  return { notice, copyState, shareUrl, copy }
}

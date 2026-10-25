import { computed } from 'vue'

/** Выбор пользователя по cookie: null — ещё не выбирал. */
export type ConsentChoice = 'accepted' | 'rejected'

export const CONSENT_STORAGE_KEY = 'keflab:consent:v1'

function readChoice(): ConsentChoice | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return v === 'accepted' || v === 'rejected' ? v : null
  } catch {
    return null
  }
}

function writeChoice(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Хранилище недоступно — выбор действует до закрытия вкладки.
  }
}

/**
 * Согласие на cookie аналитики (Яндекс Метрика). Без «Принять» Метрика не
 * загружается. Состояние общее для баннера, подвала («Настройки cookie») и
 * плагина Метрики; на сервере выбор всегда неизвестен.
 */
export function useConsent() {
  const choice = useState<ConsentChoice | null>('consent-choice', () => null)
  /** Баннер открыт: выбора нет или пользователь открыл настройки. */
  const bannerOpen = useState<boolean>('consent-banner-open', () => false)
  const loaded = useState<boolean>('consent-loaded', () => false)

  /** Прочитать сохранённый выбор (только в браузере, после монтирования). */
  function load(): void {
    if (loaded.value) return
    loaded.value = true
    choice.value = readChoice()
    bannerOpen.value = choice.value === null
  }

  function accept(): void {
    choice.value = 'accepted'
    writeChoice('accepted')
    bannerOpen.value = false
  }

  function reject(): void {
    choice.value = 'rejected'
    writeChoice('rejected')
    bannerOpen.value = false
  }

  /** Ссылка «Настройки cookie» в подвале: снова показать выбор. */
  function openSettings(): void {
    bannerOpen.value = true
  }

  return {
    choice,
    bannerOpen,
    analyticsAllowed: computed(() => choice.value === 'accepted'),
    load,
    accept,
    reject,
    openSettings,
  }
}

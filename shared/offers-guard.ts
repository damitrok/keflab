// Выключатель офферов (шаг 7). Офферы можно включить только после
// регистрации сайта как СМИ и утверждённого предупреждения о рисках.

export interface OffersGuardSite {
  media: { registered: boolean }
  riskWarning: string
}

export type OffersGuardResult =
  | { enabled: true }
  | {
      enabled: false
      /** Флаг включён, но включать нельзя — это ошибка конфигурации. */
      misconfigured: boolean
      reason: string | null
    }

/** Значение переменной окружения OFFERS_ENABLED: включено только при «true». */
export function offersFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}

/** Можно ли показывать офферы при данном флаге и данных site.json. */
export function checkOffers(flag: boolean, site: OffersGuardSite): OffersGuardResult {
  if (!flag) return { enabled: false, misconfigured: false, reason: null }
  if (!site.media.registered) {
    return {
      enabled: false,
      misconfigured: true,
      reason:
        'OFFERS_ENABLED=true, но сайт не зарегистрирован как СМИ (data/site.json → media.registered = false). Офферы включать нельзя.',
    }
  }
  if (site.riskWarning.trim() === '') {
    return {
      enabled: false,
      misconfigured: true,
      reason:
        'OFFERS_ENABLED=true, но в data/site.json пусто riskWarning — утверждённое предупреждение о рисках обязательно при включённых офферах.',
    }
  }
  return { enabled: true }
}

import { useStorage } from 'nitropack/runtime/internal/storage'
import { todayMoscow } from '../../shared/bookmakers'
import { createStats, type DayStats, type StatsStorage } from './stats'
import { reportError } from './report-error'

// Хранилище `stats` настроено в nuxt.config.ts (nitro.storage, драйвер fs).
function nitroAdapter(): StatsStorage {
  const s = useStorage<DayStats>('stats')
  return {
    get: async (key) => (await s.getItem(key)) ?? null,
    set: (key, value) => s.setItem(key, value),
    keys: () => s.getKeys(),
    remove: (key) => s.removeItem(key),
  }
}

const stats = createStats({
  storage: {
    get: (k) => nitroAdapter().get(k),
    set: (k, v) => nitroAdapter().set(k, v),
    keys: () => nitroAdapter().keys(),
    remove: (k) => nitroAdapter().remove(k),
  },
  today: () => todayMoscow(),
  onError: (e) => reportError(e, { where: 'stats' }),
})

export const recordEvent = stats.recordEvent
export const readStats = stats.readStats

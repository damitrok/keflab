// Счётчики показов и кликов офферов (шаг 13): по erid и дням (по Москве),
// без cookie, IP и User-Agent. Хранение 13 месяцев. Без Nitro — адаптер
// хранилища передаётся снаружи (в бою useStorage('stats'), в тестах Map).

/** throttled — показ отброшен лимитом (накрутка или всплеск): считаем, чтобы отчёт можно было объяснить. */
export type StatEvent = 'impression' | 'click' | 'throttled'

export interface DayStats {
  impressions: number
  clicks: number
  /** Отброшенные лимитом показы; в старых записях поля нет. */
  throttled?: number
}

export interface StatsStorage {
  get(key: string): Promise<DayStats | null>
  set(key: string, value: DayStats): Promise<void>
  keys(): Promise<string[]>
  remove(key: string): Promise<void>
}

export interface StatRow extends DayStats {
  date: string
  erid: string
}

export const RETENTION_MONTHS = 13
/** Допустимый erid; «..» и точка в начале исключены (имя файла в хранилище). */
export const ERID_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/

export function isValidErid(erid: string): boolean {
  return ERID_RE.test(erid) && !erid.includes('..')
}

/** Дата за RETENTION_MONTHS месяцев до today (ГГГГ-ММ-ДД); день ограничивается длиной месяца. */
export function retentionCutoff(today: string, months = RETENTION_MONTHS): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) - months
  const ty = Math.floor(total / 12)
  const tm = total % 12
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(ty, 4)}-${pad(tm + 1)}-${pad(Math.min(d, last))}`
}

export interface StatsDeps {
  storage: StatsStorage
  /** Сегодня по Москве. */
  today: () => string
  onError?: (error: unknown) => void
}

export function createStats(deps: StatsDeps) {
  let queue: Promise<unknown> = Promise.resolve()
  let cleanedFor: string | null = null

  /** Операции идут строго по очереди: параллельные инкременты не теряются. */
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn)
    queue = run.catch(() => undefined)
    return run
  }

  async function cleanup(today: string): Promise<void> {
    const cutoff = retentionCutoff(today)
    for (const key of await deps.storage.keys()) {
      const date = key.split(':')[0] ?? ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff) await deps.storage.remove(key)
    }
  }

  return {
    /** false — erid недопустим, ничего не записано. */
    recordEvent(erid: string, event: StatEvent): Promise<boolean> {
      if (!isValidErid(erid)) return Promise.resolve(false)
      return enqueue(async () => {
        const today = deps.today()
        if (cleanedFor !== today) {
          cleanedFor = today
          try {
            await cleanup(today)
          } catch (error) {
            deps.onError?.(error)
          }
        }
        const key = `${today}:${erid}`
        const cur = (await deps.storage.get(key)) ?? { impressions: 0, clicks: 0 }
        const throttled = (cur.throttled ?? 0) + (event === 'throttled' ? 1 : 0)
        await deps.storage.set(key, {
          impressions: cur.impressions + (event === 'impression' ? 1 : 0),
          clicks: cur.clicks + (event === 'click' ? 1 : 0),
          // Поле пишется, только если были отброшенные показы.
          ...(throttled > 0 ? { throttled } : {}),
        })
        return true
      })
    },

    /** Строки за период [from, to] включительно (ГГГГ-ММ-ДД), по дате и erid. */
    readStats(from: string, to: string): Promise<StatRow[]> {
      return enqueue(async () => {
        const rows: StatRow[] = []
        for (const key of await deps.storage.keys()) {
          const i = key.indexOf(':')
          if (i === -1) continue
          const date = key.slice(0, i)
          if (date < from || date > to) continue
          const v = await deps.storage.get(key)
          if (v) rows.push({ date, erid: key.slice(i + 1), ...v })
        }
        return rows.sort((a, b) => a.date.localeCompare(b.date) || a.erid.localeCompare(b.erid))
      })
    },
  }
}

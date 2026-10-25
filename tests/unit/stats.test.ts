import { describe, expect, it } from 'vitest'
import {
  createStats,
  isValidErid,
  retentionCutoff,
  type DayStats,
  type StatsStorage,
} from '../../server/utils/stats'

function memory(): StatsStorage & { map: Map<string, DayStats> } {
  const map = new Map<string, DayStats>()
  return {
    map,
    // Пауза между чтением и записью проверяет, что очередь не теряет инкременты.
    get: async (k) => {
      await Promise.resolve()
      return map.get(k) ?? null
    },
    set: async (k, v) => {
      await Promise.resolve()
      map.set(k, v)
    },
    keys: async () => [...map.keys()],
    remove: async (k) => void map.delete(k),
  }
}

describe('stats', () => {
  it('считает показы и клики по дню и erid', async () => {
    const storage = memory()
    const s = createStats({ storage, today: () => '2026-10-25' })
    await s.recordEvent('E1', 'impression')
    await s.recordEvent('E1', 'impression')
    await s.recordEvent('E1', 'click')
    await s.recordEvent('E2', 'click')
    expect(storage.map.get('2026-10-25:E1')).toEqual({ impressions: 2, clicks: 1 })
    expect(storage.map.get('2026-10-25:E2')).toEqual({ impressions: 0, clicks: 1 })
  })
  it('100 параллельных инкрементов дают 100', async () => {
    const storage = memory()
    const s = createStats({ storage, today: () => '2026-10-25' })
    await Promise.all(Array.from({ length: 100 }, () => s.recordEvent('E1', 'impression')))
    expect(storage.map.get('2026-10-25:E1')?.impressions).toBe(100)
  })
  it('недопустимый erid не записывается', async () => {
    const storage = memory()
    const s = createStats({ storage, today: () => '2026-10-25' })
    expect(await s.recordEvent('a/../b', 'click')).toBe(false)
    expect(await s.recordEvent('a..b', 'click')).toBe(false)
    expect(storage.map.size).toBe(0)
    expect(isValidErid('Abc.1_2-3')).toBe(true)
    expect(isValidErid('a'.repeat(65))).toBe(false)
  })
  it('ошибка хранилища не ломает следующие записи', async () => {
    const storage = memory()
    let fail = true
    const s = createStats({
      storage: {
        ...storage,
        set: async (k, v) => {
          if (fail) throw new Error('disk')
          await storage.set(k, v)
        },
      },
      today: () => '2026-10-25',
    })
    await expect(s.recordEvent('E1', 'click')).rejects.toThrow('disk')
    fail = false
    await s.recordEvent('E1', 'click')
    expect(storage.map.get('2026-10-25:E1')?.clicks).toBe(1)
  })
  it('очистка: старше 13 месяцев удаляется при первой записи за день', async () => {
    const storage = memory()
    storage.map.set('2025-09-24:OLD', { impressions: 1, clicks: 0 })
    storage.map.set('2025-09-25:EDGE', { impressions: 1, clicks: 0 })
    storage.map.set('2026-01-01:NEW', { impressions: 1, clicks: 0 })
    const s = createStats({ storage, today: () => '2026-10-25' })
    await s.recordEvent('E1', 'click')
    expect(storage.map.has('2025-09-24:OLD')).toBe(false)
    expect(storage.map.has('2025-09-25:EDGE')).toBe(true)
    expect(storage.map.has('2026-01-01:NEW')).toBe(true)
  })
  it('очистка раз в день', async () => {
    const storage = memory()
    let day = '2026-10-25'
    const s = createStats({ storage, today: () => day })
    await s.recordEvent('E1', 'click')
    storage.map.set('2024-01-01:OLD', { impressions: 1, clicks: 0 })
    await s.recordEvent('E1', 'click')
    expect(storage.map.has('2024-01-01:OLD')).toBe(true)
    day = '2026-10-26'
    await s.recordEvent('E1', 'click')
    expect(storage.map.has('2024-01-01:OLD')).toBe(false)
  })
  it('readStats: период включительно, сортировка', async () => {
    const storage = memory()
    let day = '2026-10-24'
    const s = createStats({ storage, today: () => day })
    await s.recordEvent('B', 'impression')
    await s.recordEvent('A', 'click')
    day = '2026-10-25'
    await s.recordEvent('A', 'impression')
    day = '2026-10-26'
    await s.recordEvent('A', 'impression')
    expect(await s.readStats('2026-10-24', '2026-10-25')).toEqual([
      { date: '2026-10-24', erid: 'A', impressions: 0, clicks: 1 },
      { date: '2026-10-24', erid: 'B', impressions: 1, clicks: 0 },
      { date: '2026-10-25', erid: 'A', impressions: 1, clicks: 0 },
    ])
  })
})

describe('retentionCutoff', () => {
  it('13 месяцев назад', () => {
    expect(retentionCutoff('2026-10-25')).toBe('2025-09-25')
    expect(retentionCutoff('2026-01-10')).toBe('2024-12-10')
  })
  it('день ограничивается длиной месяца', () => {
    expect(retentionCutoff('2026-03-31')).toBe('2025-02-28')
  })
})

describe('отброшенные лимитом показы', () => {
  it('считаются отдельным полем throttled', async () => {
    const map = new Map<string, DayStats>()
    const stats = createStats({
      storage: {
        get: async (k) => map.get(k) ?? null,
        set: async (k, v) => void map.set(k, v),
        keys: async () => [...map.keys()],
        remove: async (k) => void map.delete(k),
      },
      today: () => '2026-10-25',
    })
    await stats.recordEvent('TEST1', 'impression')
    await stats.recordEvent('TEST1', 'throttled')
    await stats.recordEvent('TEST1', 'throttled')
    expect(map.get('2026-10-25:TEST1')).toEqual({ impressions: 1, clicks: 0, throttled: 2 })
  })
})

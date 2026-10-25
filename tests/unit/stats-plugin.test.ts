import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('server/plugins/stats-storage', () => {
  it('каталог статистики читается в рантайме, не при сборке', () => {
    const src = readFileSync(
      new URL('../../server/plugins/stats-storage.ts', import.meta.url),
      'utf8',
    )
    expect(src).toContain("mount('stats'")
    expect(src).toContain('process.env.KEFLAB_STATS_DIR')
  })
})

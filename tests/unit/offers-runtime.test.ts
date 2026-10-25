import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOffersSwitch } from '../../server/utils/offers'

const bad = { media: { registered: false }, riskWarning: '' }
const good = { media: { registered: true }, riskWarning: 'Ставки связаны с риском.' }

describe('createOffersSwitch', () => {
  let env: string | undefined
  const report = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    env = undefined
    report.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  const make = (site: typeof good) =>
    createOffersSwitch({ readFlag: () => env, site, report, now: () => Date.now() })

  it('флаг читается при каждом вызове: без перезапуска включается и выключается', () => {
    const enabled = make(good)
    expect(enabled()).toBe(false)
    env = 'true'
    expect(enabled()).toBe(true)
    env = 'false'
    expect(enabled()).toBe(false)
    expect(report).not.toHaveBeenCalled()
  })

  it('при misconfigured возвращает false и сообщает об ошибке', () => {
    env = 'true'
    expect(make(bad)()).toBe(false)
    expect(report).toHaveBeenCalledTimes(1)
    const [err, ctx] = report.mock.calls[0]!
    expect((err as Error).message).toContain('media.registered')
    expect(ctx).toEqual({ where: 'offers' })
  })

  it('одно и то же сообщение — не чаще раза в минуту', () => {
    env = 'true'
    const enabled = make(bad)
    enabled()
    enabled()
    vi.advanceTimersByTime(59_000)
    enabled()
    expect(report).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1_000)
    enabled()
    expect(report).toHaveBeenCalledTimes(2)
  })

  it('разные сообщения считаются отдельно', () => {
    env = 'true'
    make(bad)()
    make({ media: { registered: true }, riskWarning: '' })()
    expect(report).toHaveBeenCalledTimes(2)
  })
})

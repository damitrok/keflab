import { describe, expect, it } from 'vitest'
import { isEmbedSession, isInsideFrame, shouldBlockNavigation } from '../../app/lib/embed-session'

describe('сеанс виджета', () => {
  it('первый маршрут /embed/ или iframe', () => {
    expect(isEmbedSession('/embed/sistema/', false)).toBe(true)
    expect(isEmbedSession('/', true)).toBe(true)
    expect(isEmbedSession('/', false)).toBe(false)
  })
  it('iframe определяется по self !== top; ошибка доступа = iframe', () => {
    const a = {}
    expect(isInsideFrame({ self: a, top: a })).toBe(false)
    expect(isInsideFrame({ self: a, top: {} })).toBe(true)
    const bad = {
      self: 1,
      get top(): unknown {
        throw new Error('x')
      },
    }
    expect(isInsideFrame(bad)).toBe(true)
    expect(isInsideFrame(undefined)).toBe(false)
  })
  it('в виджете навигация вне /embed/ блокируется', () => {
    expect(shouldBlockNavigation(true, '/kalkulyatory/konverter-koefficientov/')).toBe(true)
    expect(shouldBlockNavigation(true, '/embed/sistema/')).toBe(false)
    expect(shouldBlockNavigation(false, '/kalkulyatory/')).toBe(false)
  })
})

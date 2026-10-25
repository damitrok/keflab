import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  METRIKA_PARAMS,
  METRIKA_SRC,
  parseCounterId,
  reachGoal,
  resetMetrikaForTests,
  setMetrikaEnabled,
  shouldLoadMetrika,
  type MetrikaDocument,
  type MetrikaWindow,
} from '../../app/lib/metrika'

function makeDoc() {
  const scripts: { src: string; onerror: (() => void) | null; async: boolean }[] = []
  const doc: MetrikaDocument = {
    createElement: () => {
      const s = { async: false, src: '', onerror: null as (() => void) | null }
      scripts.push(s)
      return s
    },
    head: { appendChild: () => undefined },
  }
  return { doc, scripts }
}

describe('metrika', () => {
  beforeEach(() => resetMetrikaForTests())

  it('parseCounterId принимает только цифры', () => {
    expect(parseCounterId('12345678')).toBe(12345678)
    expect(parseCounterId(12345678)).toBe(12345678)
    expect(parseCounterId(1.5)).toBeNull()
    expect(parseCounterId('')).toBeNull()
    expect(parseCounterId('abc')).toBeNull()
    expect(parseCounterId(undefined)).toBeNull()
    expect(parseCounterId('0')).toBeNull()
  })

  it('shouldLoadMetrika требует согласие и номер', () => {
    expect(shouldLoadMetrika(true, '1')).toBe(true)
    expect(shouldLoadMetrika(false, '1')).toBe(false)
    expect(shouldLoadMetrika(true, '')).toBe(false)
  })

  it('без согласия или номера скрипт не создаётся', () => {
    const { doc, scripts } = makeDoc()
    const win: MetrikaWindow = {}
    setMetrikaEnabled(win, doc, false, '123')
    setMetrikaEnabled(win, doc, true, '')
    expect(scripts).toHaveLength(0)
    expect(win.ym).toBeUndefined()
  })

  it('после согласия грузит tag.js один раз и делает init без Вебвизора', () => {
    const { doc, scripts } = makeDoc()
    const win: MetrikaWindow = {}
    setMetrikaEnabled(win, doc, true, '123')
    setMetrikaEnabled(win, doc, true, '123')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]!.src).toBe(METRIKA_SRC)
    expect(win.disableYaCounter123).toBe(false)
    expect(METRIKA_PARAMS.webvisor).toBe(false)
    expect(METRIKA_PARAMS.clickmap).toBe(false)
    expect(() => scripts[0]!.onerror?.()).not.toThrow()
  })

  it('после отклонения хиты отключаются, reachGoal молчит', () => {
    const { doc } = makeDoc()
    const ym = vi.fn()
    const win: MetrikaWindow = { ym }
    vi.stubGlobal('window', win)
    setMetrikaEnabled(win, doc, true, '123')
    ym.mockClear()
    reachGoal('calc_used')
    expect(ym).toHaveBeenCalledWith(123, 'reachGoal', 'calc_used')
    setMetrikaEnabled(win, doc, false, '123')
    expect(win.disableYaCounter123).toBe(true)
    ym.mockClear()
    reachGoal('calc_used')
    expect(ym).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('reachGoal не падает без window.ym', () => {
    const { doc } = makeDoc()
    const win: MetrikaWindow = {}
    vi.stubGlobal('window', win)
    setMetrikaEnabled(win, doc, true, '123')
    win.ym = undefined
    expect(() => reachGoal('x')).not.toThrow()
    vi.unstubAllGlobals()
  })
})

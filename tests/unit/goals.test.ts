import { describe, expect, it, vi } from 'vitest'
import { GOALS, createCalcUsedReporter, sendGoal } from '../../app/lib/goals'

describe('goals', () => {
  it('имена целей по ТЗ', () => {
    expect(Object.values(GOALS).sort()).toEqual(
      [
        'calc_used',
        'compare_opened',
        'offer_clicked',
        'offer_shown',
        'scenario_opened',
        'share_copied',
        'widget_code_copied',
      ].sort(),
    )
  })

  it('sendGoal вызывает reachGoal с именем и параметрами', () => {
    const send = vi.fn()
    sendGoal(GOALS.shareCopied, { manual: true }, send)
    expect(send).toHaveBeenCalledWith('share_copied', { manual: true })
  })

  it('sendGoal не бросает, если отправка упала', () => {
    const send = vi.fn(() => {
      throw new Error('x')
    })
    expect(() => sendGoal(GOALS.compareOpened, undefined, send)).not.toThrow()
  })

  it('calc_used: один раз и только после ввода пользователя', () => {
    const send = vi.fn()
    const r = createCalcUsedReporter('system', send)
    r.setReady(true) // восстановлено из localStorage/ссылки
    expect(send).not.toHaveBeenCalled()
    r.touch()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('calc_used', { calc: 'system' })
    r.setReady(false)
    r.setReady(true)
    r.touch()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('calc_used: ввод до готовности итога ждёт итог', () => {
    const send = vi.fn()
    const r = createCalcUsedReporter('express', send)
    r.touch()
    r.touch()
    expect(send).not.toHaveBeenCalled()
    r.setReady(true)
    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith('calc_used', { calc: 'express' })
  })
})

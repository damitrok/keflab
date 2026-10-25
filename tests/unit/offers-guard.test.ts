import { describe, expect, it } from 'vitest'
import { checkOffers, offersFlag } from '../../shared/offers-guard'

const registered = { media: { registered: true }, riskWarning: 'Ставки связаны с риском.' }
const notRegistered = { media: { registered: false }, riskWarning: 'Ставки связаны с риском.' }

describe('offersFlag', () => {
  it('выключен без значения и при пустой строке', () => {
    expect(offersFlag(undefined)).toBe(false)
    expect(offersFlag('')).toBe(false)
    expect(offersFlag('false')).toBe(false)
  })
  it('включается только значением true, регистр и пробелы не важны', () => {
    expect(offersFlag('true')).toBe(true)
    expect(offersFlag(' TRUE ')).toBe(true)
  })
  it('«1» и «yes» включением не считаются', () => {
    expect(offersFlag('1')).toBe(false)
    expect(offersFlag('yes')).toBe(false)
  })
})

describe('checkOffers', () => {
  it('флаг выключен: офферов нет, ошибки нет', () => {
    expect(checkOffers(false, notRegistered)).toEqual({
      enabled: false,
      misconfigured: false,
      reason: null,
    })
  })
  it('registered=false при включённом флаге: ошибка конфигурации с причиной', () => {
    const r = checkOffers(true, notRegistered)
    expect(r.enabled).toBe(false)
    expect(r).toMatchObject({ misconfigured: true })
    expect((r as { reason: string }).reason).toContain('media.registered')
  })
  it('registered=true, но riskWarning пуст или из пробелов: ошибка', () => {
    for (const riskWarning of ['', '   ']) {
      const r = checkOffers(true, { ...registered, riskWarning })
      expect(r).toMatchObject({ enabled: false, misconfigured: true })
      expect((r as { reason: string }).reason).toContain('riskWarning')
    }
  })
  it('registered=true и текст предупреждения: включено', () => {
    expect(checkOffers(true, registered)).toEqual({ enabled: true })
  })
})

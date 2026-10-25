import { describe, expect, it } from 'vitest'
import {
  MAX_BODY_BYTES,
  createRateLimiter,
  formatClientLine,
  isSameOriginReport,
  parseErrorBody,
  parseErrorReport,
} from '../../server/utils/error-intake'

const ok = { where: 'useSystemCalc', name: 'TypeError', message: 'boom' }

describe('error-intake: схема', () => {
  it('принимает корректное тело', () => {
    expect(parseErrorReport(ok)).toEqual(ok)
  })
  it('отбрасывает лишние поля', () => {
    expect(parseErrorReport({ ...ok, stack: 's', ip: '1.1.1.1' })).toEqual(ok)
  })
  it.each([
    ['нет where', { name: 'a', message: 'b' }],
    ['пустой where', { ...ok, where: '' }],
    ['where длиннее 64', { ...ok, where: 'a'.repeat(65) }],
    ['where с пробелом', { ...ok, where: 'a b' }],
    ['where с кириллицей', { ...ok, where: 'вью' }],
    ['name длиннее 64', { ...ok, name: 'a'.repeat(65) }],
    ['name с переводом строки', { ...ok, name: 'a\nb' }],
    ['message длиннее 500', { ...ok, message: 'a'.repeat(501) }],
    ['message не строка', { ...ok, message: 5 }],
    ['не объект', 'str'],
    ['null', null],
    ['массив', [ok]],
  ])('400: %s', (_, body) => {
    expect(parseErrorReport(body)).toBeNull()
  })
  it('граничные длины допустимы', () => {
    const edge = { where: 'a'.repeat(64), name: 'n'.repeat(64), message: 'm'.repeat(500) }
    expect(parseErrorReport(edge)).toEqual(edge)
  })
})

describe('error-intake: тело', () => {
  it('битый JSON → null', () => {
    expect(parseErrorBody('{oops')).toBeNull()
  })
  it('тело больше 2 КБ → null', () => {
    const big = JSON.stringify({ ...ok, extra: 'x'.repeat(MAX_BODY_BYTES) })
    expect(parseErrorBody(big)).toBeNull()
  })
  it('размер считается в байтах', () => {
    const msg = 'я'.repeat(500) // 1000 байт, плюс лишнее поле до превышения 2 КБ
    const body = JSON.stringify({ ...ok, message: msg, pad: 'я'.repeat(600) })
    expect(parseErrorBody(body)).toBeNull()
  })
  it('валидное тело', () => {
    expect(parseErrorBody(JSON.stringify(ok))).toEqual(ok)
  })
})

describe('error-intake: строка лога', () => {
  it('формат client:<where>: <name>: <message>', () => {
    expect(formatClientLine(ok)).toBe('client:useSystemCalc: TypeError: boom')
  })
  it('переводы строк в сообщении не рвут строку лога', () => {
    expect(formatClientLine({ ...ok, message: 'a\n[keflab] fake\r\nb' })).not.toMatch(/[\r\n]/)
  })
})

describe('error-intake: лимит', () => {
  it('не больше 60 в минуту, дальше отбрасывает, потом окно сбрасывается', () => {
    const l = createRateLimiter()
    const t = 1_000_000
    const accepted = Array.from({ length: 70 }, (_, i) => l.take(t + i)).filter(Boolean)
    expect(accepted).toHaveLength(60)
    expect(l.take(t + 59_000)).toBe(false)
    expect(l.take(t + 60_001)).toBe(true)
  })
})

describe('находки ревью безопасности', () => {
  it('C1 и символы смены направления в name отвергаются, в message — заменяются', () => {
    expect(parseErrorReport({ where: 'x', name: 'A\u202eB', message: 'm' })).toBeNull()
    expect(parseErrorReport({ where: 'x', name: 'A\u0085B', message: 'm' })).toBeNull()
    const r = parseErrorReport({ where: 'x', name: 'Error', message: 'a\u202eb\u0085c\nd' })
    expect(r && formatClientLine(r)).toBe('client:x: Error: a b c d')
  })

  it('отчёты с чужих сайтов отбрасываются', () => {
    expect(isSameOriginReport({ origin: 'https://keflab.ru' }, 'keflab.ru')).toBe(true)
    expect(isSameOriginReport({ origin: 'https://evil.example' }, 'keflab.ru')).toBe(false)
    expect(isSameOriginReport({ secFetchSite: 'cross-site' }, 'keflab.ru')).toBe(false)
    expect(isSameOriginReport({ secFetchSite: 'same-origin' }, 'keflab.ru')).toBe(true)
    expect(isSameOriginReport({}, 'keflab.ru')).toBe(true)
    expect(isSameOriginReport({ origin: 'null' }, 'keflab.ru')).toBe(false)
  })
})

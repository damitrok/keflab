import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkLinks, findViolationsInText, isHostAllowed } from '../../scripts/check-links.ts'

const root = (name: string) => resolve(import.meta.dirname, '..', 'fixtures', name)

describe('isHostAllowed', () => {
  it('разрешает собственный домен и поддомены', () => {
    expect(isHostAllowed('keflab.ru', [])).toBe(true)
    expect(isHostAllowed('staging.keflab.ru', [])).toBe(true)
  })
  it('не принимает похожие домены', () => {
    expect(isHostAllowed('evilkeflab.ru', [])).toBe(false)
    expect(isHostAllowed('keflab.ru.evil.com', [])).toBe(false)
  })
  it('поддомен разрешён, если разрешён родитель', () => {
    expect(isHostAllowed('a.example.org', ['example.org'])).toBe(true)
    expect(isHostAllowed('example.org', ['a.example.org'])).toBe(false)
  })
})

describe('findViolationsInText', () => {
  it('находит абсолютный и протокол-относительный URL с номером строки', () => {
    const text = 'a\n<a href="https://example.com/x">\n<script src="//cdn.example.net/a.js">'
    const v = findViolationsInText(text, 'f.vue', [])
    expect(v.map((x) => [x.line, x.url])).toEqual([
      [2, 'https://example.com/x'],
      [3, '//cdn.example.net/a.js'],
    ])
  })
  it('игнорирует пространства имён XML и schema.org context', () => {
    const text =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
    expect(findViolationsInText(text, 'f.vue', [])).toEqual([])
    expect(findViolationsInText('"@context":"https://schema.org"', 'f.json', [])).toEqual([])
  })
  it('не считает ссылкой комментарий и часть пути', () => {
    expect(findViolationsInText('// пример a.b.com\nconst p = "x//y.com"', 'f.ts', [])).toEqual([])
  })
  it('проверяет trackingUrl в offers.json', () => {
    const json = '{"offers":[{"trackingUrl":"https://bk.example.com/?r=1"}]}'
    expect(findViolationsInText(json, 'data/offers.json', [])).toHaveLength(1)
    expect(findViolationsInText(json, 'data/offers.json', ['example.com'])).toHaveLength(0)
  })
})

describe('checkLinks на фикстурах', () => {
  it('links-bad даёт нарушение', () => {
    const r = checkLinks(root('links-bad'))
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]).toMatchObject({ file: 'app/pages/bad-link.vue', line: 2 })
  })
  it('links-good проходит', () => {
    const r = checkLinks(root('links-good'))
    expect(r.violations).toEqual([])
    expect(r.filesChecked).toBeGreaterThan(0)
  })
})

describe('CLI', () => {
  const run = (name: string) =>
    spawnSync(process.execPath, ['scripts/check-links.ts', '--root', `tests/fixtures/${name}`], {
      cwd: resolve(import.meta.dirname, '..', '..'),
      encoding: 'utf8',
    })
  it('links-bad: код 1 и сообщение в stderr', () => {
    const r = run('links-bad')
    expect(r.status).toBe(1)
    expect(r.stderr).toContain(
      'app/pages/bad-link.vue:2 → домен не в data/allowlist.json: https://example.com',
    )
  })
  it('links-good: код 0', () => {
    expect(run('links-good').status).toBe(0)
  })
})

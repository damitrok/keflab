import { describe, expect, it } from 'vitest'
import {
  buildResizeScript,
  buildWidgetCode,
  isEmbedPath,
  normalizeWidth,
} from '../../app/lib/widget-code'

describe('buildWidgetCode', () => {
  const code = buildWidgetCode({ width: 480, theme: 'light', id: 'w1' })

  it('iframe с title, src и темой', () => {
    expect(code).toMatch(/<iframe [^>]*title="Калькулятор системы ставок keflab\.ru"/)
    expect(code).toContain('src="https://keflab.ru/embed/sistema/?theme=light"')
    expect(code).toContain('width="480"')
    expect(code).toContain('loading="lazy"')
    expect(code).toContain('</iframe>')
  })

  it('тема по умолчанию тёмная, мусор — тоже', () => {
    expect(buildWidgetCode({ id: 'w' })).toContain('?theme=dark')
    expect(buildWidgetCode({ theme: '"><b>', id: 'w' })).toContain('?theme=dark"')
  })

  it('ширина валидируется', () => {
    expect(normalizeWidth('100%')).toBe('100%')
    expect(normalizeWidth(320)).toBe(320)
    expect(normalizeWidth('1200')).toBe(1200)
    for (const bad of [319, 1201, 400.5, 'abc', '"><x', NaN, null, undefined, -1]) {
      expect(normalizeWidth(bad)).toBe('100%')
    }
    expect(buildWidgetCode({ width: 'мусор', id: 'w' })).toContain('width="100%"')
  })

  it('подпись-ссылка на keflab.ru', () => {
    expect(code).toContain(
      '<p><a href="https://keflab.ru/" target="_blank" rel="noopener">Калькулятор системы — keflab.ru</a></p>',
    )
  })

  it('скрипт проверяет origin, source, тип и диапазон высоты', () => {
    const script = code.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? ''
    expect(script).toContain('e.origin!=="https://keflab.ru"')
    expect(script).toContain('e.source!==f.contentWindow')
    expect(script).toContain('d.type!=="keflab:height"')
    expect(script).toContain('isFinite(h)')
    expect(script).toContain('h<200||h>5000')
    expect(script).toContain('getElementById("w1")')
    expect(() => new Function(script)).not.toThrow()
  })

  it('origin можно передать (для тестов), мусорный — заменяется', () => {
    const local = buildWidgetCode({ origin: 'http://localhost:3380', id: 'w' })
    expect(local).toContain('src="http://localhost:3380/embed/sistema/')
    expect(local).toContain('e.origin!=="http://localhost:3380"')
    const bad = buildWidgetCode({ origin: 'javascript:alert(1)//', id: 'w' })
    expect(bad).toContain('src="https://keflab.ru/embed/')
  })

  it('id экранируется или заменяется случайным; два виджета — разные id', () => {
    const a = buildWidgetCode({ id: '"><script>' })
    const b = buildWidgetCode({})
    const idA = a.match(/<iframe id="([^"]+)"/)?.[1]
    const idB = b.match(/<iframe id="([^"]+)"/)?.[1]
    expect(idA).toMatch(/^keflab-widget-/)
    expect(idA).not.toBe(idB)
    expect(a).not.toContain('"><script>')
  })

  it('внешние ссылки только на keflab.ru', () => {
    const urls = code.match(/https?:\/\/[^"'\s)]+/g) ?? []
    expect(urls.length).toBeGreaterThan(0)
    for (const u of urls) expect(u.startsWith('https://keflab.ru')).toBe(true)
  })

  it('скрипт, собранный отдельно, не закрывает тег', () => {
    expect(buildResizeScript('a', 'https://keflab.ru')).not.toContain('</')
  })
})

describe('isEmbedPath', () => {
  it('только /embed/', () => {
    expect(isEmbedPath('/embed/sistema/')).toBe(true)
    expect(isEmbedPath('/embed')).toBe(true)
    expect(isEmbedPath('/')).toBe(false)
    expect(isEmbedPath('/embedded/')).toBe(false)
    expect(isEmbedPath('/vidzhet/')).toBe(false)
  })
})

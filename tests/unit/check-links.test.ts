import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  checkInternalLinks,
  checkOfferLinks,
  checkLinks,
  extractInternalLinks,
  findViolationsInText,
  isHostAllowed,
  probeUrl,
  USER_AGENT,
  type OfferLike,
  type PageResponse,
} from '../../scripts/check-links.ts'

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

describe('внутренние ссылки', () => {
  const getter = (map: Record<string, PageResponse>) => async (p: string) =>
    map[p] ?? { status: 404 }

  it('извлекает только a[href^="/"] без query, hash и /go/', () => {
    const html = `<a href="/a/?x=1#h">1</a><a href='/b/'>2</a><a href="//cdn.x/">3</a>
      <a href="https://keflab.ru/">4</a><a href="/go/o1/">5</a><link href="/css">
      <a class="c" href="/a/">6</a><a href="#top">7</a>`
    expect(extractInternalLinks(html)).toEqual(['/a/', '/b/'])
  })

  it('все целы: 200 и 301 на живую страницу', async () => {
    const r = await checkInternalLinks(
      getter({
        '/': { status: 200, html: '<a href="/x/">x</a><a href="/old/">o</a>' },
        '/x/': { status: 200, html: '' },
        '/old/': { status: 301, location: '/x/' },
      }),
      ['/'],
    )
    expect(r.problems).toEqual([])
    expect(r.linksChecked).toBe(2)
  })

  it('битые 404, 410, 500 и редирект на битую страницу', async () => {
    const r = await checkInternalLinks(
      getter({
        '/': {
          status: 200,
          html: '<a href="/a/"></a><a href="/b/"></a><a href="/c/"></a><a href="/d/"></a>',
        },
        '/b/': { status: 410 },
        '/c/': { status: 500 },
        '/d/': { status: 308, location: 'http://localhost:3195/zzz/' },
      }),
      ['/'],
    )
    expect(r.problems).toEqual([
      'страница /: битая ссылка /a/ (404)',
      'страница /: битая ссылка /b/ (410)',
      'страница /: битая ссылка /c/ (500)',
      'страница /: битая ссылка /d/ (308 на /zzz/, а там 404)',
    ])
  })

  it('страница реестра, не отвечающая 200, — ошибка', async () => {
    const r = await checkInternalLinks(getter({}), ['/embed/sistema/'])
    expect(r.problems).toEqual(['страница /embed/sistema/: отвечает 404, ожидается 200'])
  })
})

describe('внешние ссылки офферов', () => {
  const offer = (over: Partial<OfferLike> = {}): OfferLike => ({
    id: 'o1',
    erid: 'E123',
    trackingUrl: 'https://track.example.org/c?a=1',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    ...over,
  })
  const today = '2026-06-01'
  const res = (status: number, location?: string) =>
    new Response(null, { status, headers: location ? { location } : {} })
  type Call = { url: string; method: string; headers: Record<string, string> }
  const mock = (handler: (c: Call, n: number) => Response | Promise<Response>) => {
    const calls: Call[] = []
    const fn = (async (url: string, init: RequestInit) => {
      const c = {
        url,
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
        signal: init.signal,
      }
      calls.push(c)
      return handler(c, calls.length)
    }) as unknown as typeof fetch
    return { fn, calls }
  }
  const run = (o: OfferLike[], m: ReturnType<typeof mock>, timeoutMs?: number) =>
    checkOfferLinks(o, { fetch: m.fn, today, timeoutMs })

  it('200: ок, erid добавлен, UA задан, cookie нет', async () => {
    const m = mock(() => res(200))
    const r = await run([offer()], m)
    expect(r).toEqual({ offersChecked: 1, problems: [] })
    expect(m.calls[0]!.method).toBe('HEAD')
    expect(m.calls[0]!.url).toContain('erid=E123')
    expect(m.calls[0]!.headers['user-agent']).toBe(USER_AGENT)
    expect(Object.keys(m.calls[0]!.headers).map((k) => k.toLowerCase())).not.toContain('cookie')
  })

  it('302 -> 200: ок', async () => {
    const m = mock((_c, n) => (n === 1 ? res(302, '/final') : res(200)))
    expect((await run([offer()], m)).problems).toEqual([])
    expect(m.calls[1]!.url).toBe('https://track.example.org/final')
  })

  it('404 и 500: сообщение о снятии оффера', async () => {
    for (const code of [404, 500]) {
      const r = await run(
        [offer()],
        mock(() => res(code)),
      )
      expect(r.problems).toEqual([
        `оффер o1 (erid E123): трекинговая ссылка отвечает HTTP ${code} — снимите оффер (validTo вчерашней датой)`,
      ])
    }
  })

  it('таймаут', async () => {
    const m = mock(
      (c) =>
        new Promise<Response>((_, reject) => {
          ;(c as unknown as { signal: AbortSignal }).signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          )
        }),
    )
    const r = await run([offer()], m, 20)
    expect(r.problems[0]).toContain('отвечает таймаут')
  })

  it('ошибка сети', async () => {
    const r = await run(
      [offer()],
      mock(() => Promise.reject(new Error('ECONNREFUSED'))),
    )
    expect(r.problems[0]).toContain('ошибка сети (ECONNREFUSED)')
  })

  it('HEAD 405 -> GET 200', async () => {
    const m = mock((c) => (c.method === 'HEAD' ? res(405) : res(200)))
    expect((await run([offer()], m)).problems).toEqual([])
    expect(m.calls.map((c) => c.method)).toEqual(['HEAD', 'GET'])
  })

  it('больше 5 редиректов — ошибка', async () => {
    const r = await run(
      [offer()],
      mock(() => res(302, '/again')),
    )
    expect(r.problems[0]).toContain('больше 5 редиректов')
  })

  it('офферы вне дат не проверяются; пустой список — 0 запросов', async () => {
    const m = mock(() => res(500))
    const r = await run(
      [offer({ validTo: '2026-05-31' }), offer({ id: 'o2', validFrom: '2026-06-02' })],
      m,
    )
    expect(r).toEqual({ offersChecked: 0, problems: [] })
    expect((await run([], m)).offersChecked).toBe(0)
    expect(m.calls).toHaveLength(0)
  })

  it('граничные даты включительно', async () => {
    const m = mock(() => res(200))
    const r = await run([offer({ validFrom: today, validTo: today })], m)
    expect(r.offersChecked).toBe(1)
  })

  it('probeUrl без сети: 204 жив', async () => {
    expect(await probeUrl('https://a.example.org/', mock(() => res(204)).fn)).toBeNull()
  })
})

describe('CLI режимы', () => {
  const cwd = resolve(import.meta.dirname, '..', '..')
  it('--external на пустых офферах: код 0', () => {
    const r = spawnSync(process.execPath, ['scripts/check-links.ts', '--external'], {
      cwd,
      encoding: 'utf8',
    })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('офферов проверено 0')
  })
  it('--internal без сборки: код 1', () => {
    const r = spawnSync(
      process.execPath,
      ['scripts/check-links.ts', '--root', 'tests/fixtures/links-good', '--internal'],
      { cwd, encoding: 'utf8' },
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('нет сборки')
  })
})

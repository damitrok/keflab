import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { buildWidgetCode } from '../../app/lib/widget-code'

// Диапазоны по 20 портов на воркера — не пересекаются между собой и с другими спеками.
const HOST_PORT = 3400
const OFFERS_PORT = 3420
const METRIKA_PORT = 3440
const STORAGE_KEY = 'keflab:consent:v1'

function plain(text: string | null): string {
  return (text ?? '').replace(new RegExp('[\\u00a0\\u202f]', 'g'), ' ')
}

async function startSite(port: number, env: Record<string, string>): Promise<ChildProcess> {
  const child = spawn('node', ['.output/server/index.mjs'], {
    env: { ...process.env, PORT: String(port), NITRO_PORT: String(port), ...env },
    stdio: 'ignore',
  })
  const deadline = Date.now() + 30_000
  for (;;) {
    try {
      const res = await fetch(`http://localhost:${port}/`)
      if (res.ok) return child
    } catch {
      // сервер ещё стартует
    }
    if (Date.now() > deadline) {
      child.kill('SIGTERM')
      throw new Error(`сервер на порту ${port} не поднялся`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }
}

/** Реальный размер контента внутри фрейма. */
async function contentHeight(page: Page): Promise<number> {
  const handle = await page.locator('iframe').first().elementHandle()
  const frame = await handle!.contentFrame()
  return frame!.evaluate(() => document.documentElement.scrollHeight)
}

async function iframeHeight(page: Page): Promise<number> {
  return page
    .locator('iframe')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height)
}

test.describe('виджет на странице с другого домена', () => {
  test.describe.configure({ mode: 'serial' })

  let host: Server
  let siteOrigin = ''
  let hostOrigin = ''

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    const sitePort = Number(process.env.E2E_PORT ?? 3100)
    siteOrigin = `http://localhost:${sitePort}`
    const port = HOST_PORT + testInfo.parallelIndex
    hostOrigin = `http://127.0.0.1:${port}`
    const code = buildWidgetCode({ width: '100%', theme: 'light', origin: siteOrigin })
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Чужой сайт</title></head><body><h1>Чужой сайт</h1>${code}</body></html>`
    host = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    })
    await new Promise<void>((resolve) => host.listen(port, '127.0.0.1', resolve))
  })

  test.afterAll(() => {
    host?.close()
  })

  test('iframe грузится, калькулятор и 18+ работают, высота подстраивается', async ({ page }) => {
    await page.goto(hostOrigin)
    expect(new URL(page.url()).origin).not.toBe(siteOrigin)
    const iframe = page.locator('iframe')
    await expect(iframe).toHaveCount(1)
    await expect(iframe).toHaveAttribute('title', /.+/)
    const frame = page.frameLocator('iframe')

    await expect(frame.getByText('18+').first()).toBeVisible()

    await frame.getByLabel('Сумма ставки, ₽').fill('3000')
    const label = (n: number) => frame.getByLabel(`Коэффициент события ${n}`, { exact: true })
    const status = (n: number) => frame.getByLabel(`Исход события ${n}`, { exact: true })
    await label(1).fill('1,80')
    await label(2).fill('2,10')
    await label(3).fill('1,65')
    await status(1).selectOption('win')
    await status(2).selectOption('win')
    await status(3).selectOption('lose')
    await expect
      .poll(async () => plain(await frame.getByTestId('payout').textContent()))
      .toContain('3 780,00 ₽')

    // Высота подстроилась: не исходные 640 и примерно равна контенту.
    await expect
      .poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page))), {
        timeout: 10_000,
      })
      .toBeLessThanOrEqual(20)
    const before = await iframeHeight(page)

    // Новое событие увеличивает контент, а с ним и высоту iframe.
    await frame.getByRole('button', { name: 'Добавить событие' }).click()
    await expect.poll(() => iframeHeight(page), { timeout: 10_000 }).toBeGreaterThan(before)
    await expect
      .poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page))), {
        timeout: 10_000,
      })
      .toBeLessThanOrEqual(20)
  })

  test('сообщение с чужого origin или неверного типа высоту не меняет', async ({ page }) => {
    await page.goto(hostOrigin)
    await expect(page.frameLocator('iframe').getByText('18+').first()).toBeVisible()
    await expect
      .poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page))), {
        timeout: 10_000,
      })
      .toBeLessThanOrEqual(20)
    const before = await iframeHeight(page)
    await page.evaluate(() => {
      // Источник — сама страница хоста: и origin, и source не от виджета.
      window.postMessage({ type: 'keflab:height', height: 1234 }, '*')
      window.postMessage({ type: 'other:height', height: 1234 }, '*')
      window.postMessage({ type: 'keflab:height', height: 99999 }, '*')
    })
    await page.waitForTimeout(500)
    expect(Math.abs((await iframeHeight(page)) - before)).toBeLessThanOrEqual(1)
  })
})

test.describe('/embed/sistema/: заголовки и разметка', () => {
  test('заголовки, noindex, нет шапки и подвала', async ({ request }) => {
    const res = await request.get('/embed/sistema/')
    expect(res.status()).toBe(200)
    const headers = res.headers()
    expect(headers['content-security-policy']).toContain('frame-ancestors *')
    expect(headers['x-robots-tag']).toContain('noindex')
    const html = await res.text()
    expect(html).toMatch(/<meta[^>]+name="robots"[^>]+noindex/i)
    expect(html).not.toMatch(/<header[^>]+class="[^"]*site-header/)
    expect(html).not.toContain('<footer')
    expect(html).toContain('keflab.ru')
    expect(html).toContain('18+')
  })

  test('остальные страницы нельзя встраивать с любых сайтов', async ({ request }) => {
    for (const path of ['/', '/vidzhet/']) {
      const res = await request.get(path)
      expect(res.headers()['content-security-policy'] ?? '').not.toContain('frame-ancestors *')
    }
  })

  test('/embed/ нет в sitemap.xml', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).not.toContain('/embed/')
    expect(xml).toContain('/vidzhet/')
  })

  test('тема из ?theme= попадает в SSR-HTML', async ({ request }) => {
    const light = await (await request.get('/embed/sistema/?theme=light')).text()
    const dark = await (await request.get('/embed/sistema/?theme=dark')).text()
    expect(light).toMatch(/<html[^>]+class="[^"]*theme-light/)
    expect(dark).toMatch(/<html[^>]+class="[^"]*theme-dark/)
    expect(light).not.toMatch(/<html[^>]+theme-dark/)
  })

  for (const theme of ['light', 'dark']) {
    test(`axe: тема ${theme} без serious/critical`, async ({ page }) => {
      await page.goto(`/embed/sistema/?theme=${theme}`)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).analyze()
      const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
      expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  }
})

test.describe('/embed/sistema/ при OFFERS_ENABLED=true', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(90_000)
  let server: ChildProcess | undefined
  let origin = ''

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    const port = OFFERS_PORT + testInfo.parallelIndex
    origin = `http://localhost:${port}`
    server = await startSite(port, { OFFERS_ENABLED: 'true' })
  })

  test.afterAll(() => {
    server?.kill('SIGTERM')
  })

  test('в виджете нет офферов, «Реклама» и ссылок на /go/', async ({ page, request }) => {
    // media.registered=false, поэтому выключатель закрыт и сам по себе.
    const geo = await (await request.get(`${origin}/api/geo`)).json()
    expect(geo.offersEnabled).toBe(false)

    await page.goto(`${origin}/embed/sistema/`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Реклама')).toHaveCount(0)
    await expect(page.locator('a[href*="/go/"]')).toHaveCount(0)
    await expect(page.locator('[data-testid*="offer" i], [data-offers]')).toHaveCount(0)
    const html = await page.content()
    expect(html).not.toContain('/go/')
    // TODO(step 13): когда появится модуль офферов, усилить тест: включить
    // выключатель по-настоящему и проверить, что компонент офферов не рендерится.
  })
})

test.describe('/embed/sistema/: Метрика', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(90_000)
  let server: ChildProcess | undefined
  let origin = ''

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    const port = METRIKA_PORT + testInfo.parallelIndex
    origin = `http://localhost:${port}`
    server = await startSite(port, { NUXT_PUBLIC_METRIKA_ID: '12345678' })
  })

  test.afterAll(() => {
    server?.kill('SIGTERM')
  })

  test('при принятом согласии запросов к mc.yandex.ru нет', async ({ page }) => {
    const urls: string[] = []
    page.on('request', (r) => {
      if (/mc\.yandex\.ru/.test(r.url())) urls.push(r.url())
    })
    await page.addInitScript((key) => localStorage.setItem(key, 'accepted'), STORAGE_KEY)
    await page.goto(`${origin}/embed/sistema/`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    expect(urls).toEqual([])
    // Контроль: на обычной странице при тех же условиях счётчик грузится.
    const tag = page.waitForRequest(/mc\.yandex\.ru/, { timeout: 10_000 }).catch(() => null)
    await page.route(/mc\.yandex\.ru/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    )
    await page.goto(`${origin}/`)
    expect(await tag).not.toBeNull()
  })
})

test.describe('/vidzhet/: генератор кода', () => {
  test('страница, крошки, код и превью', async ({ page }) => {
    const res = await page.goto('/vidzhet/')
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: /крошки|Навигация/i })).toBeVisible()

    const code = page.getByRole('textbox', { name: 'Код для вставки' })
    await expect(code).toHaveValue(/<iframe/)
    await expect(code).toHaveValue(/title=/)
    await expect(page.locator('iframe').first()).toBeAttached()

    await page.getByLabel('Тёмная').check()
    await expect(code).toHaveValue(/theme=dark/)
    await page.getByLabel('Светлая').check()
    await expect(code).toHaveValue(/theme=light/)
    await expect(code).toHaveValue(/width="100%"/)

    await page.getByLabel('Своя ширина, px').check()
    await page.getByLabel('Ширина в пикселях').fill('480')
    await expect(code).toHaveValue(/width="480"/)
    await expect(page.locator('iframe').first()).toHaveAttribute('src', /theme=light/)
  })

  test('«Скопировать код» кладёт код в буфер', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard-разрешения только в chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/vidzhet/')
    await page.waitForLoadState('networkidle')
    const value = await page.getByRole('textbox', { name: 'Код для вставки' }).inputValue()
    await page.getByRole('button', { name: 'Скопировать код' }).click()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toBe(value)
  })
})

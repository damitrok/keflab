import { createServer, type Server } from 'node:http'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

// e2e модуля офферов (шаг 13) на копии проекта с тестовыми данными.
// Запуск: node scripts/gates/offers-e2e.mjs (поднимает копию и сервер).

const ON = 'http://localhost:3470'
const OFF = 'http://localhost:3471'
const COPY = process.env.OFFERS_COPY_DIR ?? ''
const STATS_DIR = process.env.OFFERS_STATS_DIR ?? ''
const COUNTRY = 'X-Keflab-Country'

interface TestOffer {
  id: string
  erid: string
  advertiserName: string
  advertiserInn: string
  title: string
}
const offers: TestOffer[] = JSON.parse(readFileSync(`${COPY}/data/offers.json`, 'utf8'))
const site = JSON.parse(readFileSync(`${COPY}/data/site.json`, 'utf8')) as { riskWarning: string }
const offer = (id: string): TestOffer => {
  const found = offers.find((o) => o.id === id)
  if (!found) throw new Error(`нет оффера ${id} в фикстуре`)
  return found
}

function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

/** Заголовок страны в запросах страницы к /api/* и /go/* (как это делает Nginx). */
async function withCountry(page: Page | BrowserContext, country: string | null): Promise<void> {
  await page.route(/\/(api\/(geo|stat)|go\/)/, (route) => {
    const headers = Object.fromEntries(
      Object.entries(route.request().headers()).filter(([k]) => k !== COUNTRY.toLowerCase()),
    )
    return route.continue({ headers: country ? { ...headers, [COUNTRY]: country } : headers })
  })
}

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

async function fillCoupon(page: Page): Promise<void> {
  await page.getByLabel('Сумма ставки, ₽').fill('3000')
  await page.getByLabel('Коэффициент события 1', { exact: true }).fill('1,80')
  await page.getByLabel('Коэффициент события 2', { exact: true }).fill('2,10')
  await page.getByLabel('Коэффициент события 3', { exact: true }).fill('1,65')
  await page.getByLabel('Исход события 1', { exact: true }).selectOption('win')
  await page.getByLabel('Исход события 2', { exact: true }).selectOption('win')
  await page.getByLabel('Исход события 3', { exact: true }).selectOption('lose')
  await expect
    .poll(async () => plain(await page.getByTestId('payout').textContent()))
    .toContain('3 780,00 ₽')
}

async function openCalc(page: Page, base = ON): Promise<void> {
  await page.goto(`${base}/`)
  await page.waitForLoadState('networkidle')
  await fillCoupon(page)
}

const block = (page: Page) => page.getByTestId('offer-block')
const card = (page: Page, o: TestOffer) =>
  page.getByTestId('offer-card').filter({ hasText: o.erid })

async function go(request: APIRequestContext, id: string, country: string | null, base = ON) {
  return request.get(`${base}/go/${id}`, {
    maxRedirects: 0,
    headers: country ? { [COUNTRY]: country } : {},
  })
}

/** Счётчики за день: файл хранилища `<каталог>/<дата>/<erid>` (ключ «дата:erid»). */
function readDayStats(date: string, erid: string): { impressions: number; clicks: number } | null {
  const walk = (dir: string, prefix: string): { impressions: number; clicks: number } | null => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      const key = prefix ? `${prefix}:${name}` : name
      if (statSync(p).isDirectory()) {
        const found = walk(p, key)
        if (found) return found
      } else if (key === `${date}:${erid}`) {
        return JSON.parse(readFileSync(p, 'utf8'))
      }
    }
    return null
  }
  return walk(STATS_DIR, '')
}

test.describe('офферы: показ в браузере', () => {
  test('RU: блок под результатом, видимые карточки и юридические поля', async ({ page }) => {
    const errors = trackConsoleErrors(page)
    await withCountry(page, 'RU')
    await openCalc(page)

    const b = block(page)
    await expect(b).toBeVisible()
    await expect(b).toHaveAttribute('aria-label', 'Реклама')
    expect(await b.evaluate((el) => el.tagName)).toBe('ASIDE')
    // блок лежит ниже результата расчёта
    const resultBox = await page.getByTestId('payout').boundingBox()
    const blockBox = await b.boundingBox()
    expect(blockBox!.y).toBeGreaterThanOrEqual(resultBox!.y + resultBox!.height - 1)

    await expect(card(page, offer('ok'))).toHaveCount(1)
    await expect(card(page, offer('today-last'))).toHaveCount(1)
    for (const id of ['expired', 'future', 'not-ru', 'bad-domain']) {
      await expect(card(page, offer(id))).toHaveCount(0)
      await expect(page.getByText(offer(id).erid)).toHaveCount(0)
    }

    const ok = offer('ok')
    const c = card(page, ok)
    await expect(c.getByTestId('offer-label')).toHaveText('Реклама')
    await expect(c.getByTestId('offer-erid')).toContainText(`erid: ${ok.erid}`)
    await expect(c.getByTestId('offer-advertiser')).toContainText(ok.advertiserName)
    await expect(c.getByTestId('offer-advertiser')).toContainText(ok.advertiserInn)
    await expect(c).toContainText('18+')
    await expect(c).toContainText(site.riskWarning)
    const link = c.locator('a')
    await expect(link).toHaveAttribute('href', `/go/${ok.id}`)
    const rel = (await link.getAttribute('rel')) ?? ''
    for (const token of ['sponsored', 'nofollow', 'noopener'])
      expect(rel.split(/\s+/)).toContain(token)

    // карточка не раскрывает ссылку на БК: в DOM нет прямых ссылок на внешний домен
    expect(await page.locator('a[href^="http"][href*="example.com"]').count()).toBe(0)
    expect(errors).toEqual([])
  })

  test('без заголовка страны и с KZ офферов нет, расчёт работает', async ({ page }) => {
    for (const country of [null, 'KZ']) {
      const errors = trackConsoleErrors(page)
      await withCountry(page, country)
      await openCalc(page)
      await page.waitForTimeout(800)
      await expect(block(page)).toHaveCount(0)
      await expect(page.getByTestId('offer-card')).toHaveCount(0)
      await page.unroute(/\/(api\/(geo|stat)|go\/)/)
      expect(errors).toEqual([])
    }
  })

  test('/api/geo медленный (600 мс): офферов нет, ошибок в консоли нет', async ({ page }) => {
    const errors = trackConsoleErrors(page)
    await page.route('**/api/geo**', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      const headers = { ...route.request().headers(), [COUNTRY]: 'RU' }
      await route.continue({ headers }).catch(() => undefined)
    })
    await openCalc(page)
    await page.waitForTimeout(1500)
    await expect(block(page)).toHaveCount(0)
    await expect(page.getByTestId('offer-card')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('/api/geo отвечает 500 или не-JSON: офферов нет', async ({ page }) => {
    await page.route('**/api/geo**', (r) => r.fulfill({ status: 500, body: 'boom' }))
    await openCalc(page)
    await page.waitForTimeout(800)
    await expect(block(page)).toHaveCount(0)
    await page.unroute(/\/(api\/(geo|stat)|go\/)/)

    await page.route('**/api/geo**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<html>не json</html>' }),
    )
    await openCalc(page)
    await page.waitForTimeout(800)
    await expect(block(page)).toHaveCount(0)
    await expect(page.getByTestId('payout')).toContainText('3 780,00 ₽')
  })

  test('SSR-HTML главной без карточек и erid', async ({ request }) => {
    const res = await request.get(`${ON}/`, { headers: { [COUNTRY]: 'RU' } })
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).not.toContain('offer-card')
    expect(html).not.toContain('offer-block')
    expect(html).not.toContain('erid')
    for (const o of offers) expect(html).not.toContain(o.erid)
  })

  test('виджет /embed/sistema/: нет блока офферов и запросов к /api/geo', async ({ page }) => {
    const geoRequests: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/geo')) geoRequests.push(r.url())
    })
    await page.setExtraHTTPHeaders({ [COUNTRY]: 'RU' })
    await page.goto(`${ON}/embed/sistema/`)
    await page.waitForLoadState('networkidle')
    await fillCoupon(page)
    await page.waitForTimeout(800)
    await expect(page.getByTestId('offer-block')).toHaveCount(0)
    await expect(page.getByTestId('offer-card')).toHaveCount(0)
    expect(geoRequests).toEqual([])
    expect(await page.content()).not.toContain('erid')
  })

  test('доступность и 375 px: axe без serious/critical, без горизонтальной прокрутки', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await withCountry(page, 'RU')
    await openCalc(page)
    await expect(block(page)).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
    expect(serious).toEqual([])
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('офферы: /api/geo и /go', () => {
  test('/api/geo: состав офферов по стране и данные без trackingUrl', async ({ request }) => {
    const get = async (country: string | null) => {
      const res = await request.get(`${ON}/api/geo?placement=calc-result`, {
        headers: country ? { [COUNTRY]: country } : {},
      })
      expect(res.status()).toBe(200)
      return (await res.json()) as {
        country: string | null
        offersEnabled: boolean
        offers: Array<{ id: string }>
      }
    }
    const ru = await get('RU')
    expect(ru.country).toBe('RU')
    expect(ru.offersEnabled).toBe(true)
    const ids = ru.offers.map((o) => o.id)
    expect(ids).toEqual(expect.arrayContaining(['ok', 'today-last']))
    for (const id of ['expired', 'future', 'not-ru']) expect(ids).not.toContain(id)
    expect(ids).not.toContain('bad-domain')
    expect(JSON.stringify(ru)).not.toContain('example.com')
    expect(JSON.stringify(ru)).not.toContain('trackingUrl')

    const none = await get(null)
    expect(none.country).toBeNull()
    expect(none.offers).toEqual([])
    const kz = await get('KZ')
    expect(kz.country).toBe('KZ')
    expect(kz.offers).toEqual([])
  })

  test('/go/ok: 302 на example.com с erid', async ({ request }) => {
    const res = await go(request, 'ok', 'RU')
    expect(res.status()).toBe(302)
    const location = new URL(res.headers()['location'] ?? '')
    expect(location.host).toBe('example.com')
    expect(location.searchParams.get('erid')).toBe(offer('ok').erid)
  })

  test('/go/today-last (последний день) работает', async ({ request }) => {
    const res = await go(request, 'today-last', 'RU')
    expect(res.status()).toBe(302)
    expect(new URL(res.headers()['location'] ?? '').searchParams.get('erid')).toBe(
      offer('today-last').erid,
    )
  })

  test('/go/expired: 410, страница со ссылкой на главную, без Location', async ({ request }) => {
    const res = await go(request, 'expired', 'RU')
    expect(res.status()).toBe(410)
    expect(res.headers()['location']).toBeUndefined()
    expect(await res.text()).toMatch(/href="\/"/)
  })

  test('/go: 404 для неизвестного id, чужого домена, другой страны и без страны', async ({
    request,
  }) => {
    expect((await go(request, 'unknown', 'RU')).status()).toBe(404)
    const bad = await go(request, 'bad-domain', 'RU')
    expect(bad.status()).toBe(404)
    expect(bad.headers()['location']).toBeUndefined()
    expect((await go(request, 'not-ru', 'RU')).status()).toBe(404)
    expect((await go(request, 'ok', null)).status()).toBe(404)
    expect((await go(request, 'ok', 'KZ')).status()).toBe(404)
    // оффер, срок которого ещё не начался: сервер отвечает 410 (страница «больше не действует»)
    expect((await go(request, 'future', 'RU')).status()).toBe(410)
  })

  test('POST /api/stat { erid, event: impression } -> 204', async ({ request }) => {
    const res = await request.post(`${ON}/api/stat`, {
      headers: { [COUNTRY]: 'RU' },
      data: { erid: offer('ok').erid, event: 'impression' },
    })
    expect(res.status()).toBe(204)
  })
})

test.describe('офферы: статистика', () => {
  test('показ уходит POST /api/stat, клик по /go/ok учитывается на сервере', async ({
    page,
    context,
    request,
  }) => {
    const ok = offer('ok')
    await withCountry(context, 'RU')
    await context.route('https://example.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<html>stub</html>' }),
    )
    const statRequest = page.waitForRequest(
      (r) =>
        r.url().includes('/api/stat') &&
        r.method() === 'POST' &&
        (r.postData() ?? '').includes(ok.erid),
    )
    await openCalc(page)
    await card(page, ok).scrollIntoViewIfNeeded()
    const sent = await statRequest
    expect(JSON.parse(sent.postData() ?? '{}')).toMatchObject({
      erid: ok.erid,
      event: 'impression',
    })

    // клик по ссылке в браузере: новая вкладка уходит через /go/ok на example.com
    const popupPromise = context.waitForEvent('page')
    await card(page, ok).locator('a').click()
    const popup = await popupPromise
    await popup.waitForURL(/example\.com/)
    expect(new URL(popup.url()).searchParams.get('erid')).toBe(ok.erid)
    await popup.close()

    // и прямой запрос, как клик без JS
    expect((await go(request, 'ok', 'RU')).status()).toBe(302)

    const today = process.env.OFFERS_TODAY ?? ''
    await expect.poll(() => readDayStats(today, ok.erid)?.clicks ?? 0).toBeGreaterThanOrEqual(2)
    expect(readDayStats(today, ok.erid)?.impressions ?? 0).toBeGreaterThanOrEqual(1)
  })
})

test.describe('офферы: выключатель без пересборки', () => {
  test('OFFERS_ENABLED=false на том же .output: офферов нет, /go/ok -> 404', async ({
    page,
    request,
  }) => {
    await withCountry(page, 'RU')
    await openCalc(page, OFF)
    await page.waitForTimeout(800)
    await expect(block(page)).toHaveCount(0)
    await expect(page.getByTestId('offer-card')).toHaveCount(0)

    const geo = await request.get(`${OFF}/api/geo?placement=calc-result`, {
      headers: { [COUNTRY]: 'RU' },
    })
    const body = (await geo.json()) as { offersEnabled: boolean; offers: unknown[] }
    expect(body.offersEnabled).toBe(false)
    expect(body.offers).toEqual([])

    expect((await go(request, 'ok', 'RU', OFF)).status()).toBe(404)
    expect((await go(request, 'expired', 'RU', OFF)).status()).toBe(404)
    // тот же сборочный каталог, включённый сервер тем временем отдаёт 302
    expect((await go(request, 'ok', 'RU', ON)).status()).toBe(302)
  })
})

test.describe('офферы: страницы без рекламы и защита виджета', () => {
  test('офферы только на калькуляторах: / и /sistema-3-iz-5/ с блоком, остальное без', async ({
    page,
  }) => {
    await withCountry(page, 'RU')
    await page.goto(`${ON}/sistema-3-iz-5/`)
    await page.waitForLoadState('networkidle')
    await expect(block(page)).toBeVisible()
    await expect(card(page, offer('ok'))).toHaveCount(1)

    for (const path of [
      '/bk/test-rules-bk/kak-schitaetsya-sistema/',
      '/chto-takoe-sistema-v-stavkah/',
      '/kalkulyatory/marzha/',
    ]) {
      const res = await page.goto(`${ON}${path}`)
      expect(res?.status(), path).toBe(200)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      await expect(page.getByTestId('offer-block'), path).toHaveCount(0)
      await expect(page.getByTestId('offer-card'), path).toHaveCount(0)
    }
  })

  test('атака: виджет в чужом iframe не рекламирует и не открывает сайт во фрейме', async ({
    page,
    context,
  }) => {
    await withCountry(context, 'RU')
    const host: Server = createServer((_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(
        `<!doctype html><html><body><iframe src="${ON}/embed/sistema/" width="360" height="900"></iframe></body></html>`,
      )
    })
    await new Promise<void>((r) => host.listen(0, '127.0.0.1', r))
    try {
      const { port } = host.address() as { port: number }
      const frameGeo: string[] = []
      page.on('request', (r) => {
        if (r.url().includes('/api/geo') && r.frame().parentFrame() !== null) frameGeo.push(r.url())
      })
      await page.goto(`http://127.0.0.1:${port}/`)
      const frame = page.frameLocator('iframe')
      const odds = frame.getByLabel('Коэффициент события 1', { exact: true })
      await expect(odds).toBeVisible()
      await page.waitForTimeout(500)
      await odds.fill('3/2')
      await odds.blur()
      const hint = frame.locator('a[href*="konverter-koefficientov"]').first()
      await expect(hint).toBeVisible()

      const popupPromise = context.waitForEvent('page')
      await hint.click()
      const popup = await popupPromise
      await popup.waitForURL(/konverter-koefficientov/)
      const iframe = page.frames().find((f) => f.parentFrame() !== null)
      expect(iframe?.url()).toContain('/embed/sistema/')
      await expect(frame.getByTestId('offer-block')).toHaveCount(0)
      await expect(frame.locator('[data-testid^="offer-"]')).toHaveCount(0)
      await page.waitForTimeout(800)
      expect(frameGeo).toEqual([])
    } finally {
      host.close()
    }
  })
})

test.describe('офферы: учёт показов только из браузера', () => {
  test('POST без Sec-Fetch-Site и Origin не учитывается, показ из браузера учитывается', async ({
    page,
    request,
  }) => {
    const ok = offer('ok')
    const today = process.env.OFFERS_TODAY ?? ''
    const count = () => readDayStats(today, ok.erid)?.impressions ?? 0
    const before = count()
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${ON}/api/stat`, {
        headers: { [COUNTRY]: 'RU' },
        data: { erid: ok.erid, event: 'impression' },
      })
      expect(res.status()).toBe(204)
    }
    await page.waitForTimeout(500)
    expect(count()).toBe(before)

    await withCountry(page, 'RU')
    await openCalc(page)
    await card(page, ok).scrollIntoViewIfNeeded()
    await expect.poll(count).toBeGreaterThan(before)
  })
})

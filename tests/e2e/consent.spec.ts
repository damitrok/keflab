import { spawn, type ChildProcess } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'keflab:consent:v1'
const TAG_URL = /mc\.yandex\.ru\/metrika\/tag\.js/
const METRIKA_HOST = /mc\.yandex\.ru/
const BASE_PORT = 3270

const bannerOf = (page: Page) =>
  page
    .locator('[role="dialog"], [role="region"]')
    .filter({ has: page.getByRole('button', { name: 'Принять' }) })
const accept = (page: Page) => page.getByRole('button', { name: 'Принять', exact: true })
const reject = (page: Page) => page.getByRole('button', { name: 'Отклонить', exact: true })
const settings = (page: Page) =>
  page.locator('footer').getByRole('button', { name: 'Настройки cookie' })

function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

/** Слушатели запросов к Метрике — подключать ДО goto. */
function trackMetrika(page: Page): string[] {
  const urls: string[] = []
  page.on('request', (r) => {
    if (METRIKA_HOST.test(r.url())) urls.push(r.url())
  })
  return urls
}

/** Ошибки консоли; сетевую ошибку заблокированного запроса к mc.yandex.ru допускаем. */
function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const fromMetrika = METRIKA_HOST.test(m.location().url) || METRIKA_HOST.test(m.text())
    // Заблокированный запрос браузер печатает сам; location бывает пустым.
    const blockedText = /ERR_FAILED|ERR_BLOCKED_BY_CLIENT/.test(m.text())
    if (/Failed to load resource/i.test(m.text()) && (fromMetrika || blockedText)) return
    errors.push(`console: ${m.text()}`)
  })
  return errors
}

async function stubTag(page: Page): Promise<void> {
  await page.route(TAG_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  )
}

async function expectCalcWorks(page: Page): Promise<void> {
  const label = (n: number) => page.getByLabel(`Коэффициент события ${n}`, { exact: true })
  const status = (n: number) => page.getByLabel(`Исход события ${n}`, { exact: true })
  await page.getByLabel('Сумма ставки, ₽').fill('3000')
  await label(1).fill('1,80')
  await label(2).fill('2,10')
  await label(3).fill('1,65')
  await status(1).selectOption('win')
  await status(2).selectOption('win')
  await status(3).selectOption('lose')
  await expect
    .poll(async () => plain(await page.getByTestId('payout').textContent()))
    .toContain('3 780,00 ₽')
}

async function stored(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
}

test.describe('согласие на cookie: без счётчика', () => {
  test('баннер: диалог, ссылка на политику, исчезает после выбора и не возвращается', async ({
    page,
  }) => {
    await page.goto('/')
    const banner = bannerOf(page)
    await expect(banner).toBeVisible()
    await expect(reject(page)).toBeVisible()
    await expect(banner.locator('a[href="/politika-konfidencialnosti/"]')).toBeVisible()
    await accept(page).click()
    await expect(banner).toBeHidden()
    expect(await stored(page)).toBe('accepted')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(banner).toBeHidden()
    expect(await stored(page)).toBe('accepted')
  })

  test('«Отклонить» запоминается', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await reject(page).click()
    await expect(bannerOf(page)).toBeHidden()
    expect(await stored(page)).toBe('rejected')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(bannerOf(page)).toBeHidden()
  })

  test('«Настройки cookie» открывает баннер, выбор можно поменять', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await reject(page).click()
    await expect(bannerOf(page)).toBeHidden()
    await settings(page).click()
    await expect(bannerOf(page)).toBeVisible()
    await accept(page).click()
    await expect(bannerOf(page)).toBeHidden()
    expect(await stored(page)).toBe('accepted')
  })

  for (const path of ['/', '/o-proekte/']) {
    test(`без счётчика: ${path} после «Принять» нет запросов к mc.yandex.ru и ошибок в консоли`, async ({
      page,
    }) => {
      const requests = trackMetrika(page)
      const errors = trackErrors(page)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await accept(page).click()
      await expect(bannerOf(page)).toBeHidden()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      expect(requests).toEqual([])
      expect(errors).toEqual([])
    })
  }
})

test.describe('согласие на cookie: со счётчиком Метрики', () => {
  // Порт по parallelIndex воркера: одновременные воркеры не делят сервер.
  test.describe.configure({ mode: 'serial' })

  let server: ChildProcess | undefined
  let origin = ''

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    const port = BASE_PORT + testInfo.parallelIndex
    origin = `http://localhost:${port}`
    server = spawn('node', ['.output/server/index.mjs'], {
      env: {
        ...process.env,
        PORT: String(port),
        NITRO_PORT: String(port),
        NUXT_PUBLIC_METRIKA_ID: '12345678',
      },
      stdio: 'ignore',
    })
    const deadline = Date.now() + 30_000
    for (;;) {
      try {
        const res = await fetch(`${origin}/`)
        if (res.ok) break
      } catch {
        // сервер ещё стартует
      }
      if (Date.now() > deadline) throw new Error('сервер со счётчиком не поднялся')
      await new Promise((r) => setTimeout(r, 300))
    }
  })

  test.afterAll(() => {
    server?.kill('SIGTERM')
  })

  test('до «Принять» нет запросов, после — запрос к tag.js', async ({ page }) => {
    const requests = trackMetrika(page)
    await stubTag(page)
    await page.goto(`${origin}/`)
    await page.waitForLoadState('networkidle')
    await expect(bannerOf(page)).toBeVisible()
    await page.waitForTimeout(500)
    expect(requests).toEqual([])
    const tag = page.waitForRequest(TAG_URL)
    await accept(page).click()
    await tag
    expect(requests.some((u) => TAG_URL.test(u))).toBe(true)
  })

  test('при принятом согласии после reload тег грузится', async ({ page }) => {
    await stubTag(page)
    await page.goto(`${origin}/`)
    await page.waitForLoadState('networkidle')
    const first = page.waitForRequest(TAG_URL)
    await accept(page).click()
    await first
    const again = page.waitForRequest(TAG_URL)
    await page.reload()
    await again
    await expect(bannerOf(page)).toBeHidden()
  })

  test('«Отклонить»: запросов нет, калькулятор работает', async ({ page }) => {
    const requests = trackMetrika(page)
    await stubTag(page)
    await page.goto(`${origin}/`)
    await page.waitForLoadState('networkidle')
    await reject(page).click()
    await expect(bannerOf(page)).toBeHidden()
    await page.waitForTimeout(700)
    expect(requests).toEqual([])
    await expectCalcWorks(page)
    expect(requests).toEqual([])
  })

  test('отклонил, потом передумал: запрос появляется, калькулятор работает до и после', async ({
    page,
  }) => {
    const requests = trackMetrika(page)
    await stubTag(page)
    await page.goto(`${origin}/`)
    await page.waitForLoadState('networkidle')
    await reject(page).click()
    await expectCalcWorks(page)
    expect(requests).toEqual([])
    await settings(page).click()
    const tag = page.waitForRequest(TAG_URL)
    await accept(page).click()
    await tag
    expect(requests.some((u) => TAG_URL.test(u))).toBe(true)
    await expectCalcWorks(page)
  })

  test('блокировщик: после «Принять» нет ошибок в консоли', async ({ page }) => {
    const errors = trackErrors(page)
    await page.route('**/mc.yandex.ru/**', (r) => r.abort('blockedbyclient'))
    await page.goto(`${origin}/`)
    await page.waitForLoadState('networkidle')
    await accept(page).click()
    await expect(bannerOf(page)).toBeHidden()
    await page.waitForTimeout(1000)
    expect(errors).toEqual([])
    await expectCalcWorks(page)
  })
})

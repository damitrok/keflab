import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const PATH = '/chto-takoe-sistema-v-stavkah/'
const ODDS_LABEL = /^Коэффициент события \d+$/
const FORBIDDEN = ['гарантированный выигрыш', 'без риска', 'лёгкие деньги', 'заработок']

function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

async function seriousAxe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

async function open(page: Page): Promise<void> {
  await page.goto(PATH)
  await page.waitForLoadState('networkidle')
}

test.describe('«Что такое система в ставках»', () => {
  test('страница: 200, один h1, крошки', async ({ page }) => {
    const response = await page.goto(PATH)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Что такое система в ставках')
    const crumbs = page.locator('nav[aria-label="Хлебные крошки"]')
    await expect(crumbs.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/')
    await expect(crumbs.locator('[aria-current="page"]')).toContainText(
      'Что такое система в ставках',
    )
  })

  test('адрес без слеша на конце не отдаёт 404', async ({ page }) => {
    const response = await page.goto('/chto-takoe-sistema-v-stavkah')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1')).toHaveText('Что такое система в ставках')
  })

  test('ссылка на калькулятор системы работает', async ({ page }) => {
    await open(page)
    const link = page.locator('main').getByRole('link', { name: 'Калькулятор системы' }).first()
    await expect(link).toHaveAttribute('href', '/')
    await link.click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toContainText('Калькулятор системы')
  })

  test('ссылка на калькулятор экспресса работает', async ({ page }) => {
    await open(page)
    const link = page.locator('main').getByRole('link', { name: 'Калькулятор экспресса' }).first()
    await expect(link).toHaveAttribute('href', '/kalkulyator-ekspressa/')
    await link.click()
    await expect(page).toHaveURL(/\/kalkulyator-ekspressa\/$/)
    await expect(page.locator('h1')).toHaveText('Калькулятор экспресса')
  })

  test('таблица типов систем: подписи и числа комбинаций', async ({ page }) => {
    await open(page)
    const table = page.getByTestId('system-types-table').locator('table')
    await expect(table).toBeVisible()
    await expect(table.locator('caption')).toBeAttached()
    const combos = async (title: string): Promise<string> => {
      const row = table
        .locator('tbody tr')
        .filter({ has: page.locator('th[scope="row"]').getByText(title, { exact: true }) })
      await expect(row).toHaveCount(1)
      return plain(await row.locator('td').first().textContent()).trim()
    }
    expect(await combos('2 из 3')).toBe('3')
    expect(await combos('3 из 5')).toBe('10')
    expect(await combos('4 из 6')).toBe('15')
  })

  test('мини-калькулятор: 3000 ₽, 1,80 / 2,10 выигрыш, 1,65 проигрыш -> 3 780,00 ₽, адрес не меняется', async ({
    page,
  }) => {
    await open(page)
    const before = page.url()
    while ((await page.getByLabel(ODDS_LABEL).count()) < 3) {
      const n = await page.getByLabel(ODDS_LABEL).count()
      await page.getByRole('button', { name: 'Добавить событие' }).click()
      await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(n + 1)
    }
    const odds = ['1,80', '2,10', '1,65']
    const statuses = ['win', 'win', 'lose']
    for (const [i, value] of odds.entries()) {
      await page.getByLabel(`Коэффициент события ${i + 1}`, { exact: true }).fill(value)
      await page.getByLabel(`Исход события ${i + 1}`, { exact: true }).selectOption(statuses[i]!)
    }
    await page.getByLabel('Сумма ставки, ₽').fill('3000')
    await expect
      .poll(async () => plain(await page.getByTestId('payout').first().textContent()))
      .toContain('3 780,00 ₽')
    expect(page.url()).not.toContain('?')
    expect(page.url()).toBe(before)
    await expect(page.getByRole('button', { name: /Скопировать ссылку/ })).toHaveCount(0)
  })

  test('FAQ виден, не меньше 5 вопросов', async ({ page }) => {
    await open(page)
    const details = page.locator('main details > summary')
    const terms = page.locator('main dl dt')
    const count = Math.max(await details.count(), await terms.count())
    expect(count).toBeGreaterThanOrEqual(5)
    const first = (await details.count()) >= (await terms.count()) ? details.first() : terms.first()
    await expect(first).toBeVisible()
  })

  test('в тексте нет запрещённых формулировок', async ({ page }) => {
    await open(page)
    const text = plain(await page.locator('body').innerText())
      .toLowerCase()
      .replace(/ё/g, 'е')
    const html = plain(await page.locator('main').textContent())
      .toLowerCase()
      .replace(/ё/g, 'е')
    for (const word of FORBIDDEN) {
      const w = word.replace(/ё/g, 'е')
      expect(text, word).not.toContain(w)
      expect(html, word).not.toContain(w)
    }
  })

  test('axe: без serious/critical', async ({ page }) => {
    await open(page)
    expect(await seriousAxe(page)).toEqual([])
  })

  test('375 px: нет горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await open(page)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})

test.describe('«Что такое система в ставках» без JavaScript', () => {
  test('видны h1 и таблица', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto(PATH)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByTestId('system-types-table').locator('table')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

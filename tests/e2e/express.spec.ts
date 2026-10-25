import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

type Status = 'pending' | 'win' | 'lose' | 'void' | 'half_win' | 'half_lose'

const PATH = '/kalkulyator-ekspressa/'
const ODDS_LABEL = /^Коэффициент события \d+$/

/** Текст с обычными пробелами и обычным минусом. */
function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ').replace(/−/g, '-')
}

async function openPage(page: Page): Promise<void> {
  await page.goto(PATH)
  await page.waitForLoadState('networkidle')
}

const oddsInput = (page: Page, n: number): Locator =>
  page.getByLabel(`Коэффициент события ${n}`, { exact: true })
const statusSelect = (page: Page, n: number): Locator =>
  page.getByLabel(`Исход события ${n}`, { exact: true })
const stakeInput = (page: Page): Locator => page.getByLabel('Сумма ставки, ₽')
const payout = (page: Page): Locator => page.getByTestId('payout')

async function addEvents(page: Page, total: number): Promise<void> {
  while ((await page.getByLabel(ODDS_LABEL).count()) < total) {
    const before = await page.getByLabel(ODDS_LABEL).count()
    await page.getByRole('button', { name: 'Добавить событие' }).click()
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(before + 1)
  }
}

async function fill(
  page: Page,
  stake: string | undefined,
  events: Array<[string, Status]>,
): Promise<void> {
  await addEvents(page, events.length)
  for (const [i, [odds, status]] of events.entries()) {
    await oddsInput(page, i + 1).fill(odds)
    await statusSelect(page, i + 1).selectOption(status)
  }
  if (stake !== undefined) await stakeInput(page).fill(stake)
}

async function describedByText(field: Locator): Promise<string> {
  return field.evaluate((el) => {
    const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
  })
}

async function expectFieldError(field: Locator): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect.poll(async () => (await describedByText(field)).trim().length).toBeGreaterThan(0)
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

test.describe('калькулятор экспресса', () => {
  test('страница: один h1, крошки, ссылки на соседние страницы', async ({ page }) => {
    const response = await page.goto(PATH)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Калькулятор экспресса')

    const crumbs = page.locator('nav[aria-label="Хлебные крошки"]')
    await expect(crumbs.locator('ol')).toBeVisible()
    const items = crumbs.locator('ol li')
    await expect(items).toHaveCount(2)
    const home = items.nth(0).getByRole('link', { name: 'Главная' })
    await expect(home).toHaveAttribute('href', '/')
    await expect(items.nth(1)).toContainText('Калькулятор экспресса')
    await expect(crumbs.locator('[aria-current="page"]')).toContainText('Калькулятор экспресса')

    await expect(page.getByRole('link', { name: 'Калькулятор системы' }).first()).toHaveAttribute(
      'href',
      '/',
    )
    await expect(
      page.getByRole('link', { name: 'Что такое система в ставках' }).first(),
    ).toHaveAttribute('href', '/chto-takoe-sistema-v-stavkah/')
  })

  test('адрес без слеша на конце не отдаёт 404', async ({ page }) => {
    const response = await page.goto('/kalkulyator-ekspressa')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1')).toHaveText('Калькулятор экспресса')
  })

  test('начальное состояние: 2 пустых события «ждём», «Удалить» отключено', async ({ page }) => {
    await openPage(page)
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(2)
    for (const n of [1, 2]) {
      await expect(oddsInput(page, n)).toHaveValue('')
      await expect(statusSelect(page, n)).toHaveValue('pending')
      await expect(page.getByRole('button', { name: `Удалить событие ${n}` })).toBeDisabled()
    }
    await expect(stakeInput(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Очистить всё' })).toBeVisible()
  })

  test('«½ выигрыша» + «выигрыш»: возврат 290,00 ₽', async ({ page }) => {
    await openPage(page)
    await fill(page, '100', [
      ['1,90', 'half_win'],
      ['2,00', 'win'],
    ])
    await expect(page.getByTestId('express-result')).toBeVisible()
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('290,00 ₽')
  })

  test('«½ проигрыша» + «выигрыш»: 75,00 ₽ и убыток −25,00 ₽', async ({ page }) => {
    await openPage(page)
    await fill(page, '100', [
      ['2,00', 'half_lose'],
      ['1,50', 'win'],
    ])
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('75,00 ₽')
    const profit = page.getByTestId('profit')
    await expect.poll(async () => plain(await profit.textContent())).toContain('Убыток')
    expect(plain(await profit.textContent())).toContain('-25,00 ₽')
  })

  test('прибыль и общий коэффициент: 100 ₽, 2,00 и 1,50 -> коэффициент 3', async ({ page }) => {
    await openPage(page)
    await fill(page, '100', [
      ['2,00', 'win'],
      ['1,50', 'win'],
    ])
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('300,00 ₽')
    expect(plain(await page.getByTestId('total-odds').textContent())).toMatch(/\b3\b/)
    const profit = plain(await page.getByTestId('profit').textContent())
    expect(profit).toContain('Прибыль')
    expect(profit).toContain('+200,00 ₽')
  })

  test('«Что будет, если одно событие вернут»: 150,00 ₽ и 200,00 ₽', async ({ page }) => {
    await openPage(page)
    await fill(page, '100', [
      ['2,00', 'win'],
      ['1,50', 'win'],
    ])
    const whatIf = page.getByTestId('what-if')
    await expect(whatIf).toBeVisible()
    await expect(whatIf.getByRole('heading', { level: 2 })).toHaveText(
      'Что будет, если одно событие вернут',
    )
    await expect.poll(async () => plain(await whatIf.textContent())).toContain('150,00 ₽')
    const text = plain(await whatIf.textContent())
    expect(text).toContain('200,00 ₽')
    // возврат первого события (остаётся 1,50) стоит раньше возврата второго
    expect(text.indexOf('150,00 ₽')).toBeLessThan(text.indexOf('200,00 ₽'))
  })

  test('удаление и добавление событий, максимум 16', async ({ page }) => {
    await openPage(page)
    await addEvents(page, 3)
    await expect(page.getByRole('button', { name: 'Удалить событие 3' })).toBeEnabled()
    await page.getByRole('button', { name: 'Удалить событие 3' }).click()
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(2)
    await addEvents(page, 16)
    await expect(page.getByRole('button', { name: 'Добавить событие' })).toBeDisabled()
    await expect(page.getByText('Максимум 16 событий')).toBeVisible()
  })

  test('«Очистить всё» сбрасывает поля', async ({ page }) => {
    await openPage(page)
    await fill(page, '100', [
      ['2,00', 'win'],
      ['1,50', 'win'],
    ])
    await page.getByRole('button', { name: 'Очистить всё' }).click()
    await expect(oddsInput(page, 1)).toHaveValue('')
    await expect(statusSelect(page, 1)).toHaveValue('pending')
    await expect(stakeInput(page)).toHaveValue('')
  })

  test.describe('валидация коэффициента', () => {
    for (const bad of ['abc', '1,00']) {
      test(`«${bad}» -> видимая ошибка и aria-invalid`, async ({ page }) => {
        await openPage(page)
        await fill(page, '100', [
          ['2,00', 'win'],
          ['1,50', 'win'],
        ])
        await oddsInput(page, 2).fill(bad)
        await expectFieldError(oddsInput(page, 2))
        const described = await oddsInput(page, 2).getAttribute('aria-describedby')
        const errorId = (described ?? '').split(/\s+/).filter(Boolean)[0]
        await expect(page.locator(`[id="${errorId}"]`).first()).toBeVisible()
        await expect(oddsInput(page, 1)).not.toHaveAttribute('aria-invalid', 'true')
        await oddsInput(page, 2).fill('1,50')
        await expect(oddsInput(page, 2)).not.toHaveAttribute('aria-invalid', 'true')
      })
    }
  })

  test.describe('доступность', () => {
    test('axe: начальное состояние', async ({ page }) => {
      await openPage(page)
      expect(await seriousAxe(page)).toEqual([])
    })

    test('axe: после заполнения', async ({ page }) => {
      await openPage(page)
      await fill(page, '100', [
        ['2,00', 'win'],
        ['1,50', 'half_win'],
      ])
      await expect(page.getByTestId('express-result')).toBeVisible()
      expect(await seriousAxe(page)).toEqual([])
    })
  })

  test('375 px: нет горизонтальной прокрутки с 16 событиями', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await openPage(page)
    await fill(
      page,
      '1000',
      Array.from({ length: 16 }, (): [string, Status] => ['1,5', 'win']),
    )
    await expect(page.getByTestId('express-result')).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})

test.describe('калькулятор экспресса без JavaScript', () => {
  test('виден h1', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto(PATH)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('h1')).toHaveText('Калькулятор экспресса')
    } finally {
      await context.close()
    }
  })
})

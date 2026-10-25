import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

const FREEBET = '/kalkulyatory/fribet/'
const HUB = '/kalkulyatory/'

/** Текст с обычными пробелами и обычным минусом. */
function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ').replace(/\u2212/g, '-')
}

const main = (page: Page): Locator => page.locator('main')
const amount = (page: Page): Locator => page.getByLabel(/Сумма фрибета/i)
const minOdds = (page: Page): Locator => page.getByLabel(/Минимальный коэффициент/i)
const margin = (page: Page): Locator => page.getByLabel(/Маржа букмекера/i)
const onlyWin = (page: Page): Locator => page.getByLabel(/Возвращается только выигрыш/i)
const withStake = (page: Page): Locator => page.getByLabel(/Выигрыш вместе со ставкой/i)

async function openPage(page: Page): Promise<void> {
  await page.goto(FREEBET)
  await page.waitForLoadState('networkidle')
}

async function fillBase(page: Page): Promise<void> {
  await amount(page).fill('1000')
  await minOdds(page).fill('2,00')
}

async function expectText(locator: Locator, expected: string): Promise<void> {
  await expect.poll(async () => plain(await locator.textContent())).toContain(expected)
}

async function seriousAxe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test.describe('калькулятор фрибета: расчёт', () => {
  test('1 000, 2,00, только выигрыш, маржа 0 -> выигрыш 1 000, ценность 500', async ({ page }) => {
    await openPage(page)
    await fillBase(page)
    await onlyWin(page).check()
    await margin(page).fill('0')
    await expectText(page.getByTestId('freebet-payout'), '1 000,00 ₽')
    await expectText(page.getByTestId('freebet-ev'), '500,00 ₽')
  })

  test('«выигрыш вместе со ставкой» -> 2 000 и 1 000', async ({ page }) => {
    await openPage(page)
    await fillBase(page)
    await withStake(page).check()
    await margin(page).fill('0')
    await expectText(page.getByTestId('freebet-payout'), '2 000,00 ₽')
    await expectText(page.getByTestId('freebet-ev'), '1 000,00 ₽')
  })

  test('маржа по умолчанию 5 -> ценность 476,19 ₽', async ({ page }) => {
    await openPage(page)
    await expect(margin(page)).toHaveValue('5')
    await fillBase(page)
    await onlyWin(page).check()
    await expectText(page.getByTestId('freebet-ev'), '476,19 ₽')
  })

  test('ошибки у полей: коэффициент 1,00, сумма 0, маржа 50', async ({ page }) => {
    await openPage(page)
    await fillBase(page)
    await minOdds(page).fill('1,00')
    await expect(minOdds(page)).toHaveAttribute('aria-invalid', 'true')
    await amount(page).fill('0')
    await expect(amount(page)).toHaveAttribute('aria-invalid', 'true')
    await margin(page).fill('50')
    await expect(margin(page)).toHaveAttribute('aria-invalid', 'true')
  })
})

test.describe('калькулятор фрибета: страница', () => {
  test('офферы выключены: нет блока и рекламных слов', async ({ page }) => {
    await openPage(page)
    await fillBase(page)
    await page.waitForTimeout(800)
    await expect(page.getByTestId('offer-block')).toHaveCount(0)
    const text = plain(await main(page).innerText()).toLowerCase()
    for (const bad of ['бонус', 'промокод', 'акци', 'фрибет от']) {
      expect(text, bad).not.toContain(bad)
    }
  })

  test('200, один h1, крошки, FAQ >= 3, ссылка на «/» в main', async ({ page }) => {
    const response = await page.goto(FREEBET)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
    const crumbs = page.locator('nav[aria-label="Хлебные крошки"]')
    await expect(crumbs.locator('ol li').first().getByRole('link')).toHaveAttribute('href', '/')
    await expect(crumbs.locator('[aria-current="page"]')).toHaveCount(1)
    expect(await main(page).locator('details').count()).toBeGreaterThanOrEqual(3)
    await expect(main(page).locator('a[href="/"]').first()).toBeAttached()
  })

  test('axe: без serious/critical', async ({ page }) => {
    await openPage(page)
    await fillBase(page)
    expect(await seriousAxe(page)).toEqual([])
  })

  test('375 px: нет горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await openPage(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('без JavaScript виден h1', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto(FREEBET)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('хаб калькуляторов ссылается на фрибет', async ({ page }) => {
    await page.goto(HUB)
    await expect(main(page).locator(`a[href="${FREEBET}"]`).first()).toBeAttached()
  })
})

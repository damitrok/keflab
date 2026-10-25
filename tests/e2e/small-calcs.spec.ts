import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

const HUB = '/kalkulyatory/'
const MARGIN = '/kalkulyatory/marzha/'
const SUM = '/kalkulyatory/slozhenie-koefficientov/'
const DOGON = '/kalkulyatory/dogon/'
const CONVERTER = '/kalkulyatory/konverter-koefficientov/'

const CALCS = [MARGIN, SUM, DOGON, CONVERTER]
const ALL = [HUB, ...CALCS]

/** Текст с обычными пробелами и обычным минусом. */
function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ').replace(/\u2212/g, '-')
}

/** Текст без пробелов вообще: пробел перед знаком процента не мешает. */
function compact(text: string | null): string {
  return plain(text).replace(/\s+/g, '')
}

async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

const main = (page: Page): Locator => page.locator('main')

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

async function describedByText(field: Locator): Promise<string> {
  return field.evaluate((el) => {
    const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
  })
}

test.describe('мелкие калькуляторы: общие требования', () => {
  for (const path of ALL) {
    test.describe(path, () => {
      test('200, один h1, крошки, ссылка на «/» внутри main', async ({ page }) => {
        const response = await page.goto(path)
        expect(response?.status()).toBe(200)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(page.locator('h1')).toBeVisible()

        const crumbs = page.locator('nav[aria-label="Хлебные крошки"]')
        await expect(crumbs.locator('ol li').first().getByRole('link')).toHaveAttribute('href', '/')
        await expect(crumbs.locator('[aria-current="page"]')).toHaveCount(1)

        await expect(main(page).locator('a[href="/"]').first()).toBeAttached()
      })

      test('axe: без serious/critical', async ({ page }) => {
        await openPage(page, path)
        expect(await seriousAxe(page)).toEqual([])
      })

      test('375 px: нет горизонтальной прокрутки', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 })
        await openPage(page, path)
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
      })

      test('без JavaScript виден h1', async ({ browser, baseURL }) => {
        const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
        try {
          const page = await context.newPage()
          const response = await page.goto(path)
          expect(response?.status()).toBe(200)
          await expect(page.locator('h1')).toBeVisible()
        } finally {
          await context.close()
        }
      })

      if (path !== HUB) {
        test('FAQ: минимум 3 details', async ({ page }) => {
          await page.goto(path)
          expect(await main(page).locator('details').count()).toBeGreaterThanOrEqual(3)
        })
      }
    })
  }

  test('хаб ссылается на 4 калькулятора', async ({ page }) => {
    await page.goto(HUB)
    for (const href of CALCS) {
      await expect(main(page).locator(`a[href="${href}"]`).first()).toBeAttached()
    }
  })
})

test.describe('маржа', () => {
  test('1,90 и 1,90 -> 5,26 %, честные коэффициенты 2', async ({ page }) => {
    await openPage(page, MARGIN)
    await page.locator('#margin-odds-1').fill('1,90')
    await page.locator('#margin-odds-2').fill('1,90')
    const percent = page.getByTestId('margin-percent')
    await expect.poll(async () => compact(await percent.textContent())).toContain('5,26%')
    const fair = page.getByTestId('fair-odds')
    await expect(fair).toHaveCount(2)
    for (const i of [0, 1]) {
      expect(compact(await fair.nth(i).textContent())).toMatch(/^2(,00)?$/)
    }
  })
})

test.describe('сложение коэффициентов', () => {
  test('1,5; 2; 3 -> 9', async ({ page }) => {
    await openPage(page, SUM)
    const inputs = main(page).getByLabel(/^Коэффициент \d+$/)
    await expect(inputs.first()).toBeVisible()
    while ((await inputs.count()) < 3) {
      const before = await inputs.count()
      await main(page)
        .getByRole('button', { name: /Добавить/ })
        .click()
      await expect(inputs).toHaveCount(before + 1)
    }
    await inputs.nth(0).fill('1,5')
    await inputs.nth(1).fill('2')
    await inputs.nth(2).fill('3')
    const result = page.getByTestId('total-odds')
    await expect.poll(async () => compact(await result.textContent())).toMatch(/^9(,00)?$/)
  })
})

test.describe('догон', () => {
  test('цель 100, коэффициент 2 -> первая ставка 100; предупреждение выше результата', async ({
    page,
  }) => {
    await openPage(page, DOGON)
    await page.locator('#dogon-target').fill('100')
    await page.locator('#dogon-odds').fill('2')

    const warning = page.getByTestId('dogon-warning')
    const result = page.getByTestId('dogon-next-stake')
    await expect(warning).toBeVisible()
    await expect(result).toBeVisible()
    await expect
      .poll(async () => plain(await result.textContent()))
      .toMatch(/(^|[^\d,.])100([\s,.]|$)/)

    const warningBeforeResult = await warning.evaluate(
      (w, r) => !!(w.compareDocumentPosition(r!) & Node.DOCUMENT_POSITION_FOLLOWING),
      await result.elementHandle(),
    )
    expect(warningBeforeResult).toBe(true)
    const wBox = await warning.boundingBox()
    const rBox = await result.boundingBox()
    expect(wBox!.y).toBeLessThan(rBox!.y)
  })

  test('нет обещаний гарантии', async ({ page }) => {
    await openPage(page, DOGON)
    const text = plain(await page.locator('body').innerText()).toLowerCase()
    for (const bad of ['гарантир', 'верный способ', 'стратегия работает']) {
      expect(text).not.toContain(bad)
    }
  })
})

test.describe('конвертер коэффициентов', () => {
  const dec = (page: Page): Locator => page.locator('#convert-decimal')
  const frac = (page: Page): Locator => page.locator('#convert-fractional')
  const amer = (page: Page): Locator => page.locator('#convert-american')
  const prob = (page: Page): Locator => page.locator('#convert-probability')

  test('2,50 -> 3/2, +150, 40 %', async ({ page }) => {
    await openPage(page, CONVERTER)
    await dec(page).fill('2,50')
    await expect(frac(page)).toHaveValue('3/2')
    await expect(amer(page)).toHaveValue('+150')
    await expect.poll(async () => compact(await prob(page).inputValue())).toMatch(/^40(,0+)?$/)
  })

  test('3/2, +150 и 40 -> 2,5', async ({ page }) => {
    await openPage(page, CONVERTER)
    await frac(page).fill('3/2')
    await expect.poll(async () => await dec(page).inputValue()).toMatch(/^2[,.]5(0)?$/)
    await amer(page).fill('+150')
    await expect.poll(async () => await dec(page).inputValue()).toMatch(/^2[,.]5(0)?$/)
    await dec(page).fill('')
    await prob(page).fill('40')
    await expect.poll(async () => await dec(page).inputValue()).toMatch(/^2[,.]5(0)?$/)
  })

  test('3/0 -> ошибка у поля', async ({ page }) => {
    await openPage(page, CONVERTER)
    await frac(page).fill('3/0')
    await expect(frac(page)).toHaveAttribute('aria-invalid', 'true')
    await expect
      .poll(async () => (await describedByText(frac(page))).trim().length)
      .toBeGreaterThan(0)
  })
})

test.describe('ссылки на главный калькулятор и подсказка 3/2', () => {
  for (const path of CALCS) {
    test(`${path}: ссылка на главный калькулятор`, async ({ page }) => {
      await page.goto(path)
      await expect(main(page).locator('a[href="/"]').first()).toBeAttached()
    })
  }

  test('главная: «3/2» в коэффициенте -> подсказка -> конвертер', async ({ page }) => {
    await openPage(page, '/')
    await page.getByLabel('Коэффициент события 1', { exact: true }).fill('3/2')
    const hint = main(page).locator('a[href="/kalkulyatory/konverter-koefficientov/"]').first()
    await expect(hint).toBeVisible()
    await hint.click()
    await expect(page).toHaveURL(/\/kalkulyatory\/konverter-koefficientov\/$/)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('конвертер отдаёт 200', async ({ request }) => {
    const response = await request.get(CONVERTER)
    expect(response.status()).toBe(200)
  })
})

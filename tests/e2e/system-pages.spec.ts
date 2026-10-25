import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { SYSTEM_PAGES, SITE_URL, systemPagePath } from '../../shared/site-pages'

const ODDS_LABEL = /^Коэффициент события \d+$/
const SYSTEM_LINK = /^\/sistema-(\d+)-iz-(\d+)\/$/

function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

/** Ленивый калькулятор готов, когда у него появился data-ready="true". */
async function openSystemPage(page: Page, path: string): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
  await expect(page.locator('.system-calculator')).toHaveAttribute('data-ready', 'true')
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

test.describe('страницы систем K из N', () => {
  test('21 страница в реестре', () => {
    expect(SYSTEM_PAGES).toHaveLength(21)
  })

  test('каждая страница: h1, калькулятор, крошки, ссылки; title уникальны', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)
    const titles = new Map<string, string>()
    const checkedLinks = new Set<string>()

    for (const { k, n } of SYSTEM_PAGES) {
      const path = systemPagePath(k, n)
      await openSystemPage(page, path)

      await expect(page.locator('h1'), path).toHaveCount(1)
      await expect(page.locator('h1'), path).toHaveText(
        `Система ${k} из ${n}: калькулятор и расчёт`,
      )

      const title = await page.title()
      expect(title.trim(), path).not.toBe('')
      expect(titles.has(title), `title повторяется: ${title} (${path}, ${titles.get(title)})`).toBe(
        false,
      )
      titles.set(title, path)

      await expect(page.getByLabel('Тип системы'), path).toHaveValue(String(k))
      await expect(page.getByLabel(ODDS_LABEL), path).toHaveCount(n)

      const crumbs = page.locator('nav[aria-label="Хлебные крошки"]')
      await expect(crumbs, path).toBeVisible()
      await expect(crumbs.getByText('Главная'), path).toBeVisible()

      const hrefs = await page
        .locator('main a[href]')
        .evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''))
      expect(hrefs, path).toContain('/')
      const neighbours = hrefs.filter((h) => SYSTEM_LINK.test(h) && h !== path)
      expect(neighbours.length, `${path}: нет ссылки на соседнюю систему`).toBeGreaterThan(0)

      for (const href of ['/', ...neighbours]) {
        if (checkedLinks.has(href)) continue
        checkedLinks.add(href)
        const res = await request.get(href, { headers: { Accept: 'text/html' } })
        expect(res.status(), `${path} -> ${href}`).toBe(200)
      }
    }
    expect(titles.size).toBe(21)
  })

  test('сценарий ТЗ: 3 из 5, ставка 1000 -> 7 826,00 ₽ без кнопки, без горизонтальной прокрутки', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await openSystemPage(page, '/sistema-3-iz-5/')
    await expect(page.getByLabel('Тип системы')).toHaveValue('3')
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(5)

    await page.getByLabel('Сумма ставки, ₽').fill('1000')
    const odds = ['1,5', '1,8', '2,0', '2,2', '2,5']
    for (const [i, value] of odds.entries()) {
      await page.getByLabel(`Коэффициент события ${i + 1}`, { exact: true }).fill(value)
      await page.getByLabel(`Исход события ${i + 1}`, { exact: true }).selectOption('win')
    }

    await expect(page.getByTestId('calc-result')).toBeVisible()
    await expect
      .poll(async () => plain(await page.getByTestId('payout').textContent()))
      .toContain('7 826,00 ₽')
    await expect(page.getByRole('button', { name: /рассчитать/i })).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  for (const path of ['/sistema-3-iz-3/', '/sistema-1-iz-3/', '/sistema-2-iz-9/']) {
    test(`несуществующая система ${path} -> 404`, async ({ request }) => {
      const res = await request.get(path, { headers: { Accept: 'text/html' } })
      expect(res.status()).toBe(404)
    })
  }

  test('sitemap.xml содержит все 21 адрес', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const xml = await res.text()
    for (const { k, n } of SYSTEM_PAGES) {
      expect(xml, systemPagePath(k, n)).toContain(`${SITE_URL}${systemPagePath(k, n)}`)
    }
  })

  for (const [k, n] of [
    [3, 5],
    [2, 3],
  ] as const) {
    test(`axe: ${systemPagePath(k, n)} без serious/critical`, async ({ page }) => {
      await openSystemPage(page, systemPagePath(k, n))
      expect(await seriousAxe(page)).toEqual([])
    })
  }

  test('без JavaScript /sistema-4-iz-6/ показывает h1 и пример расчёта', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto('/sistema-4-iz-6/')
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveText('Система 4 из 6: калькулятор и расчёт')
      const heading = page.getByRole('heading', { name: /Пример расчёта/ })
      await expect(heading).toBeVisible()
      const section = page.locator('section, article, div', { has: heading }).last()
      expect(plain(await section.textContent())).toMatch(/\d[\d ]*,\d{2}\s*₽/)
    } finally {
      await context.close()
    }
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { SITE_PAGES } from '../../shared/site-pages'

const SERVICE_PAGES = [
  '/o-proekte/',
  '/reklama/',
  '/politika-konfidencialnosti/',
  '/otvetstvennaya-igra/',
]

const bannerOf = (page: Page) =>
  page
    .locator('[role="dialog"], [role="region"]')
    .filter({ has: page.getByRole('button', { name: 'Принять' }) })

test.describe('юридический слой: подвал', () => {
  for (const { path } of SITE_PAGES) {
    test(`${path}: 18+, ответственная игра, настройки cookie, справочный характер`, async ({
      page,
    }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      const footer = page.locator('footer')
      await expect(footer.getByText('18+').first()).toBeVisible()
      await expect(
        footer.getByRole('link', { name: 'Ответственная игра', exact: true }),
      ).toBeVisible()
      await expect(footer.getByRole('button', { name: 'Настройки cookie' })).toBeVisible()
      await expect(footer).toContainText(/справочн/i)
    })

    test(`${path}: в подвале нет выходных данных СМИ, пока media.registered=false`, async ({
      page,
    }) => {
      await page.goto(path)
      const text = (await page.locator('footer').textContent()) ?? ''
      expect(text).not.toMatch(/Номер регистрации|Учредитель|Выходные данные/i)
    })
  }

  test('страница 404: 18+ виден', async ({ page }) => {
    const response = await page.goto('/takoj-stranicy-net/')
    expect(response?.status()).toBe(404)
    await expect(page.locator('footer').getByText('18+').first()).toBeVisible()
  })
})

test.describe('юридический слой: служебные страницы', () => {
  for (const path of SERVICE_PAGES) {
    test(`${path}: 200, один H1, заглушка про юриста`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main')).toContainText(/будет утвержд[её]н юристом/i)
    })
  }
})

test.describe('юридический слой: баннер cookie', () => {
  test('axe: нет serious и critical на главной с открытым баннером', async ({ page }) => {
    await page.goto('/')
    await expect(bannerOf(page)).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([])
  })

  test('375 px: баннер без горизонтальной прокрутки и не закрывает поле суммы ставки', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(bannerOf(page)).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const stake = page.getByLabel('Сумма ставки, ₽')
    await stake.scrollIntoViewIfNeeded()
    // click без force падает, если поле перекрыто баннером
    await stake.click({ timeout: 5000 })
    await expect(stake).toBeFocused()
    await stake.fill('1500')
    await expect(stake).toHaveValue(/1[\s\u00a0]?500/)
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/o-proekte/',
  '/reklama/',
  '/politika-konfidencialnosti/',
  '/otvetstvennaya-igra/',
]

const FOOTER_LINKS: Record<string, string> = {
  '/o-proekte/': 'О проекте',
  '/reklama/': 'Реклама на сайте',
  '/politika-konfidencialnosti/': 'Политика конфиденциальности',
  '/otvetstvennaya-igra/': 'Ответственная игра',
}

test.describe('каркас', () => {
  test('шапка: ссылка keflab.ru ведёт на главную', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header a[href="/"]', { hasText: 'keflab.ru' })).toBeVisible()
  })

  test('подвал: 18+ и служебные ссылки', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByText('18+').first()).toBeVisible()
    for (const [href, text] of Object.entries(FOOTER_LINKS)) {
      // Ссылки — в навигации подвала (на «Ответственную игру» ведёт ещё и блок помощи).
      const link = footer.getByRole('navigation').locator(`a[href="${href}"]`)
      await expect(link).toBeVisible()
      await expect(link).toContainText(text)
    }
  })

  for (const path of PAGES) {
    test.describe(path, () => {
      test('200, один h1, 18+ в подвале', async ({ page }) => {
        const response = await page.goto(path)
        expect(response?.status()).toBe(200)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(page.locator('footer').getByText('18+').first()).toBeVisible()
      })

      test('axe: нет serious и critical нарушений', async ({ page }) => {
        await page.goto(path)
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        expect(
          serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        ).toEqual([])
      })

      test('нет горизонтальной прокрутки на 375 px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 })
        await page.goto(path)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)
      })

      test('нет внешних ссылок', async ({ page }) => {
        await page.goto(path)
        const hrefs = await page
          .locator('a[href]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))
        const external = hrefs.filter((href) => {
          if (/^(\/(?!\/)|#|\?|mailto:|tel:)/.test(href) || href === '') return false
          try {
            const host = new URL(href, 'https://keflab.ru').hostname
            return !(host === 'keflab.ru' || host.endsWith('.keflab.ru'))
          } catch {
            return true
          }
        })
        expect(external).toEqual([])
      })
    })
  }

  test('SSR: без JavaScript видны h1 и 18+', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('footer').getByText('18+').first()).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

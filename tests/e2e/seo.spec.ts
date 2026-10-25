import { expect, test } from '@playwright/test'

const PARAM_URL = '/?s=3000&k=2&e=1.80w,2.10w,1.65l'

test.describe('SEO: ответы сервера', () => {
  for (const [from, to] of [
    ['/reklama', '/reklama/'],
    ['/kalkulyator-ekspressa', '/kalkulyator-ekspressa/'],
  ] as const) {
    test(`${from} без слеша: 301 на ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 })
      expect(res.status()).toBe(301)
      expect(new URL(res.headers().location ?? '', 'http://localhost').pathname).toBe(to)
    })
  }

  test('/sitemap.xml: 200 и application/xml', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/xml')
    expect(await res.text()).toContain('<loc>https://keflab.ru/</loc>')
  })

  test('/robots.txt: ссылка на sitemap и закрытый /go/', async ({ request }) => {
    const text = await (await request.get('/robots.txt')).text()
    expect(text).toContain('Sitemap: https://keflab.ru/sitemap.xml')
    expect(text).toContain('Disallow: /go/')
  })

  test('главная с параметрами расчёта: 200 без редиректа и noindex', async ({ request }) => {
    const res = await request.get(PARAM_URL, { maxRedirects: 0 })
    expect(res.status()).toBe(200)
    const html = await res.text()
    const noindex =
      /<meta[^>]+name="robots"[^>]+noindex/i.test(html) ||
      (res.headers()['x-robots-tag'] ?? '').includes('noindex')
    expect(noindex).toBe(true)
  })

  test('несуществующая страница: 404, H1, noindex, 18+ в подвале', async ({ page }) => {
    const res = await page.goto('/net-takoy-stranicy/')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Страница не найдена')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.locator('footer')).toContainText('18+')
  })
})

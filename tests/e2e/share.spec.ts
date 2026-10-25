import { expect, test, type Locator, type Page } from '@playwright/test'

const SHARE_PATH = '/?s=3000&k=2&e=1.80w,2.10w,1.65l'
const CANONICAL = /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/keflab\.ru\/["']/i
const CANONICAL_REVERSED =
  /<link[^>]+href=["']https:\/\/keflab\.ru\/["'][^>]+rel=["']canonical["']/i
const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i
const NOINDEX_REVERSED = /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i

/** Текст с обычными пробелами вместо неразрывных. */
function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

const hasCanonical = (html: string): boolean =>
  CANONICAL.test(html) || CANONICAL_REVERSED.test(html)
const hasNoindex = (html: string): boolean => NOINDEX.test(html) || NOINDEX_REVERSED.test(html)

const ODDS_LABEL = /^Коэффициент события \d+$/
const oddsInput = (page: Page, n: number): Locator =>
  page.getByLabel(`Коэффициент события ${n}`, { exact: true })
const statusSelect = (page: Page, n: number): Locator =>
  page.getByLabel(`Исход события ${n}`, { exact: true })
const stakeInput = (page: Page): Locator => page.getByLabel('Сумма ставки, ₽')
const payout = (page: Page): Locator => page.getByTestId('payout')

async function openPath(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** Расчёт из ссылки примера: 3000 ₽, 2 из 3, 1,8 W / 2,1 W / 1,65 L. */
async function expectSharedCalc(page: Page): Promise<void> {
  await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(3)
  await expect(stakeInput(page)).toHaveValue(/^3[\s\u00a0]?000$/)
  await expect(oddsInput(page, 1)).toHaveValue(/^1,80?$/)
  await expect(oddsInput(page, 2)).toHaveValue(/^2,10?$/)
  await expect(oddsInput(page, 3)).toHaveValue('1,65')
  await expect(statusSelect(page, 1)).toHaveValue('win')
  await expect(statusSelect(page, 2)).toHaveValue('win')
  await expect(statusSelect(page, 3)).toHaveValue('lose')
  await expect(page.getByLabel('Тип системы')).toHaveValue('2')
  await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
}

async function expectDefaultCalc(page: Page): Promise<void> {
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(3)
  for (const n of [1, 2, 3]) {
    await expect(oddsInput(page, n)).toHaveValue('')
    await expect(statusSelect(page, n)).toHaveValue('pending')
  }
  await expect(page.getByLabel('Тип системы')).toHaveValue('2')
  await expect(stakeInput(page)).toHaveValue('')
}

async function expectBrokenNotice(page: Page): Promise<void> {
  const notice = page.getByTestId('share-notice')
  await expect(notice).toBeVisible()
  await expect(notice).toContainText(/повреждена/i)
  await expect(notice).toContainText(/по умолчанию/i)
}

async function fillShared(page: Page): Promise<void> {
  await stakeInput(page).fill('3000')
  const odds = ['1,80', '2,10', '1,65']
  const statuses = ['win', 'win', 'lose']
  for (const [i, value] of odds.entries()) {
    await oddsInput(page, i + 1).fill(value)
    await statusSelect(page, i + 1).selectOption(statuses[i]!)
  }
}

test.describe('ссылка на расчёт', () => {
  test('открытие ссылки показывает тот же расчёт', async ({ page }) => {
    await openPath(page, SHARE_PATH)
    await expectSharedCalc(page)
    await expect(page.getByTestId('share-notice')).toHaveCount(0)
  })

  test('состояние из ссылки важнее localStorage', async ({ page }) => {
    await openPath(page, '/')
    await stakeInput(page).fill('1000')
    for (const n of [1, 2, 3]) {
      await oddsInput(page, n).fill('2')
      await statusSelect(page, n).selectOption('win')
    }
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('4 000,00 ₽')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('keflab:system:v1')))
      .not.toBeNull()
    await openPath(page, SHARE_PATH)
    await expectSharedCalc(page)
  })

  test('ввод в поля обновляет адрес через replaceState, history не растёт', async ({ page }) => {
    await openPath(page, '/')
    const before = await page.evaluate(() => window.history.length)
    await fillShared(page)
    await expect.poll(() => page.url()).toMatch(/[?&]s=/)
    await expect.poll(() => page.url()).toMatch(/[?&]k=/)
    await expect.poll(() => page.url()).toMatch(/[?&]e=/)
    expect(await page.evaluate(() => window.history.length)).toBe(before)
  })

  test('кнопка «Скопировать ссылку»: сообщение и адрес в буфере обмена', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openPath(page, SHARE_PATH)
    await expectSharedCalc(page)
    await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ссылка скопирована' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
  })

  test('Clipboard API недоступен: поле только для чтения, выделено, с подсказкой', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    })
    await openPath(page, SHARE_PATH)
    await expectSharedCalc(page)
    await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
    const field = page.getByLabel('Ссылка на расчёт')
    await expect(field).toBeVisible()
    await expect(field).toHaveAttribute('readonly', /.*/)
    await expect.poll(() => field.inputValue()).toBe(page.url())
    await expect
      .poll(() =>
        field.evaluate((el) => {
          const input = el as HTMLInputElement
          return input.selectionStart === 0 && input.selectionEnd === input.value.length
        }),
      )
      .toBe(true)
    await expect(page.getByText('Скопируйте ссылку вручную')).toBeVisible()
  })

  test('writeText бросает исключение: запасное поле со ссылкой', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
        configurable: true,
      })
    })
    await openPath(page, SHARE_PATH)
    await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
    await expect(page.getByLabel('Ссылка на расчёт')).toBeVisible()
    await expect(page.getByText('Скопируйте ссылку вручную')).toBeVisible()
  })

  test('ссылка в новом контексте (чистый localStorage) даёт тот же расчёт', async ({
    page,
    browser,
    baseURL,
  }) => {
    await openPath(page, '/')
    await fillShared(page)
    await expect.poll(() => page.url()).toMatch(/[?&]e=/)
    const shared = page.url()
    const context = await browser.newContext({ baseURL })
    try {
      const other = await context.newPage()
      await openPath(other, shared)
      await expectSharedCalc(other)
    } finally {
      await context.close()
    }
  })

  test.describe('невалидные параметры', () => {
    const cases: Array<[string, string]> = [
      ['e=abc', '/?e=abc'],
      ['K >= N', '/?s=3000&k=3&e=1.8w,2.1w,1.65l'],
      ['17 событий', `/?s=3000&k=2&e=${Array<string>(17).fill('1.5w').join(',')}`],
      ['нет k', '/?e=1.8w,2.1w,1.65l'],
      ['адрес длиннее 2000 символов', `/?s=3000&k=2&e=1.8w,2.1w,1.65l&x=${'a'.repeat(2100)}`],
    ]
    for (const [name, path] of cases) {
      test(`${name}: страница жива, расчёт по умолчанию, share-notice`, async ({ page }) => {
        const response = await page.goto(path)
        expect(response?.status()).toBe(200)
        await page.waitForLoadState('networkidle')
        await expectDefaultCalc(page)
        await expectBrokenNotice(page)
      })
    }
  })

  test('HTML и скрипт в параметрах не выполняются', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message())
      await dialog.dismiss()
    })
    const response = await page.goto(
      '/?s=<img src=x onerror=alert(1)>&e=<script>alert(1)</script>w',
    )
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    await expect(page.locator('script', { hasText: 'alert(1)' })).toHaveCount(0)
    await expectBrokenNotice(page)
    expect(dialogs).toEqual([])
  })

  test.describe('SEO в SSR-ответе', () => {
    test('со ссылкой на расчёт: noindex и canonical на главную', async ({ request }) => {
      const html = await (await request.get(SHARE_PATH)).text()
      expect(hasNoindex(html)).toBe(true)
      expect(hasCanonical(html)).toBe(true)
    })

    test('без параметров: canonical есть, noindex нет', async ({ request }) => {
      const html = await (await request.get('/')).text()
      expect(hasCanonical(html)).toBe(true)
      expect(hasNoindex(html)).toBe(false)
    })

    test('посторонний параметр utm_source не даёт noindex', async ({ request }) => {
      const html = await (await request.get('/?utm_source=x')).text()
      expect(hasCanonical(html)).toBe(true)
      expect(hasNoindex(html)).toBe(false)
    })
  })

  test.describe('без JavaScript', () => {
    test('SSR-HTML ссылки содержит итог внутри calc-result', async ({ request }) => {
      const html = plain(await (await request.get(SHARE_PATH)).text())
      const start = html.indexOf('data-testid="calc-result"')
      expect(start).toBeGreaterThanOrEqual(0)
      expect(html.slice(start, start + 6000)).toContain('3 780,00 ₽')
    })

    test('при javaScriptEnabled:false итог виден в calc-result', async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
      try {
        const page = await context.newPage()
        const response = await page.goto(SHARE_PATH)
        expect(response?.status()).toBe(200)
        const result = page.getByTestId('calc-result')
        await expect(result).toBeVisible()
        expect(plain(await result.textContent())).toContain('3 780,00 ₽')
      } finally {
        await context.close()
      }
    })
  })
})

test('m=c в ссылке включает режим «ставка на одну комбинацию»', async ({ page }) => {
  await openPath(page, '/?s=1000&m=c&k=2&e=1.80w,2.10w,1.65l')
  await expect(page.getByRole('radio', { name: 'На одну комбинацию' })).toBeChecked()
  await expect
    .poll(async () => plain(await page.getByTestId('total-stake').textContent()))
    .toContain('3 × 1 000,00 ₽ = 3 000,00 ₽')
  await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
  await expect.poll(() => page.url()).toContain('m=c')
})

test('битая ссылка после загрузки заменяется чистым адресом', async ({ page }) => {
  await openPath(page, '/?e=abc&utm_source=x')
  await expect(page.getByTestId('share-notice')).toBeVisible()
  await expect.poll(() => new URL(page.url()).search).toBe('')
})

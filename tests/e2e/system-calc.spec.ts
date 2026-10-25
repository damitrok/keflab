import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

type Status = 'pending' | 'win' | 'lose' | 'void' | 'half_win' | 'half_lose'

interface Coupon {
  stake?: string
  odds: string[]
  statuses?: Status[]
  k?: number
}

const ODDS_LABEL = /^Коэффициент события \d+$/

/** Текст с обычными пробелами вместо неразрывных. */
function plain(text: string | null): string {
  return (text ?? '').replace(/[\u00a0\u202f]/g, ' ')
}

async function openCalc(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

const oddsInput = (page: Page, n: number): Locator =>
  page.getByLabel(`Коэффициент события ${n}`, { exact: true })
const statusSelect = (page: Page, n: number): Locator =>
  page.getByLabel(`Исход события ${n}`, { exact: true })
const stakeInput = (page: Page): Locator => page.getByLabel('Сумма ставки, ₽')
const combinationsTable = (page: Page): Locator =>
  page.getByTestId('calc-result').getByTestId('combinations-table')
const payout = (page: Page): Locator => page.getByTestId('payout')

/** При больших системах таблица лежит в закрытом <details>. */
async function openCombinations(page: Page): Promise<void> {
  const details = page.getByTestId('calc-result').locator('details', {
    has: page.locator('summary', { hasText: /Показать \d+ комбинац/ }),
  })
  if (await details.count()) await details.first().locator('summary').click()
}

async function addEvents(page: Page, total: number): Promise<void> {
  while ((await page.getByLabel(ODDS_LABEL).count()) < total) {
    const before = await page.getByLabel(ODDS_LABEL).count()
    await page.getByRole('button', { name: 'Добавить событие' }).click()
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(before + 1)
  }
}

/** Заполняет купон: добавляет события, коэффициенты, исходы, тип системы, ставку. */
async function fillCoupon(page: Page, coupon: Coupon): Promise<void> {
  await addEvents(page, Math.max(3, coupon.odds.length))
  if (coupon.k !== undefined) {
    await page.getByLabel('Тип системы').selectOption(String(coupon.k))
  }
  for (const [i, value] of coupon.odds.entries()) {
    await oddsInput(page, i + 1).fill(value)
  }
  for (const [i, status] of (coupon.statuses ?? []).entries()) {
    await statusSelect(page, i + 1).selectOption(status)
  }
  if (coupon.stake !== undefined) await stakeInput(page).fill(coupon.stake)
}

/** Элементы, на которые указывает aria-describedby поля (текст и ссылки). */
async function describedBy(field: Locator): Promise<{ text: string; links: number }> {
  return field.evaluate((el) => {
    const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    const nodes = ids.map((id) => document.getElementById(id)).filter((n) => n !== null)
    return {
      text: nodes.map((n) => n.textContent ?? '').join(' '),
      links: nodes.reduce((sum, n) => sum + n.querySelectorAll('a[href]').length, 0),
    }
  })
}

async function expectFieldError(field: Locator): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect.poll(async () => (await describedBy(field)).text.trim().length).toBeGreaterThan(0)
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

const ACCEPT: Coupon = {
  stake: '3000',
  odds: ['1,80', '2,10', '1,65'],
  statuses: ['win', 'win', 'lose'],
  k: 2,
}

test.describe('калькулятор системы', () => {
  test('приёмка: 3000 ₽, 2 из 3 -> возврат 3 780,00 ₽, прибыль +780,00 ₽, без кнопки расчёта', async ({
    page,
  }) => {
    await openCalc(page)
    await fillCoupon(page, ACCEPT)
    await expect(page.getByTestId('calc-result')).toBeVisible()
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
    const profit = plain(await page.getByTestId('profit').textContent())
    expect(profit).toContain('Прибыль')
    expect(profit).toContain('+780,00 ₽')
    await expect(page.getByRole('button', { name: /рассчитать/i })).toHaveCount(0)
  })

  test('начальное состояние: 3 пустых события, «ждём», 2 из 3, пустая ставка', async ({ page }) => {
    await openCalc(page)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(3)
    for (const n of [1, 2, 3]) {
      await expect(oddsInput(page, n)).toHaveValue('')
      await expect(statusSelect(page, n)).toHaveValue('pending')
    }
    await expect(page.getByLabel('Тип системы')).toHaveValue('2')
    await expect(stakeInput(page)).toHaveValue('')
  })

  test('«1,85» и «1.85» дают одинаковый результат', async ({ page }) => {
    await openCalc(page)
    const wins: Status[] = ['win', 'win', 'win']
    await fillCoupon(page, { stake: '1000', odds: ['1,85', '1,85', '1,85'], statuses: wins, k: 2 })
    await expect(payout(page)).toBeVisible()
    const comma = plain(await payout(page).textContent())
    await fillCoupon(page, { odds: ['1.85', '1.85', '1.85'] })
    await expect(payout(page)).toBeVisible()
    await expect.poll(async () => plain(await payout(page).textContent())).toBe(comma)
    expect(comma).toMatch(/\d/)
  })

  test.describe('валидация коэффициента', () => {
    for (const bad of ['abc', '0', '1,00', '1500']) {
      test(`«${bad}» -> ошибка у поля, расчёт восстанавливается после исправления`, async ({
        page,
      }) => {
        await openCalc(page)
        await fillCoupon(page, ACCEPT)
        await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00')
        await oddsInput(page, 2).fill(bad)
        await expectFieldError(oddsInput(page, 2))
        // остальные поля живы
        await expect(oddsInput(page, 1)).not.toHaveAttribute('aria-invalid', 'true')
        await oddsInput(page, 2).fill('2,10')
        await expect(oddsInput(page, 2)).not.toHaveAttribute('aria-invalid', 'true')
        await expect
          .poll(async () => plain(await payout(page).textContent()))
          .toContain('3 780,00 ₽')
      })
    }

    test('«3/2» -> подсказка про конвертер со ссылкой', async ({ page }) => {
      await openCalc(page)
      await oddsInput(page, 1).fill('3/2')
      await expectFieldError(oddsInput(page, 1))
      await expect
        .poll(async () => (await describedBy(oddsInput(page, 1))).links)
        .toBeGreaterThan(0)
      const info = await describedBy(oddsInput(page, 1))
      expect(info.text).toMatch(/конвертер/i)
    })
  })

  test.describe('валидация ставки', () => {
    for (const bad of ['0', '0,001', '10 000 001']) {
      test(`ставка «${bad}» -> ошибка у поля ставки`, async ({ page }) => {
        await openCalc(page)
        await fillCoupon(page, { odds: ['2', '2', '2'], statuses: ['win', 'win', 'win'] })
        await stakeInput(page).fill(bad)
        await expectFieldError(stakeInput(page))
        await expect(page.locator('#stake-error')).toBeVisible()
      })
    }

    for (const [name, value] of [
      ['с пробелом', '1 200'],
      ['с неразрывным пробелом', '1\u00a0200'],
    ]) {
      test(`ставка ${name} принимается`, async ({ page }) => {
        await openCalc(page)
        await fillCoupon(page, {
          stake: value,
          odds: ['2', '2', '2'],
          statuses: ['win', 'win', 'win'],
          k: 2,
        })
        await expect(stakeInput(page)).not.toHaveAttribute('aria-invalid', 'true')
        await expect
          .poll(async () => plain(await payout(page).textContent()))
          .toContain('4 800,00 ₽')
      })
    }
  })

  test('нельзя выбрать 3 из 3 и 1 из 3', async ({ page }) => {
    await openCalc(page)
    const values = await page
      .getByLabel('Тип системы')
      .locator('option')
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value))
    expect(values).toEqual(['2'])
  })

  test('3 из 4, удалили событие -> 2 из 3 и сообщение', async ({ page }) => {
    await openCalc(page)
    await addEvents(page, 4)
    await page.getByLabel('Тип системы').selectOption('3')
    await expect(page.getByLabel('Тип системы')).toHaveValue('3')
    await page.getByRole('button', { name: 'Удалить событие 4' }).click()
    await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(3)
    await expect(page.getByLabel('Тип системы')).toHaveValue('2')
    const notice = page.getByTestId('calc-notice')
    await expect(notice).toBeVisible()
    await expect(notice).not.toHaveText('')
  })

  test('16 событий: «Добавить событие» disabled, виден «Максимум 16 событий»', async ({ page }) => {
    await openCalc(page)
    await addEvents(page, 16)
    await expect(page.getByRole('button', { name: 'Добавить событие' })).toBeDisabled()
    await expect(page.getByText('Максимум 16 событий')).toBeVisible()
  })

  test('купон в игре: «не рассчитано» и сценарии «Зайдёт m из 3»', async ({ page }) => {
    await openCalc(page)
    await fillCoupon(page, {
      stake: '1000',
      odds: ['2', '2', '2', '2', '2'],
      statuses: ['win', 'lose'],
      k: 3,
    })
    await expect(page.getByTestId('not-settled')).toBeVisible()
    await page.getByRole('tab', { name: 'Сценарии' }).click()
    const table = page.getByTestId('scenarios-table')
    await expect(table).toBeVisible()
    for (const m of [0, 1, 2, 3]) {
      await expect(table.getByText(`Зайдёт ${m} из 3`)).toBeVisible()
    }
  })

  test('статус «½ выигрыша»: подсказка про (коэффициент + 1) / 2', async ({ page }) => {
    await openCalc(page)
    const select = statusSelect(page, 1)
    await select.selectOption('half_win')
    const hint = async () => (await describedBy(select)).text
    await expect.poll(async () => (await hint()).trim().length).toBeGreaterThan(0)
    let text = await hint()
    if (!/коэффициент.*\+\s*1.*\/\s*2/i.test(text)) {
      const toggle = page.getByRole('button', { name: /^\?$|подсказ|поясн/i }).first()
      if (await toggle.count()) await toggle.click()
      text = await hint()
    }
    expect(text).toMatch(/коэффициент.*\+\s*1.*\/\s*2/i)
  })

  test('ставка 100 на 2 из 3 при 1,5 / 2 / 3: 450,00 ₽ и пометка про копейки', async ({ page }) => {
    await openCalc(page)
    await fillCoupon(page, {
      stake: '100',
      odds: ['1,5', '2,0', '3,0'],
      statuses: ['win', 'win', 'win'],
      k: 2,
    })
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('450,00 ₽')
    await expect(page.getByTestId('uneven-split')).toBeVisible()
  })

  test('огромный итог: сокращённая запись, полная по нажатию, без горизонтальной прокрутки', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await openCalc(page)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await fillCoupon(page, {
      stake: '10000000',
      odds: Array<string>(16).fill('1000'),
      statuses: Array<Status>(16).fill('win'),
      k: 15,
    })
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('·10')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    const button = payout(page).getByRole('button')
    if (await button.count()) await button.first().click()
    else await payout(page).click()
    await expect.poll(async () => plain(await payout(page).textContent())).not.toContain('·10')
    expect(errors).toEqual([])
  })

  test('вкладка «Сравнить» с таблицей и без советов', async ({ page }) => {
    await openCalc(page)
    await fillCoupon(page, ACCEPT)
    await page.getByRole('tab', { name: 'Сравнить' }).click()
    await expect(page.getByTestId('compare-table')).toBeVisible()
    await expect(page.locator('main')).not.toHaveText(/советуем|лучше ставить|выгоднее/i)
  })

  test('вкладка «Комбинации» показывает таблицу', async ({ page }) => {
    await openCalc(page)
    await fillCoupon(page, ACCEPT)
    await page.getByRole('tab', { name: 'Комбинации' }).click()
    await expect(combinationsTable(page)).toBeVisible()
  })

  test.describe('доступность', () => {
    test('axe: начальное состояние', async ({ page }) => {
      await openCalc(page)
      expect(await seriousAxe(page)).toEqual([])
    })

    test('axe: после заполнения, вкладки «Сценарии» и «Сравнить»', async ({ page }) => {
      await openCalc(page)
      await fillCoupon(page, {
        ...ACCEPT,
        odds: ['1,80', '2,10', '1,65', '2'],
        statuses: ['win', 'win', 'lose'],
        k: 2,
      })
      await expect(page.getByTestId('calc-result')).toBeVisible()
      expect(await seriousAxe(page)).toEqual([])
      await page.getByRole('tab', { name: 'Сценарии' }).click()
      await expect(page.getByTestId('scenarios-table')).toBeVisible()
      expect(await seriousAxe(page)).toEqual([])
      await page.getByRole('tab', { name: 'Сравнить' }).click()
      await expect(page.getByTestId('compare-table')).toBeVisible()
      expect(await seriousAxe(page)).toEqual([])
    })

    test('клавиатура: Tab доходит до ставки и первого коэффициента', async ({ page }) => {
      await openCalc(page)
      const seen: string[] = []
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab')
        const label = await page.evaluate(() => {
          const el = document.activeElement as HTMLInputElement | null
          return `${el?.id ?? ''}|${el?.labels?.[0]?.textContent?.trim() ?? ''}`
        })
        seen.push(label)
        if (label.endsWith('|Коэффициент события 1')) break
      }
      expect(seen.some((s) => s.startsWith('stake|'))).toBe(true)
      expect(seen.at(-1)).toMatch(/\|Коэффициент события 1$/)
    })

    test('фокус после «Добавить событие» и после удаления', async ({ page }) => {
      await openCalc(page)
      await page.getByRole('button', { name: 'Добавить событие' }).click()
      await expect(oddsInput(page, 4)).toBeFocused()
      const label = await page.evaluate(() =>
        (document.activeElement as HTMLInputElement).labels?.[0]?.textContent?.trim(),
      )
      expect(label).toBe('Коэффициент события 4')

      await page.getByRole('button', { name: 'Удалить событие 2' }).click()
      await expect(page.getByLabel(ODDS_LABEL)).toHaveCount(3)
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.tagName ?? 'BODY'))
        .not.toBe('BODY')
    })

    test('вкладки переключаются стрелками', async ({ page }) => {
      await openCalc(page)
      await fillCoupon(page, ACCEPT)
      const first = page.getByRole('tab', { name: 'Комбинации' })
      await first.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Сценарии' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Сравнить' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await page.keyboard.press('ArrowLeft')
      await expect(page.getByRole('tab', { name: 'Сценарии' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  test('375 px: нет горизонтальной прокрутки с 16 событиями и таблицей комбинаций', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await openCalc(page)
    await fillCoupon(page, {
      stake: '1000',
      odds: Array<string>(16).fill('1,5'),
      statuses: Array<Status>(16).fill('win'),
      k: 2,
    })
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    await page.getByRole('tab', { name: 'Комбинации' }).click()
    await openCombinations(page)
    await expect(combinationsTable(page)).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  test('localStorage: значения восстанавливаются после перезагрузки', async ({ page }) => {
    await openCalc(page)
    await fillCoupon(page, ACCEPT)
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('keflab:system:v1')))
      .not.toBeNull()
    // Адрес уже содержит расчёт (шаг 4) — открываем чистый адрес, чтобы
    // восстановление шло именно из localStorage.
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(stakeInput(page)).toHaveValue(/3[\s\u00a0]?000/)
    await expect(oddsInput(page, 1)).toHaveValue(/1[.,]80/)
    await expect(oddsInput(page, 3)).toHaveValue(/1[.,]65/)
    await expect(statusSelect(page, 3)).toHaveValue('lose')
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
  })

  test('localStorage бросает исключения: калькулятор всё равно считает', async ({ page }) => {
    await page.addInitScript(() => {
      const fail = () => {
        throw new DOMException('denied', 'SecurityError')
      }
      Storage.prototype.getItem = fail
      Storage.prototype.setItem = fail
    })
    await openCalc(page)
    await fillCoupon(page, ACCEPT)
    await expect.poll(async () => plain(await payout(page).textContent())).toContain('3 780,00 ₽')
  })

  test('12 событий: итог появляется быстро после ввода последнего коэффициента', async ({
    page,
  }) => {
    await openCalc(page)
    await fillCoupon(page, {
      stake: '1000',
      odds: Array<string>(11).fill('1,5').concat(['']),
      statuses: Array<Status>(12).fill('win'),
      k: 6,
    })
    const started = Date.now()
    await oddsInput(page, 12).fill('1,5')
    await expect(payout(page)).toBeVisible({ timeout: 5000 })
    await expect(payout(page)).toContainText('₽')
    expect(Date.now() - started).toBeLessThan(2500)
  })
})

test.describe('без JavaScript', () => {
  test('видны H1, пояснение, статический пример и сообщение про JS', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('p').first()).toBeVisible()
      const example = page.getByTestId('static-example')
      await expect(example).toBeVisible()
      expect(plain(await example.textContent())).toContain('3 780,00 ₽')
      // getByText не заглядывает внутрь <noscript>, поэтому ищем по тегу
      const notice = page.locator('noscript.notice')
      await expect(notice).toBeVisible()
      // Текст noscript Playwright не отдаёт через textContent — проверяем разметку.
      expect(await page.content()).toMatch(/<noscript[^>]*>[^<]*Калькулятору нужен JavaScript/)
    } finally {
      await context.close()
    }
  })
})

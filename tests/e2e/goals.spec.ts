import { spawn, type ChildProcess } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

const BASE_PORT = 3300
const TAG_URL = /mc\.yandex\.ru\/metrika\/tag\.js/
const STORAGE_KEY = 'keflab:consent:v1'
const SHARE_PATH = '/?s=3000&k=2&e=1.80w,2.10w,1.65l'

declare global {
  interface Window {
    __ymCalls: unknown[][]
  }
}

const accept = (page: Page) => page.getByRole('button', { name: 'Принять', exact: true })
const reject = (page: Page) => page.getByRole('button', { name: 'Отклонить', exact: true })

/** Заглушка ym: пишет все вызовы в window.__ymCalls. Загрузчик её не перетирает. */
async function spyYm(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ymCalls = []
    window.ym = ((...args: unknown[]) => {
      window.__ymCalls.push(args)
    }) as unknown as typeof window.ym
  })
  await page.route(TAG_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  )
}

/** Имена целей в порядке отправки. */
async function goals(page: Page): Promise<string[]> {
  const calls = await page.evaluate(() => window.__ymCalls)
  return calls.filter((c) => c[1] === 'reachGoal').map((c) => String(c[2]))
}

async function fillCalc(page: Page): Promise<void> {
  await page.getByLabel('Сумма ставки, ₽').fill('3000')
  const odds = ['1,80', '2,10', '1,65']
  const statuses = ['win', 'win', 'lose']
  for (const [i, value] of odds.entries()) {
    await page.getByLabel(`Коэффициент события ${i + 1}`, { exact: true }).fill(value)
    await page.getByLabel(`Исход события ${i + 1}`, { exact: true }).selectOption(statuses[i]!)
  }
  await expect
    .poll(async () =>
      ((await page.getByTestId('payout').textContent()) ?? '').replace(/[\u00a0\u202f]/g, ' '),
    )
    .toContain('3 780,00 ₽')
}

async function open(page: Page, origin: string, path = '/'): Promise<void> {
  await page.goto(`${origin}${path}`)
  await page.waitForLoadState('networkidle')
}

test.describe('цели Метрики', () => {
  test.describe.configure({ mode: 'serial' })

  let server: ChildProcess | undefined
  let origin = ''

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    const port = BASE_PORT + testInfo.parallelIndex
    origin = `http://localhost:${port}`
    server = spawn('node', ['.output/server/index.mjs'], {
      env: {
        ...process.env,
        PORT: String(port),
        NITRO_PORT: String(port),
        NUXT_PUBLIC_METRIKA_ID: '12345678',
      },
      stdio: 'ignore',
    })
    const deadline = Date.now() + 30_000
    for (;;) {
      try {
        if ((await fetch(`${origin}/`)).ok) break
      } catch {
        // сервер ещё стартует
      }
      if (Date.now() > deadline) throw new Error('сервер со счётчиком не поднялся')
      await new Promise((r) => setTimeout(r, 300))
    }
  })

  test.afterAll(() => {
    server?.kill('SIGTERM')
  })

  test('до «Принять» целей нет даже после расчёта и действий', async ({ page }) => {
    await spyYm(page)
    await open(page, origin)
    await fillCalc(page)
    await page.getByRole('tab', { name: 'Сценарии' }).click()
    await page.getByRole('tab', { name: 'Сравнить' }).click()
    await page.waitForTimeout(500)
    expect(await goals(page)).toEqual([])
  })

  test('после «Принять»: calc_used один раз, затем вкладки и ссылка', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await spyYm(page)
    await open(page, origin)
    await accept(page).click()
    await expect.poll(() => page.evaluate(() => window.__ymCalls.length)).toBeGreaterThan(0)
    expect(await goals(page)).toEqual([])

    await fillCalc(page)
    await expect.poll(() => goals(page)).toEqual(['calc_used'])
    const calcCall = (await page.evaluate(() => window.__ymCalls)).find((c) => c[2] === 'calc_used')
    expect(calcCall).toEqual([12345678, 'reachGoal', 'calc_used', { calc: 'system' }])

    // Второй расчёт цель не добавляет.
    await page.getByLabel('Сумма ставки, ₽').fill('5000')
    await page.getByLabel('Коэффициент события 1', { exact: true }).fill('1,90')
    await page.waitForTimeout(700)
    expect(await goals(page)).toEqual(['calc_used'])

    await page.getByRole('tab', { name: 'Сценарии' }).click()
    await expect.poll(() => goals(page)).toContain('scenario_opened')

    await page.getByRole('tab', { name: 'Сравнить' }).click()
    await expect.poll(() => goals(page)).toContain('compare_opened')

    await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
    await expect.poll(() => goals(page)).toContain('share_copied')

    const all = await goals(page)
    expect(all.filter((g) => g === 'calc_used')).toHaveLength(1)
    expect(all.sort()).toEqual(['calc_used', 'compare_opened', 'scenario_opened', 'share_copied'])
  })

  test('после «Отклонить» целей нет', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await spyYm(page)
    await open(page, origin)
    await reject(page).click()
    await fillCalc(page)
    await page.getByRole('tab', { name: 'Сценарии' }).click()
    await page.getByRole('tab', { name: 'Сравнить' }).click()
    await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
    await page.waitForTimeout(700)
    expect(await goals(page)).toEqual([])
  })

  test('расчёт из ссылки при загрузке не шлёт calc_used без действий', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'accepted'), STORAGE_KEY)
    await spyYm(page)
    await open(page, origin, SHARE_PATH)
    await expect(page.getByTestId('payout')).toBeVisible()
    await page.waitForTimeout(800)
    // Метрика загружена (init вызван), но целей нет.
    expect(await page.evaluate(() => window.__ymCalls.some((c) => c[1] === 'init'))).toBe(true)
    expect(await goals(page)).toEqual([])
  })
})

import { expect, test } from '@playwright/test'
import { SITE_PAGES } from '../../shared/site-pages'

// Расхождение серверной и клиентской разметки ломает гидратацию: Vue пишет об
// этом в консоль. Проверяем все страницы реестра.
for (const { path } of SITE_PAGES) {
  test(`гидратация без расхождений: ${path}`, async ({ page }) => {
    const messages: string[] = []
    page.on('console', (msg) => {
      if (/hydrat/i.test(msg.text())) messages.push(msg.text())
    })
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(messages).toEqual([])
  })
}

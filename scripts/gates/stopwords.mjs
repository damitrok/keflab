// Гейт: стоп-слова из data/site.json не встречаются в видимом тексте страниц.
import { readFileSync } from 'node:fs'
import { SITE_PAGES } from '../../shared/site-pages.ts'
import { report, visibleText, withServer } from './lib-server.mjs'

const { stopWords } = JSON.parse(readFileSync('data/site.json', 'utf8'))
// Все страницы реестра — новые проверяются автоматически.
const PAGES = SITE_PAGES.map((p) => p.path)

await withServer(3153, async (get) => {
  const checks = {}
  for (const path of PAGES) {
    const text = visibleText((await get(path)).html).toLowerCase()
    const found = stopWords.filter((w) => text.includes(w.toLowerCase()))
    checks[`${path}: стоп-слов нет${found.length ? ` (найдено: ${found.join(', ')})` : ''}`] =
      found.length === 0
  }
  report(checks)
})

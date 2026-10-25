// Считает lastmod для sitemap.xml и пишет shared/lastmod.json.
// Источник даты: последний коммит git по файлу страницы -> mtime файла ->
// дата сборки. Запускается перед сборкой (prebuild).
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const today = new Date().toISOString().slice(0, 10)

// Реестр — TS-файл без зависимостей: читаем его через strip-types Node 22.18+,
// а если недоступно, разбираем текст.
async function loadPages() {
  try {
    const mod = await import(resolve(root, 'shared/site-pages.ts'))
    return mod.SITE_PAGES
  } catch {
    return null
  }
}

function parsePages() {
  const text = readFileSync(resolve(root, 'shared/site-pages.ts'), 'utf8')
  const out = []
  const re = /path:\s*'([^']+)',\s*source:\s*'([^']+)'/g
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ path: m[1], source: m[2] })
  return out
}

function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null
  } catch {
    return null
  }
}

function mtimeDate(file) {
  try {
    return statSync(resolve(root, file)).mtime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

const pages = (await loadPages()) ?? parsePages()
const result = {}
for (const page of pages) {
  result[page.path] = gitDate(page.source) ?? mtimeDate(page.source) ?? today
}
writeFileSync(resolve(root, 'shared/lastmod.json'), JSON.stringify(result, null, 2) + '\n')
console.log(`lastmod: ${Object.keys(result).length} страниц`)

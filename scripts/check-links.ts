// Проверка внешних ссылок: только домены из data/allowlist.json (и собственный keflab.ru).
// Запуск: node scripts/check-links.ts [--root <каталог>]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

export const OWN_DOMAIN = 'keflab.ru'

// Технические URI (пространства имён и @context), это не ссылки. Сравнение точное,
// без учёта протокола, «www.» и хвостового слеша.
const TECHNICAL_URIS = new Set([
  'w3.org/2000/svg',
  'w3.org/1999/xlink',
  'w3.org/1999/xhtml',
  'w3.org/xml/1998/namespace',
  'w3.org/2000/xmlns',
  'w3.org/1998/math/mathml',
  'sitemaps.org/schemas/sitemap/0.9',
  'schema.org',
])

const IGNORED_DIRS = new Set(['node_modules', '.nuxt', '.git'])
const URL_RE = /(?:https?:)?\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s"'`<>\\)\]}]*)?/gi
// Протокол-относительный «//host» считаем ссылкой только после кавычки, пробела, «=» или «(»,
// чтобы не ловить части путей и комментарии вида «// текст».
const PROTOCOL_RELATIVE_PREFIX = /["'`(=\s]/

export interface Violation {
  file: string
  line: number
  url: string
}

export interface CheckResult {
  filesChecked: number
  violations: Violation[]
}

function walk(dir: string, accept: (path: string) => boolean, out: string[]): void {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (IGNORED_DIRS.has(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, accept, out)
    else if (accept(full)) out.push(full)
  }
}

export function loadAllowlist(root: string): string[] {
  const path = join(root, 'data', 'allowlist.json')
  if (!existsSync(path)) return []
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { domains?: unknown }
  if (!Array.isArray(parsed.domains) || !parsed.domains.every((d) => typeof d === 'string')) {
    throw new Error(`${path}: ожидается формат { "domains": string[] }`)
  }
  return (parsed.domains as string[]).map((d) => d.trim().toLowerCase()).filter(Boolean)
}

// Домен разрешён, если он совпадает с записью allowlist или является её поддоменом.
// Собственный домен keflab.ru (с поддоменами, например staging) разрешён всегда.
export function isHostAllowed(host: string, allowlist: string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, '')
  return [OWN_DOMAIN, ...allowlist].some((d) => h === d || h.endsWith(`.${d}`))
}

function isTechnicalUri(url: string): boolean {
  const key = url
    .replace(/^(?:https?:)?\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/#?]+$/, '')
    .toLowerCase()
  return TECHNICAL_URIS.has(key)
}

export function findViolationsInText(text: string, file: string, allowlist: string[]): Violation[] {
  const result: Violation[] = []
  for (const m of text.matchAll(URL_RE)) {
    const index = m.index ?? 0
    let url = m[0].replace(/[.,;:!]+$/, '')
    if (url.startsWith('//') && !(index === 0 || PROTOCOL_RELATIVE_PREFIX.test(text[index - 1]!))) {
      continue
    }
    if (isTechnicalUri(url)) continue
    let host: string
    try {
      host = new URL(url.startsWith('//') ? `https:${url}` : url).hostname
    } catch {
      continue
    }
    if (isHostAllowed(host, allowlist)) continue
    url = url.length > 200 ? `${url.slice(0, 200)}…` : url
    const line = text.slice(0, index).split('\n').length
    result.push({ file, line, url })
  }
  return result
}

export function checkLinks(root: string): CheckResult {
  const allowlist = loadAllowlist(root)
  const files: string[] = []
  walk(join(root, 'app'), (p) => /\.(vue|ts|js|md)$/.test(p), files)
  // data/bookmakers.json не сканируем: sourceUrl — источник правил, на странице
  // он выводится текстом без ссылки (до шага 13 ссылок на БК нет). Любая
  // настоящая ссылка попадёт в собранный HTML ниже и будет поймана там.
  walk(
    join(root, 'data'),
    (p) => p.endsWith('.json') && !p.endsWith(`${sep}bookmakers.json`),
    files,
  )
  walk(join(root, 'server'), (p) => p.endsWith('.ts'), files)
  walk(join(root, '.output', 'public'), (p) => p.endsWith('.html'), files)

  const violations: Violation[] = []
  for (const file of files) {
    const rel = relative(root, file)
    violations.push(...findViolationsInText(readFileSync(file, 'utf8'), rel, allowlist))
  }
  return { filesChecked: files.length, violations }
}

function main(): void {
  const args = process.argv.slice(2)
  const i = args.indexOf('--root')
  const root = resolve(i >= 0 ? (args[i + 1] ?? '') : process.cwd())
  if (i >= 0 && !args[i + 1]) {
    console.error('--root требует каталог')
    process.exit(2)
  }
  if (!existsSync(join(root, 'data', 'allowlist.json'))) {
    console.error(`check:links: ${root}/data/allowlist.json не найден`)
    process.exit(1)
  }
  const { filesChecked, violations } = checkLinks(root)
  for (const v of violations) {
    console.error(`${v.file}:${v.line} → домен не в data/allowlist.json: ${v.url}`)
  }
  if (violations.length > 0) {
    console.error(`check:links: нарушений ${violations.length}, файлов проверено ${filesChecked}`)
    process.exit(1)
  }
  console.log(`check:links: ок, проверено файлов: ${filesChecked}`)
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main()

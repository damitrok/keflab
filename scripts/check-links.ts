// Проверка внешних ссылок: только домены из data/allowlist.json (и собственный keflab.ru).
// Запуск: node scripts/check-links.ts [--root <каталог>] [--internal | --no-internal | --external]
//   по умолчанию: домены в исходниках и HTML; если есть .output/server/index.mjs,
//                 то ещё и внутренние ссылки (без сети наружу);
//   --internal    принудительно проверить внутренние ссылки (нужна сборка);
//   --no-internal отключить проверку внутренних ссылок;
//   --external    только ежедневная проверка трекинговых ссылок видимых офферов.
// Любая проблема даёт код 1.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { buildRedirectUrl } from '../shared/offers.ts'
import { todayMoscow } from '../shared/bookmakers.ts'
import { SITE_PAGES } from '../shared/site-pages.ts'

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

// ---------------------------------------------------------------- внутренние ссылки

export interface PageResponse {
  status: number
  html?: string
  /** Заголовок Location для 3xx. */
  location?: string
}

export type PageGetter = (path: string) => Promise<PageResponse>

const HREF_RE = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi

/** Внутренние ссылки a[href^="/"]: без query и hash, без /go/ и «//host». */
export function extractInternalLinks(html: string): string[] {
  const found = new Set<string>()
  for (const m of html.matchAll(HREF_RE)) {
    const raw = (m[1] ?? m[2] ?? '').replaceAll('&amp;', '&').trim()
    if (!raw.startsWith('/') || raw.startsWith('//')) continue
    const path = raw.split('#')[0]!.split('?')[0]!
    if (path === '' || path.startsWith('/go/')) continue
    found.add(path)
  }
  return [...found]
}

export interface InternalResult {
  pagesChecked: number
  linksChecked: number
  problems: string[]
}

/** Страница (или ссылка) в порядке, если 200 либо 301/308 на адрес, который отвечает 200. */
async function statusProblem(get: PageGetter, path: string): Promise<string | null> {
  const res = await get(path)
  if (res.status === 200) return null
  if (res.status === 301 || res.status === 308) {
    if (!res.location) return `${res.status} без Location`
    let target: string
    try {
      const u = new URL(res.location, 'http://local.invalid')
      target = u.pathname + u.search
    } catch {
      return `${res.status} на некорректный адрес ${res.location}`
    }
    const next = await get(target)
    return next.status === 200 ? null : `${res.status} на ${target}, а там ${next.status}`
  }
  return String(res.status)
}

export async function checkInternalLinks(
  get: PageGetter,
  pagePaths: readonly string[],
): Promise<InternalResult> {
  const problems: string[] = []
  const verdicts = new Map<string, string | null>()
  const verdict = async (path: string): Promise<string | null> => {
    if (!verdicts.has(path)) verdicts.set(path, await statusProblem(get, path))
    return verdicts.get(path)!
  }
  for (const page of pagePaths) {
    const res = await get(page)
    if (res.status !== 200) {
      problems.push(`страница ${page}: отвечает ${res.status}, ожидается 200`)
      continue
    }
    for (const link of extractInternalLinks(res.html ?? '')) {
      const bad = await verdict(link)
      if (bad !== null) problems.push(`страница ${page}: битая ссылка ${link} (${bad})`)
    }
  }
  return { pagesChecked: pagePaths.length, linksChecked: verdicts.size, problems }
}

export const INTERNAL_PORT = 3195
export const SERVER_ENTRY = join('.output', 'server', 'index.mjs')

/** Поднимает собранный сервер из root, вызывает fn(get) и гасит сервер. */
export async function withBuiltServer<T>(
  root: string,
  fn: (get: PageGetter) => Promise<T>,
  port = INTERNAL_PORT,
): Promise<T> {
  const server = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NITRO_PORT: String(port) },
    stdio: 'ignore',
  })
  const get: PageGetter = async (path) => {
    let lastError: unknown
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://localhost:${port}${path}`, { redirect: 'manual' })
        const html = res.status === 200 ? await res.text() : undefined
        return { status: res.status, html, location: res.headers.get('location') ?? undefined }
      } catch (e) {
        lastError = e
        await new Promise((r) => setTimeout(r, 200))
      }
    }
    throw new Error(`сервер не ответил: ${String(lastError)}`)
  }
  try {
    return await fn(get)
  } finally {
    server.kill()
  }
}

// ---------------------------------------------------------------- внешние (офферы)

export const USER_AGENT = 'keflab-link-check/1.0 (+https://keflab.ru/)'
export const MAX_REDIRECTS = 5
export const EXTERNAL_TIMEOUT_MS = 10_000

export interface OfferLike {
  id: string
  erid: string
  trackingUrl: string
  validFrom: string
  validTo: string
}

export interface ExternalOptions {
  fetch?: typeof fetch
  today?: string
  timeoutMs?: number
}

export interface ExternalResult {
  offersChecked: number
  problems: string[]
}

export function loadOffers(root: string): OfferLike[] {
  const path = join(root, 'data', 'offers.json')
  if (!existsSync(path)) return []
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path}: ожидается массив офферов`)
  return parsed as OfferLike[]
}

/** Один запрос с таймаутом, без cookie и без автоматических редиректов. */
async function request(
  doFetch: typeof fetch,
  url: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await doFetch(url, {
      method,
      redirect: 'manual',
      headers: { 'user-agent': USER_AGENT },
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Возвращает null, если ссылка жива, иначе описание ошибки. */
export async function probeUrl(
  startUrl: string,
  doFetch: typeof fetch,
  timeoutMs = EXTERNAL_TIMEOUT_MS,
): Promise<string | null> {
  let url = startUrl
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let res = await request(doFetch, url, 'HEAD', timeoutMs)
      if (res.status === 405 || res.status === 501) {
        res = await request(doFetch, url, 'GET', timeoutMs)
      }
      const location = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && location) {
        if (hop === MAX_REDIRECTS) return `больше ${MAX_REDIRECTS} редиректов`
        url = new URL(location, url).toString()
        continue
      }
      if (res.status >= 200 && res.status < 400) return null
      return `HTTP ${res.status}`
    }
    return `больше ${MAX_REDIRECTS} редиректов`
  } catch (e) {
    const err = e as { name?: string; message?: string }
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return 'таймаут'
    return `ошибка сети (${err.message ?? String(e)})`
  }
}

export async function checkOfferLinks(
  offers: readonly OfferLike[],
  opts: ExternalOptions = {},
): Promise<ExternalResult> {
  const doFetch = opts.fetch ?? fetch
  const today = opts.today ?? todayMoscow()
  const problems: string[] = []
  let checked = 0
  for (const o of offers) {
    if (today < o.validFrom || today > o.validTo) continue
    checked++
    let target: string
    try {
      target = buildRedirectUrl(o.trackingUrl, o.erid)
    } catch {
      problems.push(
        `оффер ${o.id} (erid ${o.erid}): трекинговая ссылка некорректна — снимите оффер (validTo вчерашней датой)`,
      )
      continue
    }
    const bad = await probeUrl(target, doFetch, opts.timeoutMs)
    if (bad !== null) {
      problems.push(
        `оффер ${o.id} (erid ${o.erid}): трекинговая ссылка отвечает ${bad} — снимите оффер (validTo вчерашней датой)`,
      )
    }
  }
  return { offersChecked: checked, problems }
}

// ---------------------------------------------------------------- CLI

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const i = args.indexOf('--root')
  const root = resolve(i >= 0 ? (args[i + 1] ?? '') : process.cwd())
  if (i >= 0 && !args[i + 1]) {
    console.error('--root требует каталог')
    process.exit(2)
  }
  const externalOnly = args.includes('--external')
  const hasBuild = existsSync(join(root, SERVER_ENTRY))
  const internal =
    !externalOnly && !args.includes('--no-internal') && (args.includes('--internal') || hasBuild)
  let failed = 0

  if (externalOnly) {
    const { offersChecked, problems } = await checkOfferLinks(loadOffers(root))
    for (const p of problems) console.error(p)
    failed += problems.length
    console.log(
      `check:links --external: офферов проверено ${offersChecked}, проблем ${problems.length}`,
    )
    process.exit(failed > 0 ? 1 : 0)
  }

  if (!existsSync(join(root, 'data', 'allowlist.json'))) {
    console.error(`check:links: ${root}/data/allowlist.json не найден`)
    process.exit(1)
  }
  const { filesChecked, violations } = checkLinks(root)
  for (const v of violations) {
    console.error(`${v.file}:${v.line} → домен не в data/allowlist.json: ${v.url}`)
  }
  failed += violations.length
  console.log(
    `check:links: домены, файлов проверено ${filesChecked}, нарушений ${violations.length}`,
  )

  if (internal) {
    if (!hasBuild) {
      console.error(`check:links --internal: нет сборки ${SERVER_ENTRY}, выполните npm run build`)
      process.exit(1)
    }
    const paths = SITE_PAGES.map((p) => p.path)
    const r = await withBuiltServer(root, (get) => checkInternalLinks(get, paths))
    for (const p of r.problems) console.error(p)
    failed += r.problems.length
    console.log(
      `check:links: внутренние ссылки, страниц ${r.pagesChecked}, уникальных ссылок ${r.linksChecked}, проблем ${r.problems.length}`,
    )
  }

  if (failed > 0) {
    console.error(`check:links: проблем всего ${failed}`)
    process.exit(1)
  }
  console.log('check:links: ок')
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

// Хэши inline-скриптов для Content-Security-Policy (script-src).
//
// Команды:
//   node deploy/scripts/csp-hashes.mjs generate <out.conf> <html-файл|каталог>...
//       собирает хэши со всех HTML и пишет файл nginx: set $keflab_script_hashes "...";
//   node deploy/scripts/csp-hashes.mjs verify <html-файл|-> <out.conf>
//       проверяет, что каждый inline-скрипт страницы есть в файле (exit 1, если нет).
//
// Учитываются только выполняемые inline-скрипты. Пропускаются: <script src=...>,
// JSON-данные (application/json, application/ld+json) — браузер их не выполняет.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
const DATA_TYPE_RE = /\btype\s*=\s*["']?(application\/json|application\/ld\+json)/i
const SRC_RE = /\bsrc\s*=/i
const HASH_TOKEN_RE = /'sha256-[A-Za-z0-9+/=]+'/g

/** Хэши (в кавычках, как в CSP) всех выполняемых inline-скриптов страницы. */
export function inlineScriptHashes(html) {
  const found = new Set()
  for (const match of html.matchAll(SCRIPT_RE)) {
    const attrs = match[1]
    const body = match[2]
    if (SRC_RE.test(attrs) || DATA_TYPE_RE.test(attrs) || body.length === 0) continue
    const digest = createHash('sha256').update(body, 'utf8').digest('base64')
    found.add(`'sha256-${digest}'`)
  }
  return [...found].sort()
}

function htmlFiles(target) {
  const path = resolve(target)
  if (statSync(path).isDirectory()) {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      const child = join(path, entry.name)
      if (entry.isDirectory()) return htmlFiles(child)
      return entry.name.endsWith('.html') ? [child] : []
    })
  }
  return [path]
}

function generate(outFile, targets) {
  const files = targets.flatMap(htmlFiles)
  if (files.length === 0) throw new Error('не найдено ни одного .html')
  const all = new Set()
  for (const file of files) {
    for (const hash of inlineScriptHashes(readFileSync(file, 'utf8'))) all.add(hash)
  }
  if (all.size === 0) throw new Error('inline-скриптов не найдено: проверьте, что это вывод Nuxt')
  const list = [...all].sort().join(' ')
  const tmp = `${outFile}.tmp`
  writeFileSync(
    tmp,
    `# Хэши inline-скриптов для script-src. Сгенерировано из ${files.length} HTML-файлов.\n` +
      `set $keflab_script_hashes "${list}";\n`,
  )
  renameSync(tmp, outFile)
  console.log(`записано ${all.size} хэш(ей) в ${outFile}`)
}

function verify(htmlSource, confFile) {
  const html = htmlSource === '-' ? readFileSync(0, 'utf8') : readFileSync(htmlSource, 'utf8')
  const page = inlineScriptHashes(html)
  if (page.length === 0) throw new Error('на странице нет inline-скриптов: это не HTML Nuxt?')
  const allowed = new Set(readFileSync(confFile, 'utf8').match(HASH_TOKEN_RE) ?? [])
  const missing = page.filter((hash) => !allowed.has(hash))
  if (missing.length > 0) {
    throw new Error(`хэши inline-скриптов не в CSP: ${missing.join(' ')}`)
  }
  console.log(`проверено: ${page.length} inline-скрипт(ов), все разрешены`)
}

function main(argv) {
  const [command, ...args] = argv
  if (command === 'generate' && args.length >= 2) return generate(args[0], args.slice(1))
  if (command === 'verify' && args.length === 2) return verify(args[0], args[1])
  throw new Error(
    'использование: csp-hashes.mjs generate <out.conf> <html|каталог>... | verify <html|-> <conf>',
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(`[csp-hashes] ОШИБКА: ${error.message}`)
    process.exit(1)
  }
}

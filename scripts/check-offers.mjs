// Проверка офферов (шаг 13, первая версия; шаг 15 расширит).
// Запуск: node scripts/check-offers.mjs [--dir <каталог с offers.json>] [--today ГГГГ-ММ-ДД]
// В каталоге могут лежать offers.json, allowlist.json и site.json; чего нет —
// берётся из data/. Код выхода 1 при любой найденной проблеме.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { offersSchema } from '../data/schema.ts'
import { daysBetween, todayMoscow } from '../shared/bookmakers.ts'
import { findStopWords, hostAllowed } from '../shared/offers.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const EXPIRING_DAYS = 7

function readJson(dir, name) {
  const local = join(dir, name)
  const path = existsSync(local) ? local : join(root, 'data', name)
  return JSON.parse(readFileSync(path, 'utf8'))
}

const blank = (v) => typeof v !== 'string' || v.trim() === ''

/** @returns {{ offers: number, problems: string[] }} */
export function checkOffers({ dir = join(root, 'data'), today = todayMoscow() } = {}) {
  const problems = []
  const offers = readJson(dir, 'offers.json')
  const allowlist = readJson(dir, 'allowlist.json').domains ?? []
  const site = readJson(dir, 'site.json')
  const stopWords = site.stopWords ?? []
  if (site.media?.registered === true && blank(site.riskWarning)) {
    problems.push(
      'site.json: media.registered=true, но riskWarning пуст — без утверждённого предупреждения о рисках офферы включать нельзя',
    )
  }
  if (!Array.isArray(offers)) return { offers: 0, problems: ['offers.json: ожидается массив'] }

  const schema = offersSchema.safeParse(offers)
  const schemaProblems = schema.success
    ? []
    : schema.error.issues.map((i) => `схема: ${i.path.join('.')}: ${i.message}`)

  offers.forEach((o, i) => {
    const id = typeof o?.id === 'string' ? o.id : `#${i}`
    const fail = (msg) => problems.push(`оффер «${id}»: ${msg}`)
    if (blank(o.erid)) fail('нет erid — оффер не будет показан; укажите erid или уберите оффер')
    if (blank(o.advertiserName)) fail('нет рекламодателя (advertiserName)')
    if (blank(o.advertiserInn)) fail('нет ИНН рекламодателя (advertiserInn)')
    try {
      if (!hostAllowed(o.trackingUrl, allowlist)) {
        fail(`домен trackingUrl не в data/allowlist.json (${new URL(o.trackingUrl).hostname})`)
      }
    } catch {
      fail('trackingUrl не является корректным адресом')
    }
    for (const field of ['title', 'conditionsShort']) {
      const found = findStopWords(String(o[field] ?? ''), stopWords)
      if (found.length > 0) fail(`в ${field} стоп-слова: ${found.map((w) => `«${w}»`).join(', ')}`)
    }
    if (typeof o.validTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.validTo)) {
      const left = daysBetween(today, o.validTo)
      if (left < 0) {
        fail(`срок истёк ${o.validTo} — уберите оффер из data/offers.json`)
      } else if (left <= EXPIRING_DAYS) {
        fail(`срок кончается ${o.validTo} (осталось дней: ${left}) — продлите или уберите оффер`)
      }
    }
  })

  // Схема ловит то же самое и ещё формат дат, ИНН и дубли; повторы сообщений не печатаем.
  for (const p of schemaProblems) problems.push(p)
  return { offers: offers.length, problems }
}

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dirArg = arg('--dir')
  const { offers, problems } = checkOffers({
    dir: dirArg ? resolve(dirArg) : join(root, 'data'),
    today: arg('--today') ?? todayMoscow(),
  })
  if (problems.length > 0) {
    console.error(`check:offers: проблем: ${problems.length}`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`check:offers: ок, офферов: ${offers}`)
}

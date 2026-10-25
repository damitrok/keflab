// Проверка свежести правил БК (шаг 15).
// Запуск: node scripts/check-rules.mjs [--dir <каталог с bookmakers.json>] [--today ГГГГ-ММ-ДД] [--warn-days 30]
// Код выхода 1 — просроченные правила или ошибки данных; предупреждения и info не ломают.
// Даты — по Москве (сервер в UTC): today по умолчанию берётся из todayMoscow().
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES_MAX_AGE_DAYS, daysBetween, todayMoscow } from '../shared/bookmakers.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const DEFAULT_WARN_DAYS = 30

/** @returns {{ bookmakers: number, errors: string[], warnings: string[], info: string[] }} */
export function checkRules({
  dir = join(root, 'data'),
  today = todayMoscow(),
  warnDays = DEFAULT_WARN_DAYS,
} = {}) {
  const errors = []
  const warnings = []
  const info = []
  const list = JSON.parse(readFileSync(join(dir, 'bookmakers.json'), 'utf8'))
  if (!Array.isArray(list)) {
    return { bookmakers: 0, errors: ['bookmakers.json: ожидается массив'], warnings, info }
  }
  for (const b of list) {
    const slug = b?.slug ?? '(без slug)'
    if (!b?.systemRules) {
      info.push(`${slug}: правил нет — страница не публикуется`)
      continue
    }
    if (b.checkedAt == null) {
      errors.push(`${slug}: правила заполнены, но checkedAt пуст — страница не публикуется`)
      continue
    }
    if (typeof b.checkedAt !== 'string' || !DATE_RE.test(b.checkedAt)) {
      errors.push(`${slug}: checkedAt «${b.checkedAt}» — ожидается ГГГГ-ММ-ДД`)
      continue
    }
    const age = daysBetween(b.checkedAt, today)
    if (Number.isNaN(age)) {
      errors.push(`${slug}: checkedAt «${b.checkedAt}» — несуществующая дата`)
    } else if (age < 0) {
      errors.push(`${slug}: checkedAt ${b.checkedAt} в будущем (сегодня ${today}) — опечатка?`)
    } else if (age > RULES_MAX_AGE_DAYS) {
      errors.push(
        `${slug}: правила проверены ${age} дней назад — страница снята с сайта до перепроверки`,
      )
    } else if (RULES_MAX_AGE_DAYS - age <= warnDays) {
      warnings.push(
        `${slug}: правила устареют через ${RULES_MAX_AGE_DAYS - age} дн. (проверены ${b.checkedAt}) — перепроверьте`,
      )
    }
  }
  return { bookmakers: list.length, errors, warnings, info }
}

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const warnArg = arg('--warn-days')
  const warnDays = warnArg === undefined ? DEFAULT_WARN_DAYS : Number(warnArg)
  if (!Number.isInteger(warnDays) || warnDays < 0) {
    console.error('check:rules: --warn-days — целое число от 0')
    process.exit(2)
  }
  const dirArg = arg('--dir')
  const { bookmakers, errors, warnings, info } = checkRules({
    dir: dirArg ? resolve(dirArg) : join(root, 'data'),
    today: arg('--today') ?? todayMoscow(),
    warnDays,
  })
  for (const m of info) console.log(`  i ${m}`)
  for (const m of warnings) console.warn(`  ! ${m}`)
  if (errors.length > 0) {
    console.error(`check:rules: проблем: ${errors.length}`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`check:rules: ок, БК: ${bookmakers}, предупреждений: ${warnings.length}`)
}

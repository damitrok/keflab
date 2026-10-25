// Отчёт за месяц (шаг 15): показы и клики по каждому erid в CSV.
// Запуск: node scripts/report.mjs --month=ГГГГ-ММ [--dir <статистика>] [--out <файл.csv>] [--offers <offers.json>]
// Формат: UTF-8 с BOM, разделитель «;» (Excel с русской локалью), строки через CRLF.
// Месяц и ключи статистики — по Москве. Выплаты сетей и расходы человек вносит сам
// в пустые столбцы payout_rub и costs_rub. Коды выхода: 2 — неверные аргументы.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import { createStats } from '../server/utils/stats.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const HEADER = [
  'date',
  'erid',
  'offer_id',
  'advertiser',
  'impressions',
  'clicks',
  'throttled',
  'payout_rub',
  'costs_rub',
]
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

/** Поле CSV: кавычки, «;», переводы строк; ведущие = + - @ экранируются от формул Excel. */
export function csvField(v) {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function monthRange(month) {
  const m = MONTH_RE.exec(month ?? '')
  if (!m) return null
  const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

/** @returns {Promise<{ csv: string, rows: number }>} csv — без BOM. */
export async function buildReport({ month, dir, offers = [] }) {
  const range = monthRange(month)
  if (!range) throw new Error(`неверный месяц «${month}», ожидается ГГГГ-ММ (например 2027-10)`)
  const storage = createStorage({ driver: fsDriver({ base: dir }) })
  const stats = createStats({
    storage: {
      get: (k) => storage.getItem(k),
      set: (k, v) => storage.setItem(k, v),
      keys: () => storage.getKeys(),
      remove: (k) => storage.removeItem(k),
    },
    today: () => range.to,
  })
  const data = await stats.readStats(range.from, range.to)
  const byErid = new Map(offers.map((o) => [o.erid, o]))
  const lines = [HEADER]
  const totals = new Map()
  for (const r of data) {
    const o = byErid.get(r.erid)
    const th = r.throttled ?? 0
    lines.push([
      r.date,
      r.erid,
      o?.id ?? '',
      o?.advertiserName ?? '',
      r.impressions,
      r.clicks,
      th,
      '',
      '',
    ])
    const t = totals.get(r.erid) ?? { i: 0, c: 0, t: 0 }
    t.i += r.impressions
    t.c += r.clicks
    t.t += th
    totals.set(r.erid, t)
  }
  for (const [erid, t] of [...totals].sort((a, b) => a[0].localeCompare(b[0]))) {
    const o = byErid.get(erid)
    lines.push(['total', erid, o?.id ?? '', o?.advertiserName ?? '', t.i, t.c, t.t, '', ''])
  }
  const csv = lines.map((l) => l.map(csvField).join(';')).join('\r\n') + '\r\n'
  return { csv, rows: data.length }
}

function arg(name) {
  const eq = process.argv.find((a) => a.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main() {
  const month = arg('--month')
  if (!monthRange(month)) {
    console.error(
      `report: нужен --month=ГГГГ-ММ (например --month=2027-10), получено «${month ?? ''}»`,
    )
    process.exit(2)
  }
  const dir = resolve(arg('--dir') ?? process.env.KEFLAB_STATS_DIR ?? join(root, '.data/stats'))
  const offersPath = resolve(arg('--offers') ?? join(root, 'data/offers.json'))
  const offers = JSON.parse(readFileSync(offersPath, 'utf8'))
  const { csv, rows } = await buildReport({ month, dir, offers })
  if (rows === 0) console.error(`report: за ${month} данных нет — в файле только заголовок`)
  const out = arg('--out')
  if (out) {
    mkdirSync(dirname(resolve(out)), { recursive: true })
    writeFileSync(resolve(out), '﻿' + csv, 'utf8')
    console.error(`report: записано ${resolve(out)}, строк данных: ${rows}`)
  } else {
    process.stdout.write('﻿' + csv)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`report: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  })
}

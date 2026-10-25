import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
// @ts-expect-error — .mjs без типов
import { buildReport, csvField, monthRange } from '../../scripts/report.mjs'

let tmp: string
let statsDir: string
let offersFile: string
const offers = [
  { id: 'fake-1', erid: 'ERID-A', advertiserName: 'ООО «Вымышленный; "Тест"»' },
  { id: 'fake-2', erid: 'ERID-B', advertiserName: 'Строка\nс переносом' },
]

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'report-'))
  statsDir = join(tmp, 'stats')
  mkdirSync(statsDir)
  const storage = createStorage({ driver: fsDriver({ base: statsDir }) })
  const put = (k: string, v: object) => storage.setItem(k, v)
  await put('2026-09-30:ERID-A', { impressions: 99, clicks: 9 }) // до месяца
  await put('2026-10-01:ERID-A', { impressions: 10, clicks: 1 })
  await put('2026-10-01:ERID-GONE', { impressions: 3, clicks: 0 })
  await put('2026-10-15:ERID-A', { impressions: 20, clicks: 2, throttled: 4 })
  await put('2026-10-31:ERID-B', { impressions: 5, clicks: 1 })
  await put('2026-11-01:ERID-A', { impressions: 77, clicks: 7 }) // после месяца
  offersFile = join(tmp, 'offers.json')
  writeFileSync(offersFile, JSON.stringify(offers))
})
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const lines = (csv: string) => csv.trimEnd().split('\r\n')

describe('report', () => {
  it('границы месяца и строки данных', async () => {
    const { csv, rows } = await buildReport({ month: '2026-10', dir: statsDir, offers })
    expect(rows).toBe(4)
    const l = lines(csv)
    expect(l[0]).toBe(
      'date;erid;offer_id;advertiser;impressions;clicks;throttled;payout_rub;costs_rub',
    )
    expect(csv).not.toContain('2026-09-30')
    expect(csv).not.toContain('2026-11-01')
    expect(l).toContain('2026-10-01;ERID-GONE;;;3;0;0;;')
    expect(l).toContain('2026-10-15;ERID-A;fake-1;"ООО «Вымышленный; ""Тест""»";20;2;4;;')
  })
  it('итоги по каждому erid', async () => {
    const { csv } = await buildReport({ month: '2026-10', dir: statsDir, offers })
    const l = lines(csv)
    expect(
      l.some((x: string) => x.startsWith('total;ERID-A;fake-1;') && x.endsWith(';30;3;4;;')),
    ).toBe(true)
    expect(l).toContain('total;ERID-GONE;;;3;0;0;;')
    expect(csv).toContain('total;ERID-B;fake-2;"Строка\nс переносом";5;1;0;;')
  })
  it('другой месяц и пустой месяц', async () => {
    const nov = await buildReport({ month: '2026-11', dir: statsDir, offers })
    expect(nov.rows).toBe(1)
    const none = await buildReport({ month: '2027-01', dir: statsDir, offers })
    expect(none.rows).toBe(0)
    expect(lines(none.csv)).toHaveLength(1)
  })
  it('неверный месяц — исключение', async () => {
    await expect(buildReport({ month: '2026-13', dir: statsDir })).rejects.toThrow('неверный месяц')
  })
  it('monthRange: февраль високосного года', () => {
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthRange('2026-1')).toBeNull()
  })
  it('csvField: экранирование и защита от формул', () => {
    expect(csvField('a;b')).toBe('"a;b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('=1+1')).toBe("'=1+1")
    expect(csvField(5)).toBe('5')
    expect(csvField(null)).toBe('')
  })
  it('CLI: BOM в файле, пустая статистика, код 2', () => {
    const cli = (args: string[]) =>
      spawnSync('node', ['scripts/report.mjs', ...args], { encoding: 'utf8' })
    const out = join(tmp, 'out', 'r.csv')
    const ok = cli(['--month=2026-10', '--dir', statsDir, '--offers', offersFile, '--out', out])
    expect(ok.status).toBe(0)
    expect(readFileSync(out, 'utf8').startsWith('﻿date;erid;')).toBe(true)
    const empty = cli(['--month=2030-01', '--dir', statsDir, '--offers', offersFile])
    expect(empty.status).toBe(0)
    expect(empty.stderr).toContain('данных нет')
    expect(empty.stdout.startsWith('﻿date;')).toBe(true)
    const bad = cli(['--month=2026-99'])
    expect(bad.status).toBe(2)
    expect(bad.stderr).toContain('--month')
    expect(cli([]).status).toBe(2)
  })
})

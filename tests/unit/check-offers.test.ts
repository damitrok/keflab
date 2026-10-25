import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
// @ts-expect-error — .mjs без типов
import { checkOffers } from '../../scripts/check-offers.mjs'

const dir = (name: string) => fileURLToPath(new URL(`../fixtures/offers/${name}`, import.meta.url))
const today = '2026-10-25'
const run = (name: string) =>
  checkOffers({ dir: dir(name), today }) as { offers: number; problems: string[] }

describe('check-offers', () => {
  it('хороший оффер — без проблем', () => {
    expect(run('good')).toEqual({ offers: 1, problems: [] })
  })
  it.each([
    ['no-erid', 'нет erid'],
    ['no-advertiser', 'нет рекламодателя'],
    ['no-inn', 'нет ИНН'],
    ['bad-domain', 'не в data/allowlist.json'],
    ['stopword', 'гарантированный выигрыш'],
    ['stopword-yo', 'лёгкие деньги'],
    ['expiring', 'срок кончается'],
    ['expired', 'срок истёк'],
    ['no-risk-warning', 'riskWarning пуст'],
  ])('%s → проблема', (name, text) => {
    const { problems } = run(name)
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join('\n')).toContain(text)
  })
  it('CLI: код 0 на пустых данных, 1 на плохих', () => {
    const script = fileURLToPath(new URL('../../scripts/check-offers.mjs', import.meta.url))
    expect(spawnSync('node', [script]).status).toBe(0)
    expect(spawnSync('node', [script, '--dir', dir('no-erid'), '--today', today]).status).toBe(1)
    expect(spawnSync('node', [script, '--dir', dir('good'), '--today', today]).status).toBe(0)
  })
})

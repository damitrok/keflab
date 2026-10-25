import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
// @ts-expect-error — .mjs без типов
import { checkRules } from '../../scripts/check-rules.mjs'

const dir = (name: string) => fileURLToPath(new URL(`../fixtures/rules/${name}`, import.meta.url))
const today = '2026-10-25'
const run = (name: string, warnDays?: number) =>
  checkRules({ dir: dir(name), today, warnDays }) as {
    bookmakers: number
    errors: string[]
    warnings: string[]
    info: string[]
  }

describe('check-rules', () => {
  it('свежие правила — чисто', () => {
    expect(run('good')).toEqual({ bookmakers: 1, errors: [], warnings: [], info: [] })
  })
  it('ровно 180 дней — не ошибка, но предупреждение', () => {
    const r = run('boundary')
    expect(r.errors).toEqual([])
    expect(r.warnings.join()).toContain('через 0 дн.')
  })
  it('181 день — ошибка со снятием страницы', () => {
    const r = run('stale')
    expect(r.errors.join()).toContain('проверены 181 дней назад — страница снята с сайта')
  })
  it('правил нет — info, не ошибка', () => {
    const r = run('null-rules')
    expect(r.errors).toEqual([])
    expect(r.info.join()).toContain('правил нет — страница не публикуется')
  })
  it('правила есть, checkedAt пуст — ошибка', () => {
    expect(run('no-checked').errors.join()).toContain('checkedAt пуст')
  })
  it('дата в будущем — ошибка', () => {
    expect(run('future').errors.join()).toContain('в будущем')
  })
  it('скоро истекает — предупреждение; --warn-days меняет порог', () => {
    expect(run('warn').warnings.join()).toContain('через 12 дн.')
    expect(run('warn', 5).warnings).toEqual([])
  })
  it('пустой список — без проблем', () => {
    expect(checkRules({ dir: dir('good'), today: '2026-09-01' }).errors).toEqual([])
  })
  it('CLI: просрочка → 1, предупреждение → 0, --today учитывается', () => {
    const cli = (args: string[]) =>
      spawnSync('node', ['scripts/check-rules.mjs', ...args], { encoding: 'utf8' })
    expect(cli(['--dir', dir('stale'), '--today', today]).status).toBe(1)
    const warn = cli(['--dir', dir('warn'), '--today', today])
    expect(warn.status).toBe(0)
    expect(warn.stderr).toContain('устареют')
    expect(cli(['--dir', dir('good'), '--today', '2027-12-01']).status).toBe(1)
    expect(cli(['--warn-days', 'x']).status).toBe(2)
  })
})

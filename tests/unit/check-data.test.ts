import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateDataDir } from '../../scripts/check-data.ts'

const root = resolve(import.meta.dirname, '../..')
const script = join(root, 'scripts/check-data.ts')
const tmpDirs: string[] = []

function tmpCopyOfData(): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-data-'))
  tmpDirs.push(dir)
  cpSync(join(root, 'data'), dir, { recursive: true })
  return dir
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('validateDataDir', () => {
  it('настоящий каталог data/ без ошибок', () => {
    expect(validateDataDir(join(root, 'data'))).toEqual([])
  })

  it('фикстура с ошибками: erid, дата, домен', () => {
    const errors = validateDataDir(join(root, 'tests/fixtures/data-invalid'))
    expect(
      errors.some((e) => e.includes('offers.json') && e.includes('[0].erid: обязательное поле')),
    ).toBe(true)
    expect(errors.some((e) => e.includes('offers.json') && e.includes('validFrom'))).toBe(true)
    expect(errors.some((e) => e.includes('allowlist.json') && e.includes('domains[0]'))).toBe(true)
  })

  it('синтаксическая ошибка JSON с позицией', () => {
    const dir = tmpCopyOfData()
    writeFileSync(join(dir, 'offers.json'), '[\n  { "id": }\n]')
    const errors = validateDataDir(dir)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('offers.json')
    expect(errors[0]).toContain('синтаксическая ошибка JSON')
    expect(errors[0]).toMatch(/строка \d+, столбец \d+/)
  })

  it('отсутствующий обязательный файл', () => {
    const dir = tmpCopyOfData()
    rmSync(join(dir, 'site.json'))
    const errors = validateDataDir(dir)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('site.json')
    expect(errors[0]).toContain('отсутствует')
  })

  it('неизвестное поле ловится', () => {
    const dir = tmpCopyOfData()
    writeFileSync(join(dir, 'allowlist.json'), '{"domains":[],"domain":[]}')
    const errors = validateDataDir(dir)
    expect(errors.join('\n')).toContain('неизвестное поле')
  })
})

describe('CLI', () => {
  it('data/: код 0', () => {
    const res = spawnSync('node', [script], { cwd: root, encoding: 'utf8' })
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('4 файла проверены, ошибок нет')
  })

  it('--dir с битой фикстурой: ненулевой код и offers.json в выводе', () => {
    const res = spawnSync('node', [script, '--dir', 'tests/fixtures/data-invalid'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(res.status).toBe(1)
    expect(res.stderr).toContain('offers.json')
  })
})

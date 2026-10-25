import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { z } from 'zod'
import { dataFileSchemas } from '../data/schema.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  let out = ''
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`
    else out += out === '' ? String(part) : `.${String(part)}`
  }
  return out
}

function describeIssue(issue: z.core.$ZodIssue): string[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((k) => `${k}: неизвестное поле (опечатка?)`)
  }
  const path = formatPath(issue.path)
  let message = issue.message
  if (issue.code === 'invalid_type') {
    message = /received undefined$/.test(issue.message)
      ? 'обязательное поле'
      : `неверный тип, ожидается ${issue.expected}`
  }
  return [path === '' ? message : `${path}: ${message}`]
}

function toLineColumn(text: string, pos: number): string {
  const before = text.slice(0, pos)
  const line = before.split('\n').length
  const column = pos - before.lastIndexOf('\n')
  return `строка ${line}, столбец ${column}`
}

function jsonPosition(text: string, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  const m = /position (\d+)/.exec(msg)
  if (m) return toLineColumn(text, Number(m[1]))
  // Node без позиции в сообщении: ищем первый префикс, который уже нельзя дописать до валидного JSON.
  for (let n = 1; n <= text.length; n++) {
    try {
      JSON.parse(text.slice(0, n))
    } catch (e) {
      const reason = e instanceof Error ? e.message : ''
      if (!/end of JSON input|Unterminated|Expected .* after/i.test(reason))
        return toLineColumn(text, n - 1)
    }
  }
  return 'позиция не определена'
}

/** Проверяет каталог с data-файлами, возвращает список понятных сообщений об ошибках. */
export function validateDataDir(dir: string): string[] {
  const absDir = resolve(dir)
  const shown = (name: string) => {
    const rel = relative(root, join(absDir, name))
    return rel.startsWith('..') ? join(absDir, name) : rel
  }
  const errors: string[] = []
  for (const [name, schema] of Object.entries(dataFileSchemas)) {
    const file = join(absDir, name)
    const label = shown(name)
    if (!existsSync(file)) {
      errors.push(`${label} → файл отсутствует (обязательный файл)`)
      continue
    }
    const text = readFileSync(file, 'utf8')
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      errors.push(`${label} → синтаксическая ошибка JSON (${jsonPosition(text, e)}): ${reason}`)
      continue
    }
    const result = schema.safeParse(json)
    if (!result.success) {
      for (const issue of result.error.issues) {
        for (const line of describeIssue(issue)) errors.push(`${label} → ${line}`)
      }
    }
  }
  return errors
}

export const dataFileCount = Object.keys(dataFileSchemas).length

function main(argv: string[]): number {
  let dir = join(root, 'data')
  const i = argv.indexOf('--dir')
  if (i !== -1) {
    const value = argv[i + 1]
    if (!value) {
      console.error('check:data → после --dir нужно указать путь к каталогу')
      return 1
    }
    dir = resolve(process.cwd(), value)
  }
  if (!existsSync(dir)) {
    console.error(`check:data → каталог не найден: ${dir}`)
    return 1
  }
  const errors = validateDataDir(dir)
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    console.error(`\ncheck:data → найдено ошибок: ${errors.length}`)
    return 1
  }
  const rel = relative(root, dir) || '.'
  console.log(`${rel}/*.json: ${dataFileCount} файла проверены, ошибок нет`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}

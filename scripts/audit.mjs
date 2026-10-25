// Еженедельная проверка уязвимостей (шаг 15): npm audit по продакшен-зависимостям,
// high и critical — ошибка, кроме записей в security/audit-exceptions.json с
// причиной и сроком пересмотра. Просроченное исключение снова считается ошибкой.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const today = new Date().toISOString().slice(0, 10)
const exceptions = JSON.parse(
  readFileSync(process.env.AUDIT_EXCEPTIONS ?? 'security/audit-exceptions.json', 'utf8'),
)
const active = new Map(exceptions.filter((e) => e.reviewBy >= today).map((e) => [e.id, e]))

let raw
try {
  raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' })
} catch (error) {
  // npm audit выходит с кодом 1, если что-то нашёл — JSON всё равно в stdout.
  raw = error.stdout
}
const report = JSON.parse(raw)

const found = new Map()
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via !== 'object') continue
    if (via.severity !== 'high' && via.severity !== 'critical') continue
    const id = via.url?.split('/').pop() ?? via.title
    found.set(id, { id, name: via.name, severity: via.severity, title: via.title, url: via.url })
  }
}

let failed = 0
for (const f of found.values()) {
  const ex = active.get(f.id)
  if (ex) {
    console.log(`исключение до ${ex.reviewBy}: ${f.severity} ${f.name} — ${f.title} (${f.url})`)
  } else {
    failed++
    console.error(`УЯЗВИМОСТЬ ${f.severity} ${f.name} — ${f.title} (${f.url})`)
  }
}
for (const e of exceptions.filter((x) => x.reviewBy < today)) {
  console.error(`исключение ${e.id} (${e.package}) просрочено ${e.reviewBy} — пересмотрите`)
}

if (failed > 0) {
  console.error(`audit: ${failed} уязвимостей high/critical без исключения`)
  process.exit(1)
}
console.log(`audit: ок (продакшен-зависимости, high/critical без исключений нет)`)

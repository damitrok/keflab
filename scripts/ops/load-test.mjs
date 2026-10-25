// Нагрузочный тест без зависимостей. Открытая модель: запросы уходят по таймеру
// с заданной частотой, независимо от скорости ответов.
// Пример: npm run load-test -- --url http://localhost:3000 --duration 30 --rps-home 100 --rps-geo 20
// Staging под паролем: --auth user:pass
import { performance } from 'node:perf_hooks'

function parseArgs(argv) {
  const opts = {
    url: 'http://localhost:3000',
    duration: 30,
    'rps-home': 100,
    'rps-geo': 20,
    auth: '',
  }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '')
    if (!key || !(key in opts)) throw new Error(`неизвестный аргумент: ${argv[i]}`)
    const value = argv[++i]
    if (value === undefined) throw new Error(`нет значения для --${key}`)
    opts[key] = key === 'url' || key === 'auth' ? value : Number(value)
  }
  for (const k of ['duration', 'rps-home', 'rps-geo']) {
    if (!Number.isFinite(opts[k]) || opts[k] < 0)
      throw new Error(`--${k}: нужно неотрицательное число`)
  }
  if (opts.duration <= 0) throw new Error('--duration должен быть больше 0')
  return opts
}

const percentile = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0

async function runTarget(base, path, rps, durationSec, headers) {
  const stat = { path, target: rps, sent: 0, statuses: {}, networkErrors: 0, bad: 0, latencies: [] }
  if (rps === 0) return { stat, elapsed: durationSec }
  const pending = new Set()
  const fire = () => {
    const t0 = performance.now()
    const p = fetch(base + path, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (res) => {
        await res.arrayBuffer()
        stat.latencies.push(performance.now() - t0)
        stat.statuses[res.status] = (stat.statuses[res.status] ?? 0) + 1
        if (res.status < 200 || res.status >= 400) stat.bad++
      })
      .catch(() => {
        stat.networkErrors++
      })
      .finally(() => pending.delete(p))
    pending.add(p)
    stat.sent++
  }
  const start = performance.now()
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000
      if (elapsed >= durationSec) {
        clearInterval(timer)
        resolve()
        return
      }
      const due = Math.floor(elapsed * rps)
      while (stat.sent < due) fire()
    }, 5)
  })
  const elapsed = (performance.now() - start) / 1000
  await Promise.allSettled([...pending])
  return { stat, elapsed }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const base = opts.url.replace(/\/+$/, '')
  const headers = opts.auth
    ? { authorization: `Basic ${Buffer.from(opts.auth).toString('base64')}` }
    : {}
  console.log(
    `нагрузка на ${base}: ${opts.duration} с, / ${opts['rps-home']} rps, /api/geo ${opts['rps-geo']} rps`,
  )
  const results = await Promise.all([
    runTarget(base, '/', opts['rps-home'], opts.duration, headers),
    runTarget(base, '/api/geo', opts['rps-geo'], opts.duration, headers),
  ])
  let failed = false
  const rows = []
  for (const { stat, elapsed } of results) {
    if (stat.target === 0) continue
    const sorted = stat.latencies.toSorted((a, b) => a - b)
    const actual = stat.sent / elapsed
    const errors = stat.bad + stat.networkErrors
    const slow = actual < stat.target * 0.95
    if (errors > 0 || slow) failed = true
    rows.push({
      путь: stat.path,
      'цель rps': stat.target,
      'факт rps': Number(actual.toFixed(1)),
      запросов: stat.sent,
      статусы:
        Object.entries(stat.statuses)
          .map(([s, n]) => `${s}:${n}`)
          .join(' ') || '-',
      'ошибки сети': stat.networkErrors,
      'не 2xx/3xx': stat.bad,
      'p50, мс': Number(percentile(sorted, 50).toFixed(1)),
      'p95, мс': Number(percentile(sorted, 95).toFixed(1)),
      'p99, мс': Number(percentile(sorted, 99).toFixed(1)),
      итог: errors > 0 ? 'ОШИБКИ' : slow ? 'НИЗКАЯ ЧАСТОТА' : 'ок',
    })
  }
  console.table(rows)
  console.log(failed ? 'load-test: ПРОВАЛ' : 'load-test: ок')
  process.exitCode = failed ? 1 : 0
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})

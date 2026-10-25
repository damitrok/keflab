// Гейт шага 10: страницы БК (/bk/<slug>/kak-schitaetsya-sistema/) на сборке копии проекта.
// В копии data/bookmakers.json заменяется вымышленным набором
// tests/fixtures/bookmakers/mixed.json; даты проверки подставляются при запуске.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { report, visibleText } from './lib-server.mjs'

const root = process.cwd()
const tmp =
  '/private/tmp/claude-501/-Users-dmitriymitrokhin-Desktop-my-project-betting/4dcad454-fa12-49cf-9733-656be81dfdfa/scratchpad/bk-gate'
const PORT = 3350
const PAGE = (slug) => `/bk/${slug}/kak-schitaetsya-sistema/`
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

if (!existsSync(`${root}/app/pages/bk/[slug]/kak-schitaetsya-sistema.vue`)) {
  console.error(
    'FAIL нет app/pages/bk/[slug]/kak-schitaetsya-sistema.vue: страница БК ещё не готова',
  )
  process.exit(1)
}

const moscowToday = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)
const minusDays = (n) =>
  new Date(Date.parse(`${moscowToday}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)
const humanDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const fixture = JSON.parse(readFileSync(`${root}/tests/fixtures/bookmakers/mixed.json`, 'utf8'))
const freshDate = minusDays(10)
for (const b of fixture) {
  if (b.slug === 'test-fresh') b.checkedAt = freshDate
  if (b.slug === 'test-stale') b.checkedAt = minusDays(181)
}
const fresh = fixture.find((b) => b.slug === 'test-fresh')
const sourceNoProto = fresh.sourceUrl.replace(/^https?:\/\//, '')
const sourceHost = new URL(fresh.sourceUrl).host

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
const cleanup = () => rmSync(tmp, { recursive: true, force: true })

function sh(cmd, args, label) {
  const r = spawnSync(cmd, args, { cwd: tmp, encoding: 'utf8', env: { ...process.env } })
  if (r.status !== 0) {
    console.error(
      `FAIL ${label} (код ${r.status})\n${r.stdout.slice(-2000)}\n${r.stderr.slice(-2000)}`,
    )
    cleanup()
    process.exit(1)
  }
  return `${r.stdout}\n${r.stderr}`
}

spawnSync(
  'rsync',
  [
    '-a',
    '--exclude=node_modules',
    '--exclude=.output',
    '--exclude=.nuxt',
    '--exclude=.data',
    `${root}/`,
    `${tmp}/`,
  ],
  { stdio: 'inherit' },
)
symlinkSync(`${root}/node_modules`, `${tmp}/node_modules`)
writeFileSync(`${tmp}/data/bookmakers.json`, JSON.stringify(fixture, null, 2))
// Домены источников в allowlist НЕ добавляем: БК — не разрешённые ссылки до
// шага 13; check:links в копии должен пройти и так (источник — текст).

const checks = {}
sh('npm', ['run', 'build'], 'npm run build в копии')
checks['сборка копии прошла'] = existsSync(`${tmp}/.output/server/index.mjs`)

const pub = `${tmp}/.output/public`
checks['в .output/public есть test-fresh'] = existsSync(`${pub}${PAGE('test-fresh')}index.html`)
checks['в .output/public нет test-stale'] = !existsSync(`${pub}/bk/test-stale`)
checks['в .output/public нет test-norules'] = !existsSync(`${pub}/bk/test-norules`)

const server = spawn('node', ['.output/server/index.mjs'], {
  cwd: tmp,
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
  stdio: 'ignore',
})
async function get(path) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}${path}`)
      return { status: res.status, html: (await res.text()).replace(/\s/g, ' ') }
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error('сервер не ответил')
}

try {
  const page = await get(PAGE('test-fresh'))
  const text = visibleText(page.html).replace(/\s+/g, ' ')
  checks['test-fresh: 200'] = page.status === 200
  checks['test-fresh: ровно один H1'] = (page.html.match(/<h1[\s>]/gi) ?? []).length === 1
  checks[`test-fresh: видна дата проверки «${humanDate(freshDate)}»`] = text.includes(
    humanDate(freshDate),
  )
  checks[`test-fresh: виден источник «${sourceNoProto}»`] = text.includes(sourceNoProto)

  const hrefs = [...page.html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1])
  const external = hrefs.filter((h) => /^(https?:)?\/\//i.test(h))
  checks['test-fresh: нет ссылки с хостом sourceUrl'] =
    !hrefs.some((h) => h.includes(sourceHost)) &&
    !/<a\b[^>]*href=["'][^"']*(fresh-bk|stale-bk|norules-bk)/i.test(page.html)
  checks[`test-fresh: нет внешних <a href> (найдено: ${external.join(', ') || 'нет'})`] =
    external.length === 0

  // режим ставки: per_combination → выбрано «На одну комбинацию»
  const radios = [...page.html.matchAll(/<input\b[^>]*type\s*=\s*["']radio["'][^>]*>/gi)].map(
    (m) => m[0],
  )
  const checked = radios.filter((r) => /\bchecked\b/i.test(r))
  const labelIdx = text.indexOf('На одну комбинацию')
  checks['test-fresh: на странице есть вариант «На одну комбинацию»'] = labelIdx >= 0
  const perComb = radios.find((r) => /per[-_]?comb|combination|comb/i.test(r))
  checks['test-fresh: radio «На одну комбинацию» отмечен (SSR)'] =
    checked.length > 0 &&
    (perComb ? /\bchecked\b/i.test(perComb) : false) &&
    !checked.some((r) => /total|whole|all|system/i.test(r) && r !== perComb)

  const stale = await get(PAGE('test-stale'))
  checks['test-stale: 404'] = stale.status === 404
  const norules = await get(PAGE('test-norules'))
  checks['test-norules: 404'] = norules.status === 404

  const sm = await get('/sitemap.xml')
  checks['sitemap: есть test-fresh'] = sm.html.includes(PAGE('test-fresh'))
  checks['sitemap: нет test-stale'] = !sm.html.includes('test-stale')
  checks['sitemap: нет test-norules'] = !sm.html.includes('test-norules')
} finally {
  server.kill()
}

for (const script of ['check:links', 'check:seo']) {
  const r = spawnSync('npm', ['run', script], { cwd: tmp, encoding: 'utf8' })
  checks[`копия: npm run ${script}`] = r.status === 0
  if (r.status !== 0)
    console.error(`${script}:\n${r.stdout.slice(-1500)}\n${r.stderr.slice(-1500)}`)
}

cleanup()
report(checks)
console.log(process.exitCode ? 'ИТОГ: FAIL' : 'ИТОГ: ok')

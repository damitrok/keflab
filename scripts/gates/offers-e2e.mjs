// Гейт шага 13: e2e модуля офферов на КОПИИ проекта с вымышленными данными
// (tests/fixtures/offers-site). В реальных данных media.registered=false и офферов нет.
// Даты офферов в фикстуре записаны как TODAY, TODAY-1, TODAY+30 и подставляются
// при запуске относительно «сегодня по Москве».
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { report } from './lib-server.mjs'
import { todayMoscow } from '../../shared/bookmakers.ts'

const root = process.cwd()
const scratch =
  '/private/tmp/claude-501/-Users-dmitriymitrokhin-Desktop-my-project-betting/4dcad454-fa12-49cf-9733-656be81dfdfa/scratchpad'
const copy = `${scratch}/offers-e2e`
const statsDir = `${scratch}/offers-e2e-stats`
const invalidDir = `${scratch}/offers-e2e-invalid`
const fixtures = `${root}/tests/fixtures/offers-site`
const checks = {}

function cleanup() {
  rmSync(copy, { recursive: true, force: true })
  rmSync(invalidDir, { recursive: true, force: true })
  rmSync(statsDir, { recursive: true, force: true })
}

function shiftDate(iso, days) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

const today = todayMoscow()
const resolveDate = (value) => {
  const m = /^TODAY([+-]\d+)?$/.exec(value)
  return m ? shiftDate(today, Number(m[1] ?? 0)) : value
}

function done(code) {
  cleanup()
  console.log(process.exitCode || code ? 'ИТОГ: FAIL' : 'ИТОГ: ok')
  process.exit(process.exitCode || code ? 1 : 0)
}

cleanup()
mkdirSync(statsDir, { recursive: true })
mkdirSync(copy, { recursive: true })

// 1. Копия проекта с подменёнными data/ и симлинком node_modules.
const rsync = spawnSync(
  'rsync',
  [
    '-a',
    '--exclude=node_modules',
    '--exclude=.output',
    '--exclude=.nuxt',
    '--exclude=.data',
    '--exclude=test-results',
    '--exclude=.git',
    `${root}/`,
    `${copy}/`,
  ],
  { stdio: 'inherit' },
)
if (rsync.status !== 0) {
  console.error('FAIL rsync не отработал')
  done(1)
}
symlinkSync(`${root}/node_modules`, `${copy}/node_modules`)

const offers = JSON.parse(readFileSync(`${fixtures}/data/offers.json`, 'utf8')).map((o) => ({
  ...o,
  validFrom: resolveDate(o.validFrom),
  validTo: resolveDate(o.validTo),
}))
writeFileSync(`${copy}/data/offers.json`, `${JSON.stringify(offers, null, 2)}\n`)
const bk = JSON.parse(readFileSync(`${fixtures}/data/bookmakers.json`, 'utf8')).map((b) => ({
  ...b,
  checkedAt: resolveDate(b.checkedAt),
}))
writeFileSync(`${copy}/data/bookmakers.json`, `${JSON.stringify(bk, null, 2)}\n`)
for (const f of ['site.json', 'allowlist.json'])
  cpSync(`${fixtures}/data/${f}`, `${copy}/data/${f}`)

// 2. Оффер без erid не проходит схему (check:data на фикстуре).
mkdirSync(invalidDir, { recursive: true })
for (const f of ['bookmakers.json', 'site.json', 'allowlist.json'])
  cpSync(`${copy}/data/${f}`, `${invalidDir}/${f}`)
cpSync(`${fixtures}/invalid/offers.json`, `${invalidDir}/offers.json`)
const bad = spawnSync('node', ['scripts/check-data.ts', '--dir', invalidDir], {
  cwd: root,
  encoding: 'utf8',
})
checks['check:data: оффер без erid отвергается (код ≠ 0, в выводе erid)'] =
  bad.status !== 0 && `${bad.stdout}${bad.stderr}`.includes('erid')
const good = spawnSync('node', ['scripts/check-data.ts', '--dir', `${copy}/data`], {
  cwd: root,
  encoding: 'utf8',
})
checks['check:data: данные копии (фикстура с датами) проходят'] = good.status === 0
if (good.status !== 0) console.error(good.stdout, good.stderr)

// 3. Сборка копии: registered=true и riskWarning заполнены -> должна пройти.
const build = spawnSync('npm', ['run', 'build'], {
  cwd: copy,
  // KEFLAB_STATS_DIR при сборке не задаём: он читается при запуске сервера
  env: { ...process.env, OFFERS_ENABLED: 'true' },
  encoding: 'utf8',
})
checks['сборка копии с OFFERS_ENABLED=true и registered=true проходит'] =
  build.status === 0 && existsSync(`${copy}/.output/server/index.mjs`)
if (build.status !== 0) console.error(build.stdout.slice(-3000), build.stderr.slice(-3000))
if (!checks['сборка копии с OFFERS_ENABLED=true и registered=true проходит']) {
  report(checks)
  done(1)
}

// 4. Playwright из проекта, сервер — из копии.
const pw = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.offers.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, OFFERS_COPY_DIR: copy, OFFERS_STATS_DIR: statsDir, OFFERS_TODAY: today },
})
checks[`playwright (offers) завершился с кодом 0 (код ${pw.status})`] = pw.status === 0
report(checks)
done(pw.status ?? 1)

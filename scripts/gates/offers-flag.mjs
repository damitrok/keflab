// Гейт шага 7: OFFERS_ENABLED=true при media.registered=false.
import { spawnSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { report } from './lib-server.mjs'

const root = process.cwd()
const tmp =
  '/private/tmp/claude-501/-Users-dmitriymitrokhin-Desktop-my-project-betting/4dcad454-fa12-49cf-9733-656be81dfdfa/scratchpad/offers-build'
const checks = {}

// a) сборка во временной копии
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
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
const build = spawnSync('npx', ['nuxt', 'build'], {
  cwd: tmp,
  env: { ...process.env, OFFERS_ENABLED: 'true' },
  encoding: 'utf8',
})
const out = `${build.stdout}\n${build.stderr}`
checks['сборка с OFFERS_ENABLED=true падает (код ≠ 0)'] = build.status !== 0
checks['вывод содержит «Сборка остановлена» и «media.registered»'] =
  out.includes('Сборка остановлена') && out.includes('media.registered')
rmSync(tmp, { recursive: true, force: true })

// б, в) запуск текущей сборки
async function run(flag, port) {
  if (!existsSync(`${root}/.output/server/index.mjs`))
    throw new Error('нет .output — выполните npm run build')
  let stderr = ''
  const server = spawn('node', ['.output/server/index.mjs'], {
    cwd: root,
    env: { ...process.env, OFFERS_ENABLED: flag, PORT: String(port), NITRO_PORT: String(port) },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  server.stderr.on('data', (d) => (stderr += d))
  try {
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://localhost:${port}/api/geo`)
        const body = await res.json()
        return { body, headers: res.headers, stderr }
      } catch {
        await new Promise((r) => setTimeout(r, 200))
      }
    }
    throw new Error('сервер не ответил')
  } finally {
    server.kill()
  }
}

const on = await run('true', 3197)
checks['сервер с OFFERS_ENABLED=true: offersEnabled=false'] = on.body.offersEnabled === false
checks['сервер с OFFERS_ENABLED=true: ошибка про media.registered в stderr'] =
  on.stderr.includes('media.registered')
checks['/api/geo: no-store и noindex'] =
  on.headers.get('cache-control') === 'no-store' && on.headers.get('x-robots-tag') === 'noindex'
const off = await run('false', 3198)
checks['сервер с OFFERS_ENABLED=false: offersEnabled=false'] = off.body.offersEnabled === false
checks['сервер с OFFERS_ENABLED=false: без ошибки'] = !off.stderr.includes('media.registered')

report(checks)
console.log(process.exitCode ? 'ИТОГ: FAIL' : 'ИТОГ: ok')

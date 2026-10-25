// Гейт шага 4: SSR-ответы главной с параметрами расчёта и без них.
import { spawn } from 'node:child_process'

const PORT = 3151
const server = spawn('node', ['.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
  stdio: 'ignore',
})

async function get(path) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}${path}`)
      return { status: res.status, html: (await res.text()).replace(/\u00A0/g, ' ') }
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error('сервер не ответил')
}

const noindex = (html) => /<meta[^>]+name="robots"[^>]+noindex/.test(html)
const canonical = (html) => /<link[^>]+rel="canonical"[^>]+href="https:\/\/keflab\.ru\/"/.test(html)

try {
  const plain = await get('/')
  const shared = await get('/?s=3000&k=2&e=1.80w,2.10w,1.65l')
  const broken = await get('/?e=abc')
  const utm = await get('/?utm_source=x')
  const checks = {
    'без параметров: canonical есть, noindex нет': canonical(plain.html) && !noindex(plain.html),
    'с параметрами: noindex и canonical без параметров':
      noindex(shared.html) && canonical(shared.html),
    'с параметрами: расчёт уже в SSR (3 780,00 ₽ в блоке результата)':
      /data-testid="calc-result"[\s\S]*data-testid="payout"[\s\S]*?3 780,00 ₽/.test(shared.html),
    '?e=abc: 200 и мягкое сообщение':
      broken.status === 200 && broken.html.includes('data-testid="share-notice"'),
    '?utm_source: без noindex': !noindex(utm.html),
  }
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'ok ' : 'FAIL'} ${name}`)
  if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1
} finally {
  server.kill()
}

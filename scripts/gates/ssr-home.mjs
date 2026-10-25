// Гейт шага 3: главная отдаёт готовый HTML с H1, примером расчёта и сообщением
// про JavaScript. Запускает собранный сервер, читает HTML без браузера.
import { spawn } from 'node:child_process'

const PORT = 3150
const server = spawn('node', ['.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
  stdio: 'ignore',
})

async function fetchHome() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`)
      return { status: res.status, html: await res.text() }
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error('сервер не ответил')
}

try {
  const { status, html } = await fetchHome()
  const text = html.replace(/\u00A0/g, ' ')
  const checks = {
    'ответ 200': status === 200,
    'ровно один H1': (html.match(/<h1[\s>]/g) ?? []).length === 1,
    'пример расчёта 3 780,00 ₽':
      text.includes('data-testid="static-example"') && text.includes('3 780,00 ₽'),
    'сообщение про JavaScript в noscript':
      /<noscript[^>]*>[\s\S]*Калькулятору нужен JavaScript/.test(text),
  }
  const failed = Object.entries(checks).filter(([, ok]) => !ok)
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'ok ' : 'FAIL'} ${name}`)
  if (failed.length > 0) process.exitCode = 1
} finally {
  server.kill()
}

// Общий запуск собранного сервера для скриптов-гейтов.
import { spawn } from 'node:child_process'

export async function withServer(port, fn) {
  const server = spawn('node', ['.output/server/index.mjs'], {
    env: { ...process.env, PORT: String(port), NITRO_PORT: String(port) },
    stdio: 'ignore',
  })
  const get = async (path) => {
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://localhost:${port}${path}`)
        return { status: res.status, html: (await res.text()).replace(/\u00A0/g, ' ') }
      } catch {
        await new Promise((r) => setTimeout(r, 200))
      }
    }
    throw new Error('сервер не ответил')
  }
  try {
    return await fn(get)
  } finally {
    server.kill()
  }
}

/** Видимый текст HTML без скриптов, стилей и тегов. */
export function visibleText(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

export function report(checks) {
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'ok ' : 'FAIL'} ${name}`)
  if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1
}

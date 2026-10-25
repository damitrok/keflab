// Гейт: нагрузка 100 rps на / и 20 rps на /api/geo без ошибок (локально, 15 с).
import { spawn } from 'node:child_process'
import { withServer } from './lib-server.mjs'

const PORT = 3310

const code = await withServer(PORT, async (get) => {
  await get('/')
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [
        'scripts/ops/load-test.mjs',
        '--url',
        `http://localhost:${PORT}`,
        '--duration',
        '15',
        '--rps-home',
        '100',
        '--rps-geo',
        '20',
      ],
      { stdio: 'inherit' },
    )
    child.on('exit', (c) => resolve(c ?? 1))
  })
})

if (code === 0) console.log('load: ок')
else {
  console.log('load: FAIL')
  process.exitCode = 1
}

import { defineConfig, devices } from '@playwright/test'

// e2e модуля офферов (шаг 13). Запускается скриптом scripts/gates/offers-e2e.mjs:
// сервер берётся из копии проекта с тестовыми данными (OFFERS_COPY_DIR).
const copy = process.env.OFFERS_COPY_DIR
const stats = process.env.OFFERS_STATS_DIR
if (!copy || !stats) {
  throw new Error(
    'Нужны OFFERS_COPY_DIR и OFFERS_STATS_DIR: запускайте scripts/gates/offers-e2e.mjs',
  )
}

const ON_PORT = 3470
const OFF_PORT = 3471

const serverEnv = (port: number, enabled: boolean): Record<string, string> => ({
  PORT: String(port),
  NITRO_PORT: String(port),
  OFFERS_ENABLED: String(enabled),
  GEO_HEADER_TRUSTED: 'true',
  KEFLAB_STATS_DIR: stats,
})

export default defineConfig({
  testDir: 'tests/e2e-offers',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${ON_PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: `node ${copy}/.output/server/index.mjs`,
      url: `http://localhost:${ON_PORT}/`,
      env: serverEnv(ON_PORT, true),
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `node ${copy}/.output/server/index.mjs`,
      url: `http://localhost:${OFF_PORT}/`,
      env: serverEnv(OFF_PORT, false),
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})

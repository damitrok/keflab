import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['app/lib/calc/**'],
      reporter: ['text-summary', 'text'],
      // ТЗ, шаг 2: покрытие lib/calc — не меньше 95% строк.
      thresholds: { lines: 95 },
    },
  },
})

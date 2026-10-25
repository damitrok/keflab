import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: [
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      // Фикстуры — заведомо битые мини-проекты для проверочных скриптов.
      'tests/fixtures/**',
    ],
  },
  prettier,
)

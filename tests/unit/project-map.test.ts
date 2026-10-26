import { describe, expect, it } from 'vitest'
import {
  buildGraph,
  componentName,
  dependentsClosure,
  describe as describeModule,
  routeOf,
} from '../../scripts/project-map.mjs'

describe('карта проекта: имена и адреса', () => {
  it('имена компонентов по правилам Nuxt', () => {
    expect(componentName('app/components/legal/AgeMark.vue')).toBe('LegalAgeMark')
    expect(componentName('app/components/calc/CalcForm.vue')).toBe('CalcForm')
    expect(componentName('app/components/calc/form/EventRow.vue')).toBe('CalcFormEventRow')
    expect(componentName('app/components/Breadcrumbs.vue')).toBe('Breadcrumbs')
    expect(componentName('app/components/small-calc/SmallCalcLayout.vue')).toBe('SmallCalcLayout')
  })

  it('адреса страниц', () => {
    expect(routeOf('app/pages/index.vue')).toBe('/')
    expect(routeOf('app/pages/kalkulyatory/index.vue')).toBe('/kalkulyatory/')
    expect(routeOf('app/pages/sistema-[k]-iz-[n].vue')).toBe('/sistema-:k-iz-:n/')
    expect(routeOf('app/pages/bk/[slug]/kak-schitaetsya-sistema.vue')).toBe(
      '/bk/:slug/kak-schitaetsya-sistema/',
    )
    expect(routeOf('app/components/X.vue')).toBeNull()
  })

  it('описание — только комментарий в самом начале файла', () => {
    expect(describeModule('a.ts', '// Первое. Второе.\nimport x from "y"')).toBe('Первое.')
    expect(describeModule('a.ts', '/**\n * Блок описания.\n */\nexport const a = 1')).toBe(
      'Блок описания.',
    )
    expect(describeModule('a.ts', 'import x from "y"\n// не заголовок\n')).toBe('')
    expect(
      describeModule('a.vue', '<script setup lang="ts">\n// Компонент.\nconst a = 1\n</script>'),
    ).toBe('Компонент.')
  })
})

describe('карта проекта: граф', () => {
  const files = {
    'app/pages/index.vue':
      '<script setup lang="ts">\nimport X from "~/lib/x"\nconst c = useCalc()\n</script>\n<template><LegalAgeMark /><LazyCalcBox hydrate-on-visible /></template>',
    'app/components/legal/AgeMark.vue': '<template><span>18+</span></template>',
    'app/components/calc/CalcBox.vue':
      '<script setup lang="ts">\nimport { f } from "../../lib/x"\n</script>',
    'app/composables/useCalc.ts': 'import { g } from "#shared/s"\nexport function useCalc() {}',
    'app/lib/x.ts': 'export const f = 1',
    'shared/s.ts': 'import site from "../data/site.json" with { type: "json" }\nexport const g = 1',
    'data/site.json': '{}',
  } as Record<string, string>
  const graph = buildGraph(Object.keys(files), (f: string) => files[f]!, {})
  const has = (a: string, b: string) => graph.edges.some((e) => e.from === a && e.to === b)

  it('явные импорты, алиасы ~ и #shared, JSON из data', () => {
    expect(has('app/pages/index.vue', 'app/lib/x.ts')).toBe(true)
    expect(has('app/composables/useCalc.ts', 'shared/s.ts')).toBe(true)
    expect(has('shared/s.ts', 'data/site.json')).toBe(true)
    expect(has('app/components/calc/CalcBox.vue', 'app/lib/x.ts')).toBe(true)
  })

  it('автоимпорт компонентов (в т. ч. Lazy) и composables', () => {
    expect(has('app/pages/index.vue', 'app/components/legal/AgeMark.vue')).toBe(true)
    expect(has('app/pages/index.vue', 'app/components/calc/CalcBox.vue')).toBe(true)
    expect(has('app/pages/index.vue', 'app/composables/useCalc.ts')).toBe(true)
  })

  it('влияние изменения — транзитивно до страницы', () => {
    expect(dependentsClosure(graph, 'data/site.json')).toEqual([
      'app/composables/useCalc.ts',
      'app/pages/index.vue',
      'shared/s.ts',
    ])
    expect(dependentsClosure(graph, 'app/lib/x.ts')).toEqual([
      'app/components/calc/CalcBox.vue',
      'app/pages/index.vue',
    ])
  })
})

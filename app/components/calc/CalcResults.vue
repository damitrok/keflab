<script setup lang="ts">
import type { SystemCalc } from '~/composables/useSystemCalc'
import type { SystemResult } from '~/lib/calc'
import {
  CALC_ERROR_TEXTS,
  CALC_FAILED_TEXT,
  NOT_SETTLED_TEXT,
  ROWS_DIFFER_TEXT,
  UNEVEN_SPLIT_TEXT,
} from '~/lib/texts'
import { formatMoney } from '~/lib/format'
import CombinationsTable from './results/CombinationsTable.vue'
import CompareTable from './results/CompareTable.vue'
import MoneyValue from './results/MoneyValue.vue'
import ScenariosTable from './results/ScenariosTable.vue'

const props = defineProps<{ calc: SystemCalc }>()

// Поля calc — ref'ы; unref работает и если страница передала reactive(calc).
const result = computed(() => unref(props.calc.result))
const okResult = computed(() => {
  const r = result.value
  return r && r.ok ? (r as Extract<SystemResult, { ok: true }>) : null
})
const scenarios = computed(() => unref(props.calc.scenarios))
const compare = computed(() => unref(props.calc.compare))
const calcFailed = computed(() => unref(props.calc.calcFailed))
const eventsCount = computed(() => unref(props.calc.events).length)

const settled = computed(() => {
  const s = okResult.value?.settlement
  return s && s.settled ? s : null
})
const profitKind = computed(() => {
  const s = settled.value
  if (!s) return null
  return s.profit.gt('0') ? 'plus' : s.profit.lt('0') ? 'minus' : 'zero'
})
const zeroProfitText = computed(() => (settled.value ? formatMoney(settled.value.profit).text : ''))

const uid = useId()
const headingId = `${uid}-h`
const tabs = [
  { key: 'combinations', label: 'Комбинации' },
  { key: 'scenarios', label: 'Сценарии' },
  { key: 'compare', label: 'Сравнить' },
] as const
type TabKey = (typeof tabs)[number]['key']
const active = ref<TabKey>('combinations')
const tabEls = ref<HTMLButtonElement[]>([])
const tabId = (k: TabKey) => `${uid}-tab-${k}`
const panelId = (k: TabKey) => `${uid}-panel-${k}`

function select(i: number) {
  const tab = tabs[i]
  if (!tab) return
  active.value = tab.key
  nextTick(() => tabEls.value[i]?.focus())
}

function onKeydown(e: KeyboardEvent, i: number) {
  const last = tabs.length - 1
  const target =
    e.key === 'ArrowRight'
      ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft'
        ? (i - 1 + tabs.length) % tabs.length
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? last
            : null
  if (target === null) return
  e.preventDefault()
  select(target)
}
</script>

<template>
  <section data-testid="calc-result" class="result" :aria-labelledby="headingId">
    <h2 :id="headingId">Результат</h2>

    <div data-testid="calc-summary" class="summary" aria-live="polite" aria-atomic="true">
      <p v-if="calcFailed" class="summary__line">{{ CALC_FAILED_TEXT }}</p>
      <p v-else-if="!result" class="summary__line">
        Заполните ставку и коэффициенты, чтобы увидеть расчёт.
      </p>
      <p v-else-if="!result.ok" class="summary__line">{{ CALC_ERROR_TEXTS[result.error] }}</p>
      <template v-else-if="okResult">
        <template v-if="settled">
          <p class="summary__main">
            Возврат
            <span data-testid="payout" class="summary__value"
              ><MoneyValue :value="settled.payout"
            /></span>
          </p>
          <p data-testid="profit" class="summary__profit" :class="`summary__profit--${profitKind}`">
            <template v-if="profitKind === 'plus'"
              >Прибыль +<MoneyValue :value="settled.profit"
            /></template>
            <template v-else-if="profitKind === 'minus'"
              >Убыток <MoneyValue :value="settled.profit"
            /></template>
            <template v-else>Без прибыли и убытка: {{ zeroProfitText }}</template>
          </p>
        </template>
        <template v-else>
          <p class="summary__main" data-testid="not-settled">{{ NOT_SETTLED_TEXT }}</p>
          <p class="summary__line">Диапазон возврата — во вкладке «Сценарии»</p>
        </template>
        <p class="summary__line" data-testid="total-stake">
          <template v-if="okResult.shape.mode === 'per_combination'">
            Ставка {{ okResult.shape.combinations }} ×
            <MoneyValue :value="okResult.shape.stakePerCombination" /> =
            <MoneyValue :value="okResult.shape.totalStake" />
          </template>
          <template v-else>Ставка <MoneyValue :value="okResult.shape.totalStake" /></template>
        </p>
        <p v-if="okResult.shape.unevenSplit" class="summary__warn" data-testid="uneven-split">
          {{ UNEVEN_SPLIT_TEXT }}
        </p>
        <p v-if="okResult.rowsDifferFromTotal" class="summary__warn" data-testid="rows-differ">
          {{ ROWS_DIFFER_TEXT }}
        </p>
      </template>
    </div>

    <template v-if="okResult">
      <div role="tablist" aria-label="Подробности расчёта" class="tabs">
        <button
          v-for="(tab, i) in tabs"
          :id="tabId(tab.key)"
          :key="tab.key"
          :ref="(el) => (tabEls[i] = el as HTMLButtonElement)"
          type="button"
          role="tab"
          class="tabs__tab"
          :aria-selected="active === tab.key"
          :aria-controls="panelId(tab.key)"
          :tabindex="active === tab.key ? 0 : -1"
          @click="active = tab.key"
          @keydown="onKeydown($event, i)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        :id="panelId('combinations')"
        role="tabpanel"
        :aria-labelledby="tabId('combinations')"
        :hidden="active !== 'combinations'"
        class="panel"
      >
        <CombinationsTable :rows="okResult.rows" />
      </div>
      <div
        :id="panelId('scenarios')"
        role="tabpanel"
        :aria-labelledby="tabId('scenarios')"
        :hidden="active !== 'scenarios'"
        class="panel"
      >
        <ScenariosTable v-if="scenarios" :scenarios="scenarios" />
      </div>
      <div
        :id="panelId('compare')"
        role="tabpanel"
        :aria-labelledby="tabId('compare')"
        :hidden="active !== 'compare'"
        class="panel"
      >
        <CompareTable v-if="compare" :compare="compare" :k="okResult.shape.k" :n="eventsCount" />
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.result {
  min-width: 0;
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
  background: var(--color-carbon-lift);
}

.summary p {
  margin: 0 0 var(--spacing-8);
}

.summary__main {
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.summary__line {
  color: var(--color-pale-stone);
}

.summary__profit {
  font-size: 18px;

  &--plus {
    color: var(--color-metric-green);
  }

  &--minus {
    color: var(--color-signal-orange);
  }

  &--zero {
    color: var(--color-bone);
  }
}

.summary__warn {
  padding: var(--spacing-8) 12px;
  border-left: 2px solid var(--color-signal-orange);
  color: var(--color-bone);
  font-size: var(--text-body-sm);
}

.tabs {
  // Три вкладки делят ширину поровну — на 375 px ни одна не обрезается.
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin: var(--spacing-16) 0;
  border-bottom: 1px solid var(--color-ash-stroke);
}

.tabs__tab {
  min-width: 0;
  min-height: 44px;
  padding: 10px 4px;
  text-align: center;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-pale-stone);
  font: inherit;
  font-size: var(--text-body-sm);
  white-space: nowrap;
  cursor: pointer;

  @media (min-width: 480px) {
    font-size: var(--text-body);
  }

  &[aria-selected='true'] {
    border-bottom-color: var(--color-bone);
    color: var(--color-bone);
  }
}

.panel {
  min-width: 0;
}

.panel[hidden] {
  display: none;
}
</style>

<script setup lang="ts">
import Breadcrumbs from '~/components/Breadcrumbs.vue'
import RuleBlock from '~/components/bookmaker/RuleBlock.vue'
import SystemCalculator from '~/components/calc/SystemCalculator.vue'
import { bookmakerPagePath, isBookmakerPublishable, todayMoscow } from '#shared/bookmakers'
import type { Bookmaker } from '../../../../data/schema'
import bookmakersData from '../../../../data/bookmakers.json'
import {
  bookmakerDescription,
  bookmakerTitle,
  formatRuDate,
  sourceText,
  stakeSplitText,
} from '~/lib/bookmaker-page'
import { formatMoney } from '~/lib/format'
import { D } from '~/lib/calc'
import { NO_JS_TEXT } from '~/lib/texts'

definePageMeta({ key: (route) => route.path })

const route = useRoute()
const slug = String(route.params.slug)
const bookmaker = (bookmakersData as Bookmaker[]).find(
  (b) => b.slug === slug && isBookmakerPublishable(b, todayMoscow()),
)
if (!bookmaker || !bookmaker.systemRules || !bookmaker.checkedAt) {
  throw createError({ statusCode: 404, fatal: true })
}

const rules = bookmaker.systemRules
const checkedAt = formatRuDate(bookmaker.checkedAt)
const source = sourceText(bookmaker.sourceUrl)
const minStake = formatMoney(D(rules.minStakePerCombination)).text
const calcRules = {
  bookmakerName: bookmaker.name,
  stakeMode: rules.stakeSplit,
  maxEvents: rules.maxEvents,
  minStakePerCombination: rules.minStakePerCombination,
}

const breadcrumbs = [
  { label: 'Главная', to: '/' },
  { label: `Как ${bookmaker.name} считает систему` },
]

usePageSeo({
  path: bookmakerPagePath(bookmaker.slug),
  title: bookmakerTitle(bookmaker.name),
  description: bookmakerDescription(bookmaker.name, checkedAt),
  type: 'article',
  breadcrumbs,
  webApp: {
    name: `Калькулятор системы с правилами: ${bookmaker.name}`,
    description: `Возврат и прибыль по системе ставок с учётом правил ${bookmaker.name}: деление ставки, минимальная ставка на комбинацию, максимум событий.`,
  },
})
</script>

<template>
  <div class="bk-page">
    <Breadcrumbs :items="breadcrumbs" />

    <div class="prose">
      <h1>Как {{ bookmaker.name }} считает систему ставок</h1>
      <p>
        Правила расчёта системы у {{ bookmaker.name }} и калькулятор, который их учитывает. Это
        справка: сверяйтесь с правилами на сайте букмекера.
      </p>
    </div>

    <noscript class="notice">{{ NO_JS_TEXT }}</noscript>

    <SystemCalculator :share="false" :storage-key="null" :rules="calcRules" />

    <div class="bk-page__rules">
      <RuleBlock id="split-h" title="Как делится ставка">
        <p>{{ stakeSplitText(rules.stakeSplit) }}</p>
        <p v-if="rules.stakeSplitNote">{{ rules.stakeSplitNote }}</p>
      </RuleBlock>
      <RuleBlock id="min-h" title="Минимальная ставка на комбинацию">
        <p data-testid="bk-min-stake">{{ minStake }}</p>
      </RuleBlock>
      <RuleBlock id="void-h" title="Как считаются возвраты">
        <p>{{ rules.voidRule }}</p>
      </RuleBlock>
      <RuleBlock id="half-h" title="Как считаются половины">
        <p>{{ rules.halfRule }}</p>
      </RuleBlock>
      <RuleBlock id="max-h" title="Максимум событий в системе">
        <p data-testid="bk-max-events">{{ rules.maxEvents }}</p>
      </RuleBlock>
      <RuleBlock id="about-h" title="О букмекере">
        <p>Юридическое лицо: {{ bookmaker.legalEntity }}</p>
        <p>Лицензия: {{ bookmaker.licenseInfo }}</p>
      </RuleBlock>
      <RuleBlock id="source-h" title="Источник и дата проверки">
        <p data-testid="bk-checked">Правила проверены {{ checkedAt }}</p>
        <p data-testid="bk-source">Источник правил: {{ source }}</p>
        <p>Правила могут измениться — сверяйтесь с сайтом букмекера.</p>
      </RuleBlock>
    </div>

    <p class="bk-page__links">
      Другая система? Откройте <NuxtLink to="/">Калькулятор системы</NuxtLink>. Новичкам:
      <NuxtLink to="/chto-takoe-sistema-v-stavkah/">Что такое система в ставках</NuxtLink>.
    </p>
  </div>
</template>

<style scoped lang="scss">
.bk-page {
  display: grid;
  gap: var(--spacing-40);
  min-width: 0;
}

.bk-page__rules {
  display: grid;
  gap: var(--spacing-24);
  max-width: 68ch;
}

.bk-page__links {
  margin: 0;
}
</style>

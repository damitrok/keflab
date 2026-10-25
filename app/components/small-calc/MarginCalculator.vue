<script setup lang="ts">
import { bookMargin, parseOdds, type Decimal } from '~/lib/calc'
import { formatOdds2, formatPercent, formatShareAsPercent } from '~/lib/small-calc-math'
import { oddsFieldError } from '~/lib/small-calc-texts'
import SmallField from './SmallField.vue'
import SmallResult from './SmallResult.vue'

const outcomes = ref<2 | 3>(2)
const odds = ref<string[]>(['', '', ''])

const active = computed(() => odds.value.slice(0, outcomes.value))
const parsed = computed(() => active.value.map((v) => parseOdds(v)))
const errors = computed(() => parsed.value.map((r, i) => oddsFieldError(active.value[i] ?? '', r)))

const result = computed(() => {
  const values: Decimal[] = []
  for (const r of parsed.value) {
    if (!r.ok) return null
    values.push(r.value)
  }
  const r = bookMargin(values)
  return r.ok ? { ...r.value, odds: values } : null
})

function setOdds(index: number, value: string) {
  odds.value[index] = value
}

function setOutcomes(n: 2 | 3) {
  outcomes.value = n
}
</script>

<template>
  <div class="small-calc">
    <form class="small-calc__form" novalidate @submit.prevent>
      <fieldset class="small-calc__group">
        <legend>Число исходов</legend>
        <label class="small-calc__radio">
          <input
            type="radio"
            name="outcomes"
            value="2"
            :checked="outcomes === 2"
            @change="setOutcomes(2)"
          />
          2 исхода
        </label>
        <label class="small-calc__radio">
          <input
            type="radio"
            name="outcomes"
            value="3"
            :checked="outcomes === 3"
            @change="setOutcomes(3)"
          />
          3 исхода
        </label>
      </fieldset>

      <SmallField
        v-for="n in outcomes"
        :id="`margin-odds-${n}`"
        :key="n"
        :model-value="odds[n - 1] ?? ''"
        :label="`Коэффициент исхода ${n}`"
        placeholder="Например, 1,90"
        :error="errors[n - 1]"
        @update:model-value="setOdds(n - 1, $event)"
      />
    </form>

    <SmallResult id="margin">
      <template #live>
        <p v-if="!result" class="result__line">Введите коэффициенты на все исходы.</p>
        <template v-else>
          <p class="result__main">
            Маржа
            <span data-testid="margin-percent" class="result__value">{{
              formatPercent(result.marginPercent)
            }}</span>
          </p>
          <p class="result__line">
            Вероятности и коэффициенты ниже посчитаны без маржи, пропорциональным делением.
          </p>
        </template>
      </template>

      <table v-if="result" class="rt" data-testid="margin-table">
        <caption>
          Исходы без маржи
        </caption>
        <thead>
          <tr>
            <th scope="col">Исход</th>
            <th scope="col" class="num">Коэффициент</th>
            <th scope="col" class="num">Вероятность без маржи</th>
            <th scope="col" class="num">Честный коэффициент</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in result.fairProbabilities" :key="i">
            <th scope="row" data-label="Исход">№ {{ i + 1 }}</th>
            <td class="num" data-label="Коэффициент">{{ formatOdds2(result.odds[i]!) }}</td>
            <td class="num" data-label="Вероятность без маржи" data-testid="fair-probability">
              {{ formatShareAsPercent(p, 2) }}
            </td>
            <td class="num" data-label="Честный коэффициент" data-testid="fair-odds">
              {{ formatOdds2(result.fairOdds[i]!) }}
            </td>
          </tr>
        </tbody>
      </table>
    </SmallResult>
  </div>
</template>

<style scoped lang="scss">
@use '../calc/results/table';

@include table.result-table;

.small-calc {
  display: grid;
  gap: var(--spacing-32);

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.small-calc__form {
  display: grid;
  gap: var(--spacing-16);
  min-width: 0;
}

.small-calc__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-8) var(--spacing-24);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;

  legend {
    padding: 0;
    margin-bottom: var(--spacing-8);
    font-size: var(--text-body-sm);
    color: var(--color-pale-stone);
  }
}

.small-calc__radio {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-8);
  min-height: 44px;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
  }
}
</style>

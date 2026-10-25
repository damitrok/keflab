<script setup lang="ts">
import CalcStaticExample from '~/components/calc/CalcStaticExample.vue'
import SystemCalculator from '~/components/calc/SystemCalculator.vue'
import { NO_JS_TEXT } from '~/lib/texts'

useSeoMeta({
  title: 'Калькулятор системы ставок',
  description:
    'Калькулятор системы ставок: возврат и прибыль, разбивка по комбинациям, сценарии «если зайдут m из N» и сравнение с экспрессом и одиночными.',
})
</script>

<template>
  <div class="home">
    <div class="prose">
      <h1>Калькулятор системы ставок</h1>
      <p>
        Система — это набор экспрессов из одних и тех же событий. Система 2 из 3 — все экспрессы по
        два события из трёх, то есть три комбинации. Ставка делится между комбинациями поровну, а
        выплата складывается из комбинаций, где сыграли все события.
      </p>
      <p>
        Введите ставку и коэффициенты, отметьте исходы — итог пересчитается сразу. Если матчи ещё не
        сыграны, вкладка «Сценарии» покажет, сколько вернётся при разном числе зашедших событий. Это
        только арифметика: калькулятор не знает, чем закончатся события.
      </p>
    </div>

    <noscript>
      <p class="notice">{{ NO_JS_TEXT }}</p>
    </noscript>

    <SystemCalculator />

    <CalcStaticExample />
  </div>
</template>

<style scoped lang="scss">
.home {
  display: grid;
  gap: var(--spacing-40);
}
</style>

<script setup lang="ts">
import AgeMark from '../legal/AgeMark.vue'
import RiskWarning from '../legal/RiskWarning.vue'
import site from '../../../data/site.json'
import { GOALS, sendGoal } from '../../lib/goals'
import {
  OFFER_AD_LABEL,
  OFFER_ERID_PREFIX,
  OFFER_LINK_HINT,
  OFFER_LINK_TEXT,
  advertiserLine,
} from '../../lib/offers-texts'
import type { PublicOffer } from '#shared/offers-api'

const props = defineProps<{ offer: PublicOffer }>()
const emit = defineEmits<{ visible: [erid: string] }>()

// Без предупреждения о рисках карточка не показывается вовсе.
const hasWarning = computed(() => site.riskWarning.trim() !== '')
const href = computed(() => `/go/${encodeURIComponent(props.offer.id)}`)

const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
        emit('visible', props.offer.erid)
        observer?.disconnect()
      }
    },
    { threshold: [0.5] },
  )
  observer.observe(el.value)
})
onBeforeUnmount(() => observer?.disconnect())

function onClick() {
  sendGoal(GOALS.offerClicked, { erid: props.offer.erid })
}
</script>

<template>
  <li v-if="hasWarning" ref="el" class="offer" data-testid="offer-card">
    <p class="offer__label" data-testid="offer-label">{{ OFFER_AD_LABEL }}</p>
    <h3 class="offer__title">{{ offer.title }}</h3>
    <p v-if="offer.conditionsShort" class="offer__conditions">{{ offer.conditionsShort }}</p>
    <p class="offer__meta" data-testid="offer-advertiser">
      {{ advertiserLine(offer.advertiserName, offer.advertiserInn) }}
    </p>
    <p class="offer__meta" data-testid="offer-erid">{{ OFFER_ERID_PREFIX }}: {{ offer.erid }}</p>
    <div class="offer__legal">
      <AgeMark />
      <RiskWarning />
    </div>
    <a
      class="offer__link"
      :href="href"
      rel="sponsored nofollow noopener"
      target="_blank"
      @click="onClick"
      >{{ OFFER_LINK_TEXT }}<span class="visually-hidden"> ({{ OFFER_LINK_HINT }})</span></a
    >
  </li>
</template>

<style scoped lang="scss">
.offer {
  display: grid;
  gap: var(--spacing-8);
  min-width: 0;
  padding: var(--card-padding);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
  background: var(--color-carbon-lift);
  overflow-wrap: anywhere;

  p,
  h3 {
    margin: 0;
  }
}

.offer__label {
  justify-self: start;
  padding: 2px var(--spacing-8);
  border: 1px solid var(--color-bone);
  border-radius: var(--radius-sm);
  color: var(--color-bone);
  font-size: var(--text-body-sm);
}

.offer__title {
  color: var(--color-bone);
  font-size: 18px;
}

.offer__conditions,
.offer__meta {
  color: var(--color-pale-stone);
  font-size: var(--text-body-sm);
}

.offer__legal {
  display: grid;
  gap: var(--spacing-8);
  justify-items: start;
}

.offer__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--spacing-16);
  border: 1px solid var(--color-bone);
  border-radius: var(--radius-sm);
  color: var(--color-bone);
  text-align: center;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--color-bone);
    outline-offset: 2px;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>

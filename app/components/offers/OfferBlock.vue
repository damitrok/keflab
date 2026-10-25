<script setup lang="ts">
import { GOALS, sendGoal } from '../../lib/goals'
import { createImpressionTracker, sendImpression } from '../../lib/offers-client'
import { OFFER_BLOCK_LABEL } from '../../lib/offers-texts'
import type { OfferPlacement } from '#shared/offers-api'
import { useOffers } from '../../composables/useOffers'
import OfferCard from './OfferCard.vue'

const props = defineProps<{ placement: OfferPlacement }>()

// Блок рисуется только в браузере после ответа /api/geo (ТЗ шаг 13); в виджете
// useOffers ничего не запрашивает, и ниже в шаблоне ничего нет.
const { offers, isEmbed } = useOffers(props.placement)

const track = createImpressionTracker((erid) => {
  sendImpression(erid, {
    sendBeacon:
      typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
        ? (url, data) => navigator.sendBeacon(url, data)
        : undefined,
    fetch: (url, init) => fetch(url, init),
  })
  sendGoal(GOALS.offerShown, { erid })
})
</script>

<template>
  <aside
    v-if="!isEmbed && offers.length > 0"
    class="offers"
    data-testid="offer-block"
    :aria-label="OFFER_BLOCK_LABEL"
  >
    <ul class="offers__list">
      <OfferCard v-for="offer in offers" :key="offer.id" :offer="offer" @visible="track" />
    </ul>
  </aside>
</template>

<style scoped lang="scss">
.offers {
  min-width: 0;
  margin-top: var(--spacing-16);
}

.offers__list {
  display: grid;
  gap: var(--spacing-16);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>

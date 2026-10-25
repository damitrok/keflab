import { inject, provide } from 'vue'

// Fail-closed (правило 9, временное решение): офферы показываются только на
// страницах, которые явно разрешили это через provideOfferSlot().
// Разрешено: /, /kalkulyator-ekspressa/, /sistema-k-iz-n/.
const KEY = 'keflab:offers-allowed'

export function provideOfferSlot(): void {
  provide(KEY, true)
}

export function useOfferSlotAllowed(): boolean {
  return inject<boolean>(KEY, false) === true
}

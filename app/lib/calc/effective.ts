import { HALF, ONE, TWO, ZERO, type Decimal } from './decimal'
import type { EventStatus } from './types'

/**
 * Эффективный коэффициент рассчитанного события:
 * выигрыш — коэффициент; проигрыш — 0; возврат — 1;
 * половина выигрыша — (коэф. + 1) / 2; половина проигрыша — 0,5.
 * Для pending возвращает null: такой исход известен только в сценариях.
 */
export function effectiveOdds(odds: Decimal, status: EventStatus): Decimal | null {
  switch (status) {
    case 'win':
      return odds
    case 'lose':
      return ZERO
    case 'void':
      return ONE
    case 'half_win':
      return odds.plus(ONE).div(TWO)
    case 'half_lose':
      return HALF
    case 'pending':
      return null
  }
}

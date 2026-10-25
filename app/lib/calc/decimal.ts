import Big from 'big.js'

// Отдельный конструктор, чтобы настройки не влияли на чужой код с big.js.
// DP — запас знаков для деления: промежуточные значения не округляются до копеек,
// округляется только итог (toMoney).
export const D = Big()
D.DP = 40
D.RM = Big.roundHalfUp
D.strict = true

export type Decimal = Big

export const ZERO = D('0')
export const ONE = D('1')
export const TWO = D('2')
export const HALF = D('0.5')

/** Итог в рублях: до копеек, «половина вверх». */
export function toMoney(value: Big): Big {
  return value.round(2, Big.roundHalfUp)
}

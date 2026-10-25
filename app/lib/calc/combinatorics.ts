import { D, ONE, ZERO, type Decimal } from './decimal'

/** Число сочетаний C(n, k). Для n ≤ 16 результат точно помещается в number. */
export function binomial(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) return 0
  const r = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= r; i++) {
    result = (result * (n - r + i)) / i
  }
  return result
}

/** Все сочетания индексов 0..n-1 по k в лексикографическом порядке. */
export function combinations(n: number, k: number): number[][] {
  const result: number[][] = []
  if (k < 0 || k > n) return result
  const current: number[] = []
  const walk = (start: number): void => {
    if (current.length === k) {
      result.push([...current])
      return
    }
    for (let i = start; i <= n - (k - current.length); i++) {
      current.push(i)
      walk(i + 1)
      current.pop()
    }
  }
  walk(0)
  return result
}

/**
 * Элементарный симметрический многочлен e_k(x1..xn): сумма произведений всех
 * k-элементных подмножеств. Для системы K из N это сумма коэффициентов всех
 * комбинаций. Считается динамикой за O(n·k) без перебора подмножеств.
 */
export function elementarySymmetric(values: readonly Decimal[], k: number): Decimal {
  if (k < 0 || k > values.length) return ZERO
  const e: Decimal[] = [ONE, ...Array.from({ length: k }, () => ZERO)]
  values.forEach((x, i) => {
    for (let j = Math.min(i + 1, k); j >= 1; j--) {
      e[j] = e[j]!.plus(e[j - 1]!.times(x))
    }
  })
  return e[k]!
}

/** Целое число как Decimal (без number в big.js strict-режиме). */
export function int(n: number): Decimal {
  return D(String(n))
}

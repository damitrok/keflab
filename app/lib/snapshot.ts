import type { EventStatus, StakeMode } from './calc'

/** Ввод калькулятора системы без служебных id — для localStorage и ссылки. */
export interface Snapshot {
  stakeInput: string
  stakeMode: StakeMode
  k: number
  events: { odds: string; status: EventStatus }[]
}

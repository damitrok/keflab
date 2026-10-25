// Цели Яндекс Метрики (ТЗ, шаг 8). Вызов идёт через reachGoal(): без согласия
// на cookie, без счётчика или при блокировке он молча ничего не делает.
// В параметрах цели — только тип калькулятора и т. п., никогда введённые данные.
import { reachGoal } from './metrika'

export const GOALS = {
  /** Первый расчёт за загрузку страницы (после ввода пользователя). */
  calcUsed: 'calc_used',
  /** Открыта вкладка «Сценарии». */
  scenarioOpened: 'scenario_opened',
  /** Открыта вкладка «Сравнить». */
  compareOpened: 'compare_opened',
  /** Ссылка на расчёт скопирована (или показана для ручного копирования). */
  shareCopied: 'share_copied',
  // TODO(шаг 12): вызывается при копировании кода виджета на /vidzhet/.
  widgetCodeCopied: 'widget_code_copied',
  // TODO(шаг 13): вызываются из блока офферов (по умолчанию выключен).
  offerShown: 'offer_shown',
  offerClicked: 'offer_clicked',
} as const

export type GoalName = (typeof GOALS)[keyof typeof GOALS]
export type CalcKind = 'system' | 'express'

export type GoalSender = (name: string, params?: Record<string, unknown>) => void

/** Обёртка над reachGoal: единственное место, откуда уходят цели. */
export function sendGoal(
  name: GoalName,
  params?: Record<string, unknown>,
  send: GoalSender = reachGoal,
): void {
  try {
    send(name, params)
  } catch {
    // Метрика не должна ломать сайт.
  }
}

/**
 * calc_used: цель уходит один раз за загрузку страницы, когда итог впервые
 * рассчитан и при этом пользователь уже что-то вводил (touch). Восстановление
 * из localStorage или ссылки сама по себе touch не вызывает.
 */
export function createCalcUsedReporter(calc: CalcKind, send: GoalSender = reachGoal) {
  let touched = false
  let ready = false
  let sent = false
  function check(): void {
    if (sent || !touched || !ready) return
    sent = true
    sendGoal(GOALS.calcUsed, { calc }, send)
  }
  return {
    /** Пользователь изменил поле или нажал кнопку формы. */
    touch(): void {
      touched = true
      check()
    },
    /** Итог рассчитан (settled) или построены сценарии. */
    setReady(value: boolean): void {
      ready = value
      check()
    },
  }
}

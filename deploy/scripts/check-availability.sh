#!/usr/bin/env bash
# Проверка доступности сайта снаружи: /api/health и главная. Запускать по cron
# с машины вне VPS (лучше из России, с другого провайдера), иначе падение VPS не увидит.
#
# Переменные:
#   KEFLAB_BASE_URL    по умолчанию https://keflab.ru
#   KEFLAB_ALERT_CMD   команда для оповещения; получает текст в $1. Пусто — только stderr и код выхода.
#   KEFLAB_STATE_FILE  файл счётчика сбоев (по умолчанию ~/.keflab-availability.count)
#   KEFLAB_FAIL_LIMIT  сколько подряд сбоев до алерта (по умолчанию 5: при запуске раз в минуту — алерт за ~5 минут)
#
# Пример cron (каждую минуту; алерт после 5 сбоев подряд, то есть примерно за 5 минут):
#   * * * * * KEFLAB_ALERT_CMD='/opt/monitoring/notify.sh' /opt/monitoring/check-availability.sh
set -Eeuo pipefail

base=${KEFLAB_BASE_URL:-https://keflab.ru}
limit=${KEFLAB_FAIL_LIMIT:-5}
state=${KEFLAB_STATE_FILE:-$HOME/.keflab-availability.count}

problems=()
check() {
  local path=$1 code
  code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$base$path" || true)
  if [[ $code != 200 ]]; then
    problems+=("$path -> HTTP $code")
  fi
}
check /api/health
check /

count=0
if [[ -f $state ]]; then
  count=$(cat "$state" 2>/dev/null || echo 0)
fi

if ((${#problems[@]} == 0)); then
  echo 0 >"$state"
  echo "OK: $base доступен"
  exit 0
fi

count=$((count + 1))
echo "$count" >"$state"
message="keflab.ru недоступен ($count подряд): ${problems[*]}"
echo "$message" >&2

if ((count == limit)) && [[ -n ${KEFLAB_ALERT_CMD:-} ]]; then
  $KEFLAB_ALERT_CMD "$message" || echo "оповещение не отправлено" >&2
fi
exit 1

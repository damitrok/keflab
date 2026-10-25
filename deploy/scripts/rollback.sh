#!/usr/bin/env bash
# Откат на предыдущий релиз или на указанный sha. Выполняется на VPS.
#
# Использование:
#   KEFLAB_ENV=production $APP_ROOT/bin/rollback.sh          # предыдущий по порядку выпусков
#   KEFLAB_ENV=production $APP_ROOT/bin/rollback.sh <sha>    # конкретный релиз из releases/
#
# «Предыдущий» — релиз, выпущенный перед текущим (по shared/deploy-order.txt).
# Повторный откат идёт дальше назад по этой же истории.
set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

target=${1:-}
take_lock
cur=$(current_id)
[[ -n $cur ]] || die "current не задан: откат невозможен"

if [[ -z $target ]]; then
  [[ -f $ORDER_FILE ]] || die "нет журнала выпусков $ORDER_FILE: укажите sha явно"
  order=()
  while IFS= read -r line; do
    [[ -n $line ]] && order+=("$line")
  done <"$ORDER_FILE"
  idx=-1
  if ((${#order[@]} > 0)); then
    for i in "${!order[@]}"; do
      if [[ ${order[$i]} == "$cur" ]]; then idx=$i; fi
    done
  fi
  ((idx >= 0)) || die "текущий релиз $cur не найден в журнале: укажите sha явно"
  ((idx >= 1)) || die "нет предыдущего релиза до $cur"
  target=${order[$((idx - 1))]}
else
  [[ $target =~ ^[0-9a-f]{7,40}$ ]] || die "sha: 7–40 hex-символов"
fi

[[ $target != "$cur" ]] || die "$target уже текущий"
[[ -d "$APP_ROOT/releases/$target" ]] || die "релиза $target нет на сервере (удалён при очистке?)"
[[ -r $ENV_FILE ]] || die "нет файла окружения $ENV_FILE"

log "откат: $cur -> $target"
if ! apply_release "$target"; then
  die "откат на $target не прошёл, сервис не отвечает: journalctl -u $SERVICE"
fi
finalize_csp "$target"
install_bin "$APP_ROOT/releases/$target"
log "готово: current=$target"

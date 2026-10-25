#!/usr/bin/env bash
# Общие функции выпуска и отката. Не запускается отдельно: подключается через `. lib.sh`.
# Выполняется на VPS под пользователем deploy (см. README, «Выпуск»).
#
# Переопределения для проверок на другой машине (в проде не задавать):
#   KEFLAB_APP_ROOT, KEFLAB_ENV_FILE, KEFLAB_SERVICE, KEFLAB_PORT, KEFLAB_TMP_PORT,
#   KEFLAB_NODE, KEFLAB_CSP_TOOL

set -Eeuo pipefail

die() {
  echo "[keflab-deploy] ОШИБКА: $*" >&2
  exit 1
}

log() {
  echo "[keflab-deploy] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

KEFLAB_ENV="${KEFLAB_ENV:-production}"
NODE_BIN="${KEFLAB_NODE:-/opt/node-24/bin/node}"
# Root-утилита установки CSP. Через sudo переменные окружения не передаются (env_reset).
CSP_TOOL="${KEFLAB_CSP_TOOL:-/usr/local/sbin/keflab-install-csp}"
KEEP_RELEASES=5
HEALTH_TIMEOUT="${KEFLAB_HEALTH_TIMEOUT:-30}"

case "$KEFLAB_ENV" in
  production)
    APP_ROOT=/srv/keflab
    SERVICE=keflab
    PORT=3000
    ENV_FILE=/etc/keflab/keflab.env
    PUBLIC_HOST=keflab.ru
    ;;
  staging)
    APP_ROOT=/srv/keflab-staging
    SERVICE=keflab-staging
    PORT=3001
    ENV_FILE=/etc/keflab/keflab-staging.env
    PUBLIC_HOST=
    ;;
  *) die "неизвестное KEFLAB_ENV: $KEFLAB_ENV (ожидается production или staging)" ;;
esac

APP_ROOT="${KEFLAB_APP_ROOT:-$APP_ROOT}"
SERVICE="${KEFLAB_SERVICE:-$SERVICE}"
PORT="${KEFLAB_PORT:-$PORT}"
ENV_FILE="${KEFLAB_ENV_FILE:-$ENV_FILE}"
TMP_PORT="${KEFLAB_TMP_PORT:-$((PORT + 1000))}"

ORDER_FILE="$APP_ROOT/shared/deploy-order.txt"
# Файл хэшей выпускаемого релиза: keflab-install-csp читает именно его.
STAGE_CSP="$APP_ROOT/shared/csp-stage.conf"

# mv с заменой симлинка-каталога: GNU mv -T, на macOS (для локальных проверок) mv -h.
if mv --version >/dev/null 2>&1; then
  MV_ARGS=(-Tf)
else
  MV_ARGS=(-fh)
fi

take_lock() {
  mkdir -p "$APP_ROOT/shared" "$APP_ROOT/releases"
  exec 9>"$APP_ROOT/.deploy.lock"
  if command -v flock >/dev/null 2>&1; then
    flock -n 9 || die "другой выпуск или откат уже идёт ($APP_ROOT/.deploy.lock)"
  fi
}

# Идентификатор текущего релиза (имя каталога), пусто если current нет.
current_id() {
  local target
  target=$(readlink "$APP_ROOT/current" 2>/dev/null || true)
  if [[ -n $target ]]; then basename "$target"; fi
  return 0
}

# Атомарно переставляет current на каталог $1: ln во временный симлинк, затем rename.
switch_current() {
  local rel=$1
  local tmp="$APP_ROOT/.current.next"
  ln -sfn "$rel" "$tmp"
  mv "${MV_ARGS[@]}" "$tmp" "$APP_ROOT/current"
}

# Читает файл окружения как данные: KEY=VALUE построчно, без выполнения shell.
# Значения не выводятся в журнал (в них могут быть секреты).
load_env_file() {
  local file=$1 line key val n=0
  while IFS= read -r line || [[ -n $line ]]; do
    n=$((n + 1))
    if [[ $line =~ ^[[:space:]]*(#|$) ]]; then
      continue
    fi
    if [[ ! $line =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      die "$file: строка $n не в формате KEY=VALUE (содержимое не выводится)"
    fi
    key=${line%%=*}
    val=${line#*=}
    if [[ ${#val} -ge 2 && $val == \"*\" ]]; then
      val=${val:1:${#val}-2}
    elif [[ ${#val} -ge 2 && $val == \'*\' ]]; then
      val=${val:1:${#val}-2}
    fi
    export "$key=$val"
  done <"$file"
}

# Здоровье: тело ответа содержит "ok": true. $1 — URL, дальше аргументы curl.
health_ok() {
  local url=$1
  shift
  local body
  body=$(curl -fsS -m 5 "$@" "$url" 2>/dev/null) || return 1
  [[ $body =~ \"ok\"[[:space:]]*:[[:space:]]*true ]]
}

wait_health() {
  local url=$1
  shift
  local i
  for ((i = 0; i < HEALTH_TIMEOUT; i++)); do
    if health_ok "$url" "$@"; then return 0; fi
    sleep 1
  done
  return 1
}

restart_service() {
  sudo -n systemctl restart "$SERVICE"
}

# Копирует хэши релиза в файл для root-утилиты и вызывает её.
# $1 — файл с хэшами релиза; режим union: старые и новые хэши вместе (переход).
install_csp_union() {
  cp "$1" "$STAGE_CSP"
  sudo -n "$CSP_TOOL" "$KEFLAB_ENV" union
}

# Окончательный CSP: только хэши выпущенного релиза.
finalize_csp() {
  cp "$APP_ROOT/releases/$1/csp-script-hashes.conf" "$STAGE_CSP"
  sudo -n "$CSP_TOOL" "$KEFLAB_ENV" final
}

# Переключает current на релиз $1, перезапускает сервис и проверяет здоровье.
# Если не прошло — возвращает предыдущий релиз (APPLIED_PREV) и возвращает код 1.
apply_release() {
  local target=$1
  local rel="$APP_ROOT/releases/$target"
  local prev
  prev=$(current_id)
  APPLIED_PREV=$prev
  [[ -d $rel ]] || die "нет каталога релиза $rel"

  # Хэши до переключения: старый HTML (кэш Nginx) и новый HTML одновременно разрешены.
  install_csp_union "$rel/csp-script-hashes.conf" || die "CSP не установлен, current не трогаем"

  switch_current "$rel"
  if restart_service && wait_health "http://127.0.0.1:$PORT/api/health"; then
    return 0
  fi

  log "релиз $target не отвечает на порту $PORT, откат на ${prev:-нет предыдущего}"
  if [[ -n $prev && -d "$APP_ROOT/releases/$prev" ]]; then
    switch_current "$APP_ROOT/releases/$prev"
    restart_service || true
    if wait_health "http://127.0.0.1:$PORT/api/health"; then
      log "вернулись на $prev"
    else
      log "предыдущий релиз $prev тоже не отвечает — нужна ручная проверка: journalctl -u $SERVICE"
    fi
  fi
  return 1
}

# Первый файл JS из _nuxt предсобранного релиза (для публичной проверки).
first_asset() {
  local dir=$1 f=""
  if [[ -d $dir/_nuxt ]]; then
    f=$(ls -1 "$dir/_nuxt" | grep -m1 '\.js$' || true)
  fi
  printf '%s' "$f"
}

# Публичная проверка через Nginx (TLS, заголовки, proxy, статика): /api/health,
# предсобранная страница и один файл /_nuxt/. $1 — имя файла из _nuxt.
public_checks() {
  local asset=$1
  local resolve=(--resolve "$PUBLIC_HOST:443:127.0.0.1")
  [[ -n $asset ]] || return 1
  wait_health "https://$PUBLIC_HOST/api/health" "${resolve[@]}" || return 1
  curl -fsS -m 10 -o /dev/null "${resolve[@]}" "https://$PUBLIC_HOST/kalkulyator-ekspressa/" || return 1
  curl -fsS -m 10 -o /dev/null "${resolve[@]}" "https://$PUBLIC_HOST/_nuxt/$asset" || return 1
}

# Копирует скрипты отката в $APP_ROOT/bin (из релиза, который только что выпущен).
install_bin() {
  local rel=$1
  mkdir -p "$APP_ROOT/bin"
  cp "$rel/deploy/scripts/lib.sh" "$rel/deploy/scripts/rollback.sh" "$APP_ROOT/bin/"
  chmod 0755 "$APP_ROOT/bin/rollback.sh" "$APP_ROOT/bin/lib.sh"
}

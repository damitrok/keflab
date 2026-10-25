#!/usr/bin/env bash
# Выпуск релиза на VPS. Вызывается из GitHub Actions (.github/workflows/deploy.yml)
# после распаковки архива в releases/<sha>/.
#
# Использование: KEFLAB_ENV=production|staging activate.sh <sha>
#
# Порядок: проверка файлов -> пробный запуск на TMP_PORT (здоровье и CSP главной)
# -> переключение current и перезапуск (с откатом при провале) -> публичная проверка
# через Nginx (только production) -> окончательный CSP -> журнал релизов и очистка.
set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

sha=${1:-}
[[ $sha =~ ^[0-9a-f]{7,40}$ ]] || die "нужен sha релиза (7–40 hex-символов)"
REL="$APP_ROOT/releases/$sha"
[[ -f "$REL/.output/server/index.mjs" && -d "$REL/.output/public" ]] \
  || die "в $REL нет .output (архив не распакован или сборка неполная)"
[[ -f "$REL/csp-script-hashes.conf" ]] || die "в $REL нет csp-script-hashes.conf"
[[ -r $ENV_FILE ]] || die "нет файла окружения $ENV_FILE (шаблон: .env.example)"

take_lock
log "выпуск $sha в $KEFLAB_ENV ($APP_ROOT)"

# Статика читается Nginx (пользователь www-data): каталог и файлы доступны на чтение всем.
chmod -R u=rwX,go=rX "$REL"

# --- 1. Пробный запуск на временном порту ---
trial_log="$APP_ROOT/shared/trial-$sha.log"
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

(
  load_env_file "$ENV_FILE"
  cd "$REL"
  PORT=$TMP_PORT NITRO_PORT=$TMP_PORT NITRO_HOST=127.0.0.1 exec "$NODE_BIN" .output/server/index.mjs
) >"$trial_log" 2>&1 &
trial_pid=$!

trial_ok=0
if wait_health "http://127.0.0.1:$TMP_PORT/api/health" \
  && curl -fsS -m 5 -o "$tmpdir/home.html" "http://127.0.0.1:$TMP_PORT/" \
  && "$NODE_BIN" "$REL/deploy/scripts/csp-hashes.mjs" verify "$tmpdir/home.html" "$REL/csp-script-hashes.conf"; then
  trial_ok=1
fi
kill "$trial_pid" 2>/dev/null || true
wait "$trial_pid" 2>/dev/null || true
((trial_ok == 1)) || die "пробный запуск $sha не прошёл, см. $trial_log (current не тронут)"
log "пробный запуск ок: здоровье и CSP главной"

# --- 2. Переключение и проверка на боевом порту ---
prev_before=$(current_id)
if ! apply_release "$sha"; then
  die "выпуск $sha откатился на ${APPLIED_PREV:-—}: сервис не отвечает"
fi
log "сервис на $sha отвечает на порту $PORT"

# --- 3. Публичная проверка через Nginx ---
if [[ -n $PUBLIC_HOST ]]; then
  asset=$(first_asset "$REL/.output/public")
  if ! public_checks "$asset"; then
    log "публичная проверка через Nginx не прошла, откат на ${prev_before:-—}"
    if [[ -n $prev_before ]]; then
      apply_release "$prev_before" || true
    fi
    die "выпуск $sha откатан: публичная проверка через Nginx не прошла"
  fi
  log "публичная проверка через Nginx ок (health, страница, _nuxt)"
fi

# --- 4. Окончательные файлы ---
finalize_csp "$sha"
install_bin "$REL"

touch "$ORDER_FILE"
grep -vxF "$sha" "$ORDER_FILE" >"$ORDER_FILE.tmp" || true
echo "$sha" >>"$ORDER_FILE.tmp"
mv -f "$ORDER_FILE.tmp" "$ORDER_FILE"

# --- 5. Хранить последние KEEP_RELEASES релизов (текущий не удаляется никогда) ---
keep=$(tail -n "$KEEP_RELEASES" "$ORDER_FILE")
printf '%s\n' "$keep" >"$ORDER_FILE.tmp"
mv -f "$ORDER_FILE.tmp" "$ORDER_FILE"
current=$(current_id)
for dir in "$APP_ROOT"/releases/*/; do
  [[ -d $dir ]] || continue
  id=$(basename "$dir")
  if [[ $id != "$current" ]] && ! grep -qxF "$id" <<<"$keep"; then
    rm -rf "$dir"
    log "удалён старый релиз $id"
  fi
done
rm -f "$trial_log"

log "готово: current=$sha"

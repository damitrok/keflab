#!/usr/bin/env bash
# Откат с локальной машины одной командой: ssh на VPS и запуск rollback.sh.
#
# Использование:
#   KEFLAB_SSH_TARGET=deploy@<адрес-VPS> deploy/scripts/remote-rollback.sh production
#   KEFLAB_SSH_TARGET=deploy@<адрес-VPS> deploy/scripts/remote-rollback.sh production <sha>
#   KEFLAB_SSH_TARGET=... KEFLAB_SSH_KEY=~/.ssh/keflab_deploy deploy/scripts/remote-rollback.sh staging
#
# Проверка ключа хоста — строгая: адрес должен быть в ~/.ssh/known_hosts.
set -Eeuo pipefail

env_name=${1:-}
sha=${2:-}

case $env_name in
  production) app_root=/srv/keflab ;;
  staging) app_root=/srv/keflab-staging ;;
  *)
    echo "использование: $0 production|staging [sha]" >&2
    exit 2
    ;;
esac

if [[ -n $sha && ! $sha =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "sha должен быть 7–40 hex-символами" >&2
  exit 2
fi

: "${KEFLAB_SSH_TARGET:?задайте KEFLAB_SSH_TARGET, например deploy@<адрес-VPS>}"

ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10)
if [[ -n ${KEFLAB_SSH_KEY:-} ]]; then
  ssh_opts+=(-i "$KEFLAB_SSH_KEY" -o IdentitiesOnly=yes)
fi

started=$(date +%s)
# Значения намеренно подставляются на этой машине: env_name, app_root и sha
# проверены выше строгими шаблонами.
# shellcheck disable=SC2029
ssh "${ssh_opts[@]}" "$KEFLAB_SSH_TARGET" "KEFLAB_ENV=$env_name $app_root/bin/rollback.sh $sha"
echo "откат занял $(($(date +%s) - started)) с (цель — меньше 5 минут)"

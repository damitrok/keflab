#!/usr/bin/env bash
# Проверка срока TLS-сертификата. Запускать по cron с ДРУГОЙ машины (не с VPS).
#
# Использование: check-cert.sh [домен] [порог-в-днях]
#   check-cert.sh keflab.ru 14
#   check-cert.sh staging.keflab.ru 14
# Переменные: PORT (по умолчанию 443); CERT_FILE — проверить PEM-файл вместо сети (для тестов).
#
# exit 0 — срок больше порога; exit 1 — порог пересечён или сертификат не получен.
# Пример cron (ежедневно в 09:00):
#   0 9 * * * /opt/monitoring/check-cert.sh keflab.ru 14 || /opt/monitoring/notify.sh "keflab cert"
set -Eeuo pipefail

host=${1:-keflab.ru}
days=${2:-14}
port=${PORT:-443}

if ! [[ $days =~ ^[0-9]+$ ]]; then
  echo "порог должен быть целым числом дней" >&2
  exit 2
fi
seconds=$((days * 86400))

if [[ -n ${CERT_FILE:-} ]]; then
  pem=$(cat "$CERT_FILE")
else
  run_timeout() {
    if command -v timeout >/dev/null 2>&1; then timeout 15 "$@"; else "$@"; fi
  }
  pem=$(run_timeout openssl s_client -servername "$host" -connect "$host:$port" </dev/null 2>/dev/null \
    | openssl x509 2>/dev/null || true)
fi

if [[ -z $pem ]]; then
  echo "ВНИМАНИЕ: не удалось получить сертификат $host:$port (сеть, TLS или DNS)" >&2
  exit 1
fi

end=$(printf '%s\n' "$pem" | openssl x509 -noout -enddate | cut -d= -f2)

if printf '%s\n' "$pem" | openssl x509 -noout -checkend "$seconds" >/dev/null; then
  echo "OK: сертификат $host действует до $end (порог $days дн.)"
  exit 0
fi

echo "ВНИМАНИЕ: сертификат $host истекает $end — меньше $days дн. Проверьте: sudo certbot renew --dry-run" >&2
exit 1

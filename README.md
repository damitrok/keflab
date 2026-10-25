# keflab.ru

Калькулятор системы и экспресса для игроков легальных букмекеров России. 18+.
Сайт на Nuxt 4 (Vue 3, TypeScript), сборка через Nitro в `node-server`, отдача
через Nginx на VPS в России. Сейчас: калькуляторы, статьи и служебные страницы.
Офферы выключены.

Что в репозитории для выпуска: `deploy/` (Nginx, systemd, скрипты, root-утилита CSP)
и `.github/workflows/deploy.yml`. Правила для агента — в `AGENTS.md`, ТЗ — `ТЗ для ИИ-агента.pdf`.

## Локальный запуск

Нужен Node 24 (версия в `.nvmrc`).

```sh
npm ci                 # зависимости
npm run dev            # разработка: http://localhost:3000
npm run build          # сборка в .output (предсобирает страницы из shared/site-pages.ts)
npm run preview        # запуск собранного сайта
node .output/server/index.mjs   # то же, что делает systemd на сервере (PORT=3000)
```

Проверки (как в CI):

```sh
npm run lint           # ESLint и Prettier
npm run typecheck      # vue-tsc
npm test               # Vitest
npm run test:e2e       # Playwright + axe (нужен `npx playwright install chromium`)
npm run check:data     # схемы data/*.json
npm run check:links    # внешние ссылки только из data/allowlist.json
npm run check:seo      # sitemap, title, description, canonical, разметка
npm run lhci           # Lighthouse CI (телефон)
node deploy/scripts/check-deploy.mjs   # логика nginx, systemd, sudoers, workflow, bash -n
npm run load-test      # нагрузка (скрипт добавлен в задаче нагрузочного теста)
```

`check-deploy.mjs` не заменяет `nginx -t`: синтаксис конфигов проверяет только сам nginx,
а на машине разработчика его обычно нет.

## Переменные окружения

Шаблон — `.env.example`. Реальные значения в git не хранить.

| Имя                               | Где нужна                                              | Пример                                                                   | Обязательна                                                                          |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `NUXT_PUBLIC_METRIKA_ID`          | сборка (GitHub Variables репозитория)                  | `12345678`                                                               | нет: пусто — Метрика не подключается. Для staging код сборки всегда оставляет пусто  |
| `NUXT_PUBLIC_YANDEX_VERIFICATION` | сборка (GitHub Variables репозитория)                  | `abc123…`                                                                | нет: метатег Вебмастера                                                              |
| `NUXT_PUBLIC_GOOGLE_VERIFICATION` | сборка (GitHub Variables репозитория)                  | `xyz789…`                                                                | нет: метатег Search Console                                                          |
| `OFFERS_ENABLED`                  | сборка (проверка) и рантайм (`/etc/keflab/keflab.env`) | `false`                                                                  | да, по умолчанию `false`. Только строка `true` включает офферы                       |
| `NODE_ENV`                        | рантайм                                                | `production`                                                             | да                                                                                   |
| `PORT`                            | рантайм                                                | `3000` (staging: `3001`)                                                 | да                                                                                   |
| `NITRO_PORT`                      | рантайм                                                | `3000` (staging: `3001`)                                                 | да, то же, что `PORT`                                                                |
| `NITRO_HOST`                      | рантайм                                                | `127.0.0.1`                                                              | да: Node слушает только локальный адрес                                              |
| `GEO_HEADER_TRUSTED`              | рантайм (`keflab.env`, `keflab-staging.env`)           | `true`                                                                   | да. Только `true` доверяет заголовку страны от Nginx; иначе страны нет и офферов нет |
| `KEFLAB_STATS_DIR`                | рантайм                                                | `/srv/keflab/shared/stats` (staging: `/srv/keflab-staging/shared/stats`) | да, если ведётся статистика показов и кликов (раздел «Статистика показов и кликов»)  |

`NUXT_PUBLIC_*` задаются только при сборке и в рантайм не кладутся. Значения попадают в
предсобранные страницы и в inline-конфиг SSR, а хэш этого скрипта стоит в CSP. Если в
`keflab.env` будет другое значение, пробный запуск релиза не пройдёт проверку CSP главной.
Поменяли `NUXT_PUBLIC_*` — выпустите релиз заново.

Секреты деплоя (GitHub Secrets окружения `production` или `staging`, не файлы):
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.

## Выпуск

Выпуск делает `.github/workflows/deploy.yml`, в три задачи:

1. **prepare** — выбирает окружение. Push в `main` → production, push в `staging` → staging,
   только после успешного CI. Ручной запуск (Actions → Deploy → Run workflow) проверяет через
   API, что для выбранного commit есть успешный CI, иначе выпуск отменяется. Production — только из `main`.
2. **build** — `npm ci`, `npm run build`, снимает SSR главной, пишет хэши CSP, собирает архив
   `<sha>.tar.gz` с проверочной суммой и публикует его как артефакт. **Без environment и без
   секретов**: код зависимостей выполняется здесь, без ключа VPS.
3. **deploy** — environment `production` или `staging` (здесь секреты SSH). npm не запускает.
   Скачивает артефакт, проверяет сумму, загружает архив по SSH на VPS и запускает
   `deploy/scripts/activate.sh`.

Ключ хоста проверяется строго (`StrictHostKeyChecking=yes`): в `DEPLOY_KNOWN_HOSTS` —
строки из `ssh-keyscan` после сверки отпечатка с тем, что показал хостер. Пустой
`DEPLOY_KNOWN_HOSTS` останавливает выпуск.

Рекомендуется в GitHub → Settings → Environments → `production` включить **Required reviewers**:
выпуск в продакшн будет ждать подтверждения.

На VPS `activate.sh`:

- распаковывает релиз в `/srv/keflab/releases/<sha>/` (статика — читаемая всем, секретов там нет);
- пробно запускает его на временном порту и проверяет `/api/health` и CSP главной;
- переключает симлинк `current` атомарно и перезапускает сервис;
- проверяет `/api/health` на боевом порту, а для production — через Nginx: `/api/health`,
  страницу `/kalkulyator-ekspressa/` и файл из `/_nuxt/`;
- при любом провале возвращает предыдущий релиз и завершается с ошибкой;
- оставляет последние 5 релизов. Текущий релиз не удаляется никогда. Повторный выпуск того
  же sha не трогает живой каталог.

Хэши CSP ставит root-утилита `/usr/local/sbin/keflab-install-csp`, а не deploy напрямую (см. ниже).

## Откат

Цель — меньше 5 минут. Откат ставит предыдущий релиз (по журналу выпусков) и проверяет
здоровье. Одна команда с локальной машины:

```sh
KEFLAB_SSH_TARGET=deploy@<адрес-VPS> deploy/scripts/remote-rollback.sh production
```

На месте, на VPS:

```sh
KEFLAB_ENV=production /srv/keflab/bin/rollback.sh          # предыдущий релиз
KEFLAB_ENV=production /srv/keflab/bin/rollback.sh <sha>    # конкретный релиз из releases/
```

Повторный откат идёт дальше назад по истории. Релиз, которого нет в `releases/`
(старше последних 5), откатить нельзя: выпустите нужный коммит заново.

## Срочно убрать все офферы

Одна команда на VPS, от root (сборка и выпуск не нужны):

```sh
sudo /usr/local/sbin/keflab-offers off      # OFFERS_ENABLED=false и перезапуск keflab
sudo /usr/local/sbin/keflab-offers status   # значение в файле и состояние сервиса
curl -s https://keflab.ru/api/geo          # в ответе offersEnabled: false
```

Что делает утилита (`deploy/sbin/keflab-offers`):

- меняет только строку `OFFERS_ENABLED` в `/etc/keflab/keflab.env`: пишет временный файл в том же
  каталоге и заменяет им старый (`mv`), владелец и права (`root:keflab`, `0640`) сохраняются;
- выполняет `systemctl restart keflab`: процесс читает флаг только при старте. Офферы пропадают
  за несколько секунд. На это время `/api/*` и `/go/*` могут отвечать 502; главная отдаётся из
  кэша Nginx;
- если перезапуск не удался, файл уже изменён: повторите `sudo systemctl restart keflab`.

Включить обратно можно только после регистрации сайта как СМИ (AGENTS.md):

```sh
sudo /usr/local/sbin/keflab-offers on --media-registered
```

Утилита запускается только от root. В `/etc/sudoers.d/keflab-deploy` для неё строки **нет**:
deploy выключать офферы не должен. Staging утилита не трогает: там та же правка
`OFFERS_ENABLED` в `/etc/keflab/keflab-staging.env` и `systemctl restart keflab-staging`.

Значение в `keflab.env` не трогает выпуск, поэтому выключение переживает следующий релиз.

## GeoIP: страна для офферов (шаг 13)

Страну определяет Nginx по адресу клиента, локально, из файла базы MMDB (модуль
`ngx_http_geoip2_module`). Страна уходит в приложение заголовком `X-Keflab-Country`
(ISO-код или пусто). Node читает его только при `GEO_HEADER_TRUSTED=true`. Иначе страна
неизвестна и офферов нет.

Почему заголовку можно доверять:

- `snippets/proxy-node.conf` задаёт `X-Keflab-Country` в каждом location с `proxy_pass`.
  Заголовок клиента перетирается. Пустое значение не передаётся, поэтому подделка снаружи
  не проходит. `check-deploy.mjs` проверяет, что в каждом проксирующем location есть этот сниппет.
- Node слушает только `127.0.0.1` (systemd: `IPAddressAllow=localhost`). Заголовок может
  прийти только от Nginx.
- Локальная база ничего не передаёт наружу. Исключение — загрузка новой версии базы, см. ниже.

### Поставщик базы: решение человека

Агент не выбирал поставщика и не проверял лицензии и текущие условия. Ниже — варианты
для сверки. Регистрацию и лицензионные ключи делает человек.

| Поставщик                   | Формат                               | Условия (проверить на сайте поставщика)                                      | Замечание                                                                                      |
| --------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| MaxMind GeoLite2-Country    | MMDB, нативно                        | бесплатно, нужна регистрация и лицензионный ключ, атрибуция; компания из США | обновляется регулярно; загрузка через `geoipupdate` ходит на серверы MaxMind                   |
| MaxMind GeoIP2-Country      | MMDB                                 | платно                                                                       | то же, что GeoLite2, с другими условиями                                                       |
| DB-IP IP to Country Lite    | MMDB                                 | бесплатно, без регистрации; лицензия CC BY 4.0, нужна атрибуция на сайте     | выпуск раз в месяц                                                                             |
| IPinfo Lite                 | MMDB                                 | бесплатно, нужен токен                                                       | поля могут называться иначе (например, `country_code`): путь в конфиге править по `mmdblookup` |
| ipgeobase.ru (Россия)       | CSV/текст, не MMDB                   | бесплатные базы, проверить лицензию и право на переработку                   | нужна конвертация в MMDB; модуля для этого формата нет                                         |
| Sypex Geo, SxGeo (Россия)   | собственный бинарный формат, не MMDB | проверить лицензию                                                           | нужна конвертация или свой парсер; готового модуля nginx нет                                   |
| Любой онлайн-API геолокации | —                                    | —                                                                            | **нельзя**: IP посетителя уйдёт за пределы сервера (ограничение ТЗ)                            |

Что важно для выбора: путь `country iso_code` (в MaxMind-схеме) должен существовать в базе;
проверить командой ниже. Если база не различает страну точно, например для мобильных
операторов, то страна может ошибочно указать РФ или не указать её вовсе. Тогда офферы
показываются там, где не должны, или не показываются там, где должны. Это юридический риск,
решение за человеком (AGENTS.md, правило 9).

### Установка (до шага 8 «Nginx: боевые конфиги»)

```sh
sudo apt install -y libnginx-mod-http-geoip2 mmdb-bin   # mmdb-bin даёт mmdblookup
ls /etc/nginx/modules-enabled/ | grep -i geoip          # модуль подключается пакетом сам
sudo install -d -m 755 -o root -g root /etc/nginx/keflab/geo
# Файл базы выбранного поставщика кладёт человек (не из репозитория), например country.mmdb:
sudo install -m 644 -o root -g root /путь/к/country.mmdb /etc/nginx/keflab/geo/country.mmdb
# Проверка: страна должна вернуться (77.88.8.8 — РФ, 8.8.8.8 — США)
mmdblookup --file /etc/nginx/keflab/geo/country.mmdb --ip 77.88.8.8 country iso_code
mmdblookup --file /etc/nginx/keflab/geo/country.mmdb --ip 8.8.8.8 country iso_code
```

Если `mmdblookup` ничего не вернул или путь другой, исправьте `$keflab_geo_country country iso_code`
в `conf.d/keflab-http.conf` под схему базы. Без корректного пути страна всегда пустая.

Без модуля или без файла базы `nginx -t` упадёт (неизвестная директива или файл не открыт).
Тогда используйте запасной вариант.

### Обновление базы раз в месяц (шаг 15)

Базы устаревают, поэтому обновлять раз в месяц:

```sh
# 1. Скачать новую версию вручную или утилитой поставщика в каталог вне /etc/nginx.
# 2. Проверить mmdblookup на двух адресах (см. выше).
sudo install -m 644 -o root -g root /путь/к/новой/country.mmdb /etc/nginx/keflab/geo/country.mmdb.new
sudo mv /etc/nginx/keflab/geo/country.mmdb.new /etc/nginx/keflab/geo/country.mmdb
sudo nginx -t && sudo systemctl reload nginx
# 3. Дата обновления — по времени файла:
sudo stat -c '%y %n' /etc/nginx/keflab/geo/country.mmdb
```

Возраст базы больше 35 дней — напоминание в журнал выпусков. Автоматического обновления
нет: загрузка из интернета и лицензионные ключи — решение человека.

### Запасной вариант: модуля или базы нет

На VPS, в `/etc/nginx/conf.d/keflab-http.conf`: закомментировать блок `geoip2 ... { ... }` и
раскомментировать блок `map $remote_addr $keflab_geo_country { default ""; }`. Затем:

```sh
sudo nginx -t && sudo systemctl reload nginx
sudo nginx -T 2>/dev/null | grep -c 'map \$remote_addr \$keflab_geo_country'   # должно быть 1
```

Страна всегда пустая: приложение не получит страну, офферы не показываются, сайт работает.
Вернуть GeoIP — обратная правка и `nginx -t`.

### Проверка после установки

```sh
# Число заголовков X-Keflab-Country равно числу проксирующих location (proxy_pass на Node):
sudo nginx -T 2>/dev/null | grep -c 'X-Keflab-Country'
sudo nginx -T 2>/dev/null | grep -c 'proxy_pass http://keflab'
# Подделка снаружи не меняет ответ: сравнить ответ с заголовком и без него.
curl -s https://keflab.ru/api/geo
curl -s -H 'X-Keflab-Country: RU' https://keflab.ru/api/geo
```

Два ответа `/api/geo` должны совпадать. Если отличаются, Nginx не перетирает заголовок: включите
`GEO_HEADER_TRUSTED` только после исправления.

## Статистика показов и кликов

- **Каталог.** `KEFLAB_STATS_DIR`: `/srv/keflab/shared/stats` (production),
  `/srv/keflab-staging/shared/stats` (staging). Владелец `keflab:keflab`, права `0750`:

  ```sh
  sudo install -d -m 0750 -o keflab -g keflab /srv/keflab/shared/stats /srv/keflab-staging/shared/stats
  ```

  Юниты systemd уже разрешают запись в `ReadWritePaths` (`/srv/keflab/shared`,
  `/srv/keflab-staging/shared`), поэтому каталог внутри них доступен процессу.

- **Срок хранения — 13 месяцев.** Хранит и очищает приложение. Внешней очистки на VPS нет.
- **`/api/stat`** (Nginx): только `POST`, тело до 1 КБ, лимит 5 запросов в секунду на сеть
  (всплеск 20). Сверх лимита — `429`. Ключ лимита живёт только в памяти nginx.
- **Лимиты по сети.** Все зоны `limit_req` (`/go`, `/api/error`, `/api/stat`) считают по одному
  ключу `$keflab_limit_key` (`conf.d/keflab-http.conf`): IPv4 — по `/24`, IPv6 — по `/64`
  (первые четыре группы), IPv4-mapped — как IPv4. Лимиты по полному адресу не используются:
  иначе блок адресов обходит их.
- **Защита счётчика показов.** От прямого скрипта, который шлёт `POST /api/stat` в обход сайта,
  счётчик показов полностью не защищён: nginx ограничивает частоту, но не подлинность. Лимиты
  по `/24` и `/64` уменьшают нагрузку, а не доказывают, что показ был. Скрипт с поддельным
  заголовком `Origin` с российского адреса может накручивать показы. Дополнительно Node
  ограничивает показы на `erid` (3000 в минуту на процесс, в 10 раз выше лимита одной сети),
  а отброшенные лимитом показы записывает отдельным полем `throttled` в те же суточные
  файлы — по нему видно накрутку и можно объяснить расхождения в отчёте для ОРД.
- **Логи** `/api/stat`: `keflab-stat.access.log` (и `keflab-staging-stat.access.log`) в формате
  `/go`: без IP и без User-Agent. Срок хранения 14 дней, как у остальных логов Nginx.
- **Адрес в приложении.** Nginx передаёт `X-Real-IP` и `X-Forwarded-For` в Node, как и всем
  location. Приложение не должно писать их в статистику: это проверка кода, а не Nginx.
- **Ограничения.** Клиент с блоком адресов короче `/64` (например, `/48`) получает отдельный
  лимит на каждый `/64`. Сеть с общим IPv4 (мобильный оператор, NAT) делит один лимит на `/24`:
  часть показов может не посчитаться. Для посетителя это не ошибка: запрос получит `429`,
  а скрипт сайта не показывает ошибку пользователю.
- **Уточнение по лимиту `/go` и `/api/error`.** Теперь они тоже по сети (`/24` и `/64`), а не по
  адресу. Пользователи одной мобильной сети делят лимит `/go` (10 запросов в секунду, всплеск 20).

## Staging

- Адрес: `https://staging.keflab.ru`. Доступ по basic auth, `noindex, nofollow` на всех
  ответах, `robots.txt` — `Disallow: /`.
- Файлы: `/srv/keflab-staging/`, сервис `keflab-staging`, порт `3001`, env
  `/etc/keflab/keflab-staging.env`.
- Метрика на staging не подключается: код сборки для staging всегда оставляет
  `NUXT_PUBLIC_METRIKA_ID` пустым.
- Пароль basic auth — не в репозитории. Создать на VPS (пароль вводится с клавиатуры):

  ```sh
  sudo apt install -y apache2-utils
  sudo htpasswd -c /etc/nginx/keflab-staging.htpasswd <логин>
  sudo chown root:www-data /etc/nginx/keflab-staging.htpasswd && sudo chmod 640 /etc/nginx/keflab-staging.htpasswd
  ```

## Мониторинг

Мониторинг должен работать вне VPS, иначе падение сервера он не увидит. Выбор сервиса —
за человеком. Требования: проверки из России, без данных за рубежом, без регистрации от
имени агента.

**Доступность.** Проверять `https://keflab.ru/api/health` и `https://keflab.ru/` каждые
1–5 минут, алерт при сбое 5 минут подряд.

Варианты:

- Внешний сервис мониторинга с точками проверки в России. Выбрать, проверить наличие
  точек в РФ и где хранятся данные, настроить два URL из выше.
- Свой скрипт `deploy/scripts/check-availability.sh` на отдельной машине в РФ (не на VPS):
  cron каждую минуту, алерт после 5 сбоев подряд, то есть примерно за 5 минут
  (`KEFLAB_ALERT_CMD` — команда оповещения, например отправка в мессенджер; токены только
  через переменные окружения):

  ```cron
  * * * * * KEFLAB_ALERT_CMD='/opt/monitoring/notify.sh' /opt/monitoring/check-availability.sh
  ```

**Срок сертификата.** Алерт за 14 дней. Сертификат обновляет certbot через systemd-timer;
проверить, что таймер активен: `systemctl list-timers | grep certbot` и
`sudo certbot renew --dry-run`. Сам скрипт проверки — с другой машины по cron:

```cron
0 9 * * * /opt/monitoring/check-cert.sh keflab.ru 14 || /opt/monitoring/notify.sh "keflab: сертификат"
```

Exit 1 — срок меньше порога или сертификат не получен.

**Ошибки приложения.** Приложение пишет строки `[keflab] …` в journald без пользовательских
данных (IP, запросов, ввода). Посмотреть вручную:
`journalctl -u keflab -p warning --since "1 hour ago"`. Заявки из браузера на `/api/error`
проходят через лимит Nginx: 1 запрос в секунду на сеть (IPv4 /24, IPv6 /64), всплеск 10, только POST.

Чтобы ошибки уходили в сервис, выбрать один из вариантов (решение человека):

- Без SDK: агент сбора логов на VPS (например Vector или Promtail, проверить совместимость
  и лицензию) читает journald юнита `keflab`, берёт строки с `[keflab]` и отправляет на
  сервер мониторинга в России (можно свой Grafana Loki на отдельной машине в РФ).
- Сервис ошибок со SDK (Sentry-совместимый): подключается в коде приложения — отдельное
  решение, не в деплое. Перед выбором проверить, где хранятся данные, и что в событиях
  нет персональных данных.

**Логи Nginx и срок хранения.** Основной лог — с маскированным IP (`203.0.113.0`). Лог
`/go` и `/api/stat` — без IP и без User-Agent; их error-лог пишет только `crit`, поэтому записи об
отказах `limit_req` (содержат адрес клиента) туда не попадают. Срок хранения всех логов
Nginx — **14 дней**. Ubuntu уже ротирует `/var/log/nginx/*.log` ежедневно и хранит 14
копий (`/etc/logrotate.d/nginx`): файлы `keflab-*.log` попадают под эту маску. Проверить:
`sudo logrotate -d /etc/logrotate.d/nginx`. Сообщения самого Nginx в `error.log` для
`keflab.ru` (уровень `warn`) содержат адрес клиента — поэтому срок 14 дней обязателен.

## Восстановление на новом VPS

Цель — около 2 часов. Состояние сайта — в git и в `data/`, базы данных нет: новый VPS
поднимается с нуля и выпускается тем же workflow.

Нужно заранее: доступ к регистратору DNS, почта для уведомлений Let's Encrypt, публичный
ключ деплоя, значения `DEPLOY_KNOWN_HOSTS` (после сверки отпечатка). Snapshot старого VPS
не нужен.

Все команды ниже выполняются в корне клона репозитория на VPS (`git clone` под
пользователем с sudo): пути `deploy/...` относительные к нему.

**0. DNS.** За сутки до переезда снизить TTL записей до 300 секунд (или меньше). Дальше —
A-записи `keflab.ru`, `www.keflab.ru`, `staging.keflab.ru` на адрес нового VPS.

**1. Пакеты.** Ubuntu 24.04 LTS.

```sh
sudo apt update
sudo apt install -y nginx libnginx-mod-http-geoip2 mmdb-bin certbot curl rsync openssl ufw
sudo ufw allow OpenSSH          # сначала SSH, чтобы не отрезать себя
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**2. Node 24 в `/opt/node-24`** (как в `.nvmrc` и `keflab.service`). Если nodejs.org из
России медленный — скачать архив заранее и загрузить на VPS.

```sh
NODE_VERSION=24.x.y    # последняя 24.x: https://nodejs.org/dist/latest-v24.x/
cd /tmp
curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt
grep " node-v${NODE_VERSION}-linux-x64.tar.xz\$" SHASUMS256.txt | sha256sum -c -
sudo mkdir -p /opt/node-24
sudo tar -xJf node-v${NODE_VERSION}-linux-x64.tar.xz -C /opt/node-24 --strip-components=1
/opt/node-24/bin/node -v        # должно быть v24.x.y
```

**3. Пользователи и группы.** `keflab` — сервис, без входа. `deploy` — выпуск по SSH.
Пользователь `deploy` читает `/etc/keflab/*.env` (`root:keflab`, `0640`) через группу
`keflab`. `www-data` (Nginx) в эту группу **не** входит.

```sh
sudo useradd --system --home /srv/keflab --shell /usr/sbin/nologin keflab
sudo useradd --create-home --shell /bin/bash deploy
sudo usermod -aG keflab deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo '<публичный ключ деплоя>' | sudo tee /home/deploy/.ssh/authorized_keys >/dev/null
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys && sudo chmod 600 /home/deploy/.ssh/authorized_keys
# Проверка: www-data не в группе keflab
id -nG www-data | grep -qw keflab && echo "ОШИБКА: www-data в группе keflab" || echo "ок"
```

Вход под `root` по SSH отключить: `PermitRootLogin no` в `/etc/ssh/sshd_config`, затем
`sudo systemctl reload ssh`.

**4. Каталоги и права.** Статика читается пользователем `www-data`, поэтому каталоги
верхнего уровня доступны на обход (`0711`), содержимое релизов — на чтение всем (секретов
там нет). Env-файлы и служебные каталоги — только для `deploy`/`keflab`.

```sh
sudo mkdir -p /srv/keflab/{releases,incoming,bin,shared} /srv/keflab-staging/{releases,incoming,bin,shared}
sudo chown -R deploy:keflab /srv/keflab /srv/keflab-staging
sudo chmod 0711 /srv/keflab /srv/keflab/releases /srv/keflab-staging /srv/keflab-staging/releases
sudo chmod 0750 /srv/keflab/{incoming,bin,shared} /srv/keflab-staging/{incoming,bin,shared}
sudo install -d -m 750 -o root -g keflab /etc/keflab
sudo install -d -m 755 -o root -g root /var/www/letsencrypt
sudo install -d -m 755 -o www-data -g www-data /var/cache/nginx/keflab /var/cache/nginx/keflab-staging \
  /var/cache/nginx/keflab-embed /var/cache/nginx/keflab-staging-embed
sudo install -d -m 0750 -o keflab -g keflab /srv/keflab/shared/stats /srv/keflab-staging/shared/stats
sudo install -d -m 755 -o root -g root /etc/nginx/keflab/geo   # база GeoIP, см. раздел «GeoIP»
```

**5. Файлы окружения.** Шаблон — `.env.example`, раздел «Рантайм». Значения
`OFFERS_ENABLED=false`, `NITRO_HOST=127.0.0.1`, `NITRO_PORT`/`PORT` — `3000` для production
и `3001` для staging. `GEO_HEADER_TRUSTED=true` (в обоих файлах) и `KEFLAB_STATS_DIR` — как в
шаблоне: для staging путь `/srv/keflab-staging/shared/stats`. `GEO_HEADER_TRUSTED=true` допустимо
только за Nginx из `deploy/nginx`, который перетирает заголовок страны (раздел «GeoIP»).
Файл читается как данные (построчно `KEY=VALUE`), shell его не выполняет.

```sh
sudo nano /etc/keflab/keflab.env
sudo nano /etc/keflab/keflab-staging.env
sudo chown root:keflab /etc/keflab/*.env && sudo chmod 640 /etc/keflab/*.env
```

**6. Заглушки для Nginx: ACME и 443.** До сертификатов конфиги с HTTPS не пройдут
`nginx -t`: сначала HTTP-заглушка и самоподписанный сертификат для неизвестного Host.

```sh
sudo rm -f /etc/nginx/sites-enabled/default
sudo install -d -m 755 /etc/nginx/keflab
sudo openssl req -x509 -newkey rsa:2048 -nodes -days 36500 -subj "/CN=invalid" \
  -keyout /etc/nginx/keflab/default.key -out /etc/nginx/keflab/default.crt
sudo chmod 600 /etc/nginx/keflab/default.key
sudo tee /etc/nginx/sites-available/acme-bootstrap >/dev/null <<'CONF'
server {
    listen 80 default_server;
    server_name keflab.ru www.keflab.ru staging.keflab.ru;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
CONF
sudo ln -sf /etc/nginx/sites-available/acme-bootstrap /etc/nginx/sites-enabled/acme-bootstrap
sudo nginx -t && sudo systemctl reload nginx
```

**7. Сертификаты.** Нужен DNS на новый адрес (шаг 0). Почта — адрес, куда Let's Encrypt
пришлёт уведомления об истечении.

```sh
sudo certbot certonly --webroot -w /var/www/letsencrypt -n --agree-tos \
  -m <почта-для-уведомлений> -d keflab.ru -d www.keflab.ru
sudo certbot certonly --webroot -w /var/www/letsencrypt -n --agree-tos \
  -m <почта-для-уведомлений> -d staging.keflab.ru
sudo certbot renew --dry-run
systemctl list-timers | grep certbot    # таймер certbot.timer должен быть активен
```

**8. Nginx: боевые конфиги.** Сначала модуль и база GeoIP (раздел «GeoIP»): без файла
`/etc/nginx/keflab/geo/country.mmdb` `nginx -t` не пройдёт, если не включён запасной вариант.

```sh
sudo install -d -m 755 /etc/nginx/keflab/snippets /etc/nginx/keflab/csp
sudo cp deploy/nginx/snippets/*.conf /etc/nginx/keflab/snippets/
sudo cp deploy/nginx/conf.d/keflab-http.conf /etc/nginx/conf.d/keflab-http.conf
sudo cp deploy/nginx/keflab.ru.conf /etc/nginx/sites-available/keflab.ru
sudo cp deploy/nginx/staging.keflab.ru.conf /etc/nginx/sites-available/staging.keflab.ru
sudo cp deploy/nginx/default-reject.conf /etc/nginx/sites-available/default-reject
sudo rm -f /etc/nginx/sites-enabled/acme-bootstrap
sudo ln -sf /etc/nginx/sites-available/keflab.ru /etc/nginx/sites-enabled/keflab.ru
sudo ln -sf /etc/nginx/sites-available/staging.keflab.ru /etc/nginx/sites-enabled/staging.keflab.ru
sudo ln -sf /etc/nginx/sites-available/default-reject /etc/nginx/sites-enabled/default-reject
# Стартовые файлы CSP (root). Первый выпуск их перезапишет через keflab-install-csp.
sudo install -m 644 deploy/nginx/snippets/csp-script-hashes.example.conf /etc/nginx/keflab/csp/production.conf
sudo install -m 644 deploy/nginx/snippets/csp-script-hashes.example.conf /etc/nginx/keflab/csp/staging.conf
```

Логи полного IP: в `/etc/nginx/nginx.conf` в блоке `http` закомментировать строку
`access_log /var/log/nginx/access.log …;` (проверить `grep -n access_log /etc/nginx/nginx.conf`).
Наши server-блоки пишут только `keflab_main` (маскированный IP).

Пароль staging — см. раздел «Staging». Затем:

```sh
sudo nginx -t && sudo systemctl reload nginx
```

Сжатие Brotli не включено по умолчанию (нужен модуль). Инструкция — в
`/etc/nginx/keflab/snippets/brotli.conf`. gzip работает без него.

**9. Root-утилита CSP, systemd и права выпуска.**

```sh
sudo install -m 755 -o root -g root deploy/sbin/keflab-install-csp /usr/local/sbin/keflab-install-csp
sudo install -m 755 -o root -g root deploy/sbin/keflab-offers /usr/local/sbin/keflab-offers
sudo cp deploy/systemd/keflab.service deploy/systemd/keflab-staging.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/keflab.service /etc/systemd/system/keflab-staging.service
sudo systemctl enable keflab keflab-staging
sudo cp deploy/sudoers/keflab-deploy /etc/sudoers.d/keflab-deploy
sudo chmod 440 /etc/sudoers.d/keflab-deploy
sudo visudo -cf /etc/sudoers.d/keflab-deploy
```

`keflab-install-csp` — единственный путь, которым deploy меняет конфиг Nginx. Утилита сама
проверяет `nginx -t`, при ошибке возвращает прежний файл и только затем перезагружает Nginx.
Вход в утилиту — только `production|staging` и `[final]`; из файла хэшей берутся лишь токены
`'sha256-…'`. Сервисы не запускаем вручную: до первого выпуска в `current` ничего нет, юниты
упадут и будут перезапускаться каждые 2 секунды. После первого выпуска они стартуют.

**10. Первый выпуск.** В GitHub: Actions → Deploy → Run workflow → `staging`, затем
`production`. Секреты окружений `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`,
`DEPLOY_KNOWN_HOSTS` должны быть заданы до этого. Проверить:

```sh
curl -s https://keflab.ru/api/health                  # {"ok":true}
curl -sI https://keflab.ru/ | head -20               # заголовки безопасности
sudo -u www-data test -r /srv/keflab/current/.output/public/kalkulyator-ekspressa/index.html && echo "статика читается"
deploy/scripts/check-cert.sh keflab.ru 14            # с другой машины
```

**11. Переключение DNS и старый VPS.** После проверки переключить DNS. Старый VPS
остановить только после того, как новый отвечает не меньше часа.

## Виджет /embed/ (шаг 12)

Встраивать в чужие страницы можно только `/embed/`. Весь остальной сайт встраивать нельзя.

- **Остальной сайт:** `frame-ancestors 'none'` в `snippets/security-headers.conf` и
  `X-Frame-Options: DENY` (для старых браузеров). Оба заголовка есть на каждом location.
- **Превью на `/vidzhet/`:** общий CSP разрешает `frame-src 'self'`, чтобы страница показывала
  виджет своим iframe. `frame-ancestors` при этом остаётся `'none'`.
- **Виджет:** свой набор `snippets/security-headers-embed.conf` с `frame-ancestors *`. Он
  подключается только в `location ^~ /embed/` и не сочетается с общим набором (иначе два CSP).
  В этом наборе нет `X-Frame-Options` (браузер применил бы его и запретил встраивание),
  Метрики нет (`connect-src 'self'`, `frame-src 'none'`). Счётчик показов идёт через свой
  `/api/stat` с того же домена (лимиты и лог: раздел «Статистика показов и кликов»).
- **Заголовки Node скрыты.** `routeRules` в `nuxt.config.ts` шлёт свои CSP и `X-Robots-Tag`
  для `/embed/**`. Nginx их прячет (`proxy_hide_header`) и ставит свои.
- **X-Robots-Tag:** production — `noindex`; staging — `noindex, nofollow`.
- **Адрес без слеша:** `/embed/sistema` отдаёт 301 на `/embed/sistema/`.
- **Кэш:** зоны `keflab_embed` и `keflab_staging_embed`, 60 секунд, `use_stale` при падении Node.
  Кэшируются только адреса без query или с `theme=light` / `theme=dark` (map
  `$keflab_embed_nocache` в `conf.d/keflab-http.conf`). Остальные запросы идут мимо кэша,
  поэтому произвольный query не раздувает зону. Лог — `keflab_main`.
- **Staging:** basic auth остаётся. Виджет на staging снаружи не встраивают, а браузеры обычно не
  показывают запрос пароля внутри чужой iframe, поэтому чужая страница его не загрузит.
- **Проверка:** `npm run check:deploy` проверяет, что `frame-ancestors *` есть только в наборе
  виджета и только в `^~ /embed/`, что в CSP виджета нет Метрики, и что `X-Robots-Tag` стоит.
  Самопроверка скрипта подменяет текст конфигов в памяти и требует, чтобы каждая подмена
  была замечена. Файлы при этом не меняются.

## Известные ограничения и TODO

- **CSP `style-src 'unsafe-inline'`** — TODO: Nuxt выводит inline `<style>` на каждой
  странице и `style=""` в SSR. Хэши стилей пока не делаем.
- **`frame-src https://mc.yandex.ru`** для Метрики — проверить в браузере после включения
  счётчика; при появлении других хостов Метрики дополнить `script-src`/`connect-src`/`img-src`.
- **script-src хэши** пересчитываются при каждом выпуске (`deploy/scripts/csp-hashes.mjs`).
  Для `/embed/` тот же набор хэшей, см. раздел «Виджет /embed/» ниже.
- **Хэши виджета на релизе.** Шаг сборки в `deploy.yml` снимает inline-скрипты с SSR главной,
  `/embed/sistema/` и его вариантов `?theme=light` и `?theme=dark`, и передаёт все файлы в
  `csp-hashes.mjs generate`. Пробный запуск в `activate.sh` проверяет CSP тех же страниц тем
  же файлом хэшей. Сейчас набор у главной и виджета совпадает, но проверка нужна на случай
  будущих отличий.
- **nginx локально не проверен**: на машине разработки нет nginx. Конфиги проверяются
  логикой (`check-deploy.mjs`); синтаксис — `sudo nginx -t` на VPS. Директивы
  `error_log` в location и `listen … ssl http2` (до nginx 1.25.1) проверяются там же.
- **systemd-песочница** (`IPAddressDeny`, `SystemCallFilter=@system-service`) проверена
  синтаксически (`systemd-analyze verify`); поведение Node — при первом запуске на VPS.
  Внешние адреса сервер не открывает: Метрика грузится браузером пользователя.
- **Публичная проверка через Nginx** в activate.sh — только production.
- **Кэш главной.** Главная кэшируется на 60 секунд. Старый HTML из кэша может ссылаться на
  чанки прошлого релиза на минуту после выпуска — это допустимо.
- **Пробный запуск** выполняется на порту `PORT+1000`: production 4000, staging 4001.
- **GeoIP не проверен на nginx.** Директивы `geoip2`, `proxy_cache_key` с переменной и
  `limit_req_zone` с переменной ключа написаны по документации модуля и nginx, но `nginx -t` на
  машине разработки не запускался. Проверка — `sudo nginx -t` на VPS.
- **Кэш главной разделён по стране** (`proxy_cache_key` с `$keflab_geo_country`). Если главная
  от страны не зависит, кэш просто делится на варианты. Предсобранные страницы из `.output/public`
  Node не обслуживает: страны в них нет. Если офферы будут в статике, решать на шаге 13, а не здесь.
- **Заголовок страны при GEO_HEADER_TRUSTED не `true`** приложение не использует: страна неизвестна,
  офферов нет (безопасный отказ).
- **`keflab-offers` и `shellcheck`.** `shellcheck` на машине разработки не установлен, поэтому
  проверены `bash -n` и песочница на временных путях (`KEFLAB_OFFERS_SANDBOX=1`). Песочница
  в root-ветке не действует: под root пути фиксированы.
- **GeoIP не проверен на nginx.** Директивы `geoip2`, `proxy_cache_key` с переменной и
  `limit_req_zone` с переменной ключа написаны по документации модуля и nginx, но `nginx -t` на
  машине разработки не запускался. Проверка — `sudo nginx -t` на VPS.
- **Кэш главной разделён по стране** (`proxy_cache_key` с `$keflab_geo_country`). Если главная
  от страны не зависит, кэш просто делится на варианты. Предсобранные страницы из `.output/public`
  Node не обслуживает: страны в них нет. Если офферы будут в статике, решать на шаге 13, а не здесь.
- **Заголовок страны при GEO_HEADER_TRUSTED=false** приложение не использует: страна неизвестна,
  офферов нет (безопасный отказ).
- **`keflab-offers` и `shellcheck`.** `shellcheck` на машине разработки не установлен, поэтому
  проверены `bash -n` и песочница на временных путях (`KEFLAB_OFFERS_SANDBOX=1`). Песочница
  в root-ветке не действует: под root пути фиксированы.

## Структура деплоя

```
deploy/
  nginx/        keflab.ru.conf, staging.keflab.ru.conf, conf.d/, snippets/, default-reject.conf
  systemd/      keflab.service, keflab-staging.service
  scripts/      activate.sh, rollback.sh, remote-rollback.sh, lib.sh,
                csp-hashes.mjs, check-cert.sh, check-availability.sh, check-deploy.mjs
  sbin/         keflab-install-csp, keflab-offers (root, /usr/local/sbin)
  sudoers/      keflab-deploy
.github/workflows/deploy.yml
.env.example
```

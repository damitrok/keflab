// Логические проверки деплоя без nginx, systemd и VPS.
// Запуск: npm run check:deploy (или node deploy/scripts/check-deploy.mjs)
// Проверяет:
//   - bash -n для всех deploy/scripts/*.sh, deploy/sbin/* и скриптов, встроенных в deploy.yml;
//   - shellcheck, если установлен (иначе пропуск с сообщением);
//   - deploy.yml: YAML; сборка без environment и секретов; деплой без npm; actions только из actions/;
//     проверка ключа хоста строгая;
//   - nginx: заголовки безопасности в каждом location HTTPS-сервера (включая www), include CSP
//     только из /etc/nginx/keflab/csp (никогда из /srv), в return нет $uri, /go пишет лог без IP,
//     error_log /go — crit, /api/error с limit_req и только POST, главная кэшируется без параметров;
//   - nginx, виджет /embed/ (шаг 12): frame-ancestors * только в security-headers-embed.conf и только
//     в location ^~ /embed/; везде остальное — frame-ancestors 'none'; в CSP /embed/ нет Метрики;
//     X-Robots-Tag noindex; кэш /embed/ только для пустого query и theme=light|dark;
//   - самопроверка: проверки гоняются на копиях текста с намеренными ошибками (мутации),
//     каждая мутация обязана быть обнаружена; сами файлы не меняются;
//   - systemd: перезапуск, непривилегированный пользователь, изоляция сети и процесса;
//   - sudoers: deploy не может сам вызвать nginx или reload nginx;
//   - root-утилита CSP: только строгий шаблон хэша и откат при ошибке nginx -t.
//   - GeoIP (шаг 13): X-Keflab-Country задаётся только в snippets/proxy-node.conf и попадает в каждый
//     location с proxy_pass; geoip2 или запасной map — ровно одно; env: GEO_HEADER_TRUSTED=true.
//   - лимиты limit_req (/go, /api/error, /api/stat): один ключ $keflab_limit_key — IPv4 /24, IPv6 /64;
//     /api/stat: location = в каждом HTTPS-сервере, POST, тело до 1k, лог без IP.
//   - /go/: без кэша (302 не кэшируются), регулярное выражение редиректа на слеш исключает go/.
//   - keflab-offers: bash -n, режим, root-ветка с фиксированными путями, нет в sudoers deploy.
// Не заменяет nginx -t: синтаксис конфигов nginx проверяет только сам nginx.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const failures = []
const notes = []

function fail(message) {
  failures.push(message)
}

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

function bashCheck(label, text) {
  const result = spawnSync('bash', ['-n'], { input: text, encoding: 'utf8' })
  if (result.status !== 0) fail(`bash -n: ${label}: ${result.stderr.trim()}`)
}

function shellcheckAll(files) {
  const probe = spawnSync('shellcheck', ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) {
    notes.push('shellcheck не установлен: пропущен')
    return
  }
  const result = spawnSync('shellcheck', files, { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) fail(`shellcheck:\n${result.stdout}${result.stderr}`)
}

// --- Shell-скрипты ---
const scriptDir = join(ROOT, 'deploy/scripts')
const shFiles = readdirSync(scriptDir)
  .filter((f) => f.endsWith('.sh'))
  .map((f) => `deploy/scripts/${f}`)
const sbinFiles = ['deploy/sbin/keflab-install-csp', 'deploy/sbin/keflab-offers']
for (const file of [...shFiles, ...sbinFiles]) bashCheck(file, read(file))
shellcheckAll([...shFiles, ...sbinFiles])

// activate.sh не должен выполнять env-файл как shell.
const activate = read('deploy/scripts/activate.sh')
// Пробный запуск проверяет CSP виджета тем же способом, что и главную (шаг 12).
for (const page of ['"/"', '"/embed/sistema/"', '"/embed/sistema/?theme=light"']) {
  if (!activate.includes(`trial_csp_ok ${page}`)) {
    fail(`activate.sh: пробный запуск не проверяет CSP страницы ${page}`)
  }
}
if (/^\s*\.\s+"?\$ENV_FILE/m.test(activate) || /\bset\s+-a\b/.test(activate)) {
  fail('activate.sh: env-файл подключается как shell (нужен построчный разбор)')
}

// --- Root-утилита CSP ---
const sbin = read('deploy/sbin/keflab-install-csp')
if (!sbin.includes("'sha256-[A-Za-z0-9+/]{43}='"))
  fail('keflab-install-csp: нет строгого шаблона хэша')
if (!sbin.includes('/etc/nginx/keflab/csp'))
  fail('keflab-install-csp: файл пишется не в /etc/nginx/keflab/csp')
if (!sbin.includes('/usr/sbin/nginx -t')) fail('keflab-install-csp: нет проверки nginx -t')
if (!/mv -f "\$backup" "\$dst"/.test(sbin))
  fail('keflab-install-csp: нет возврата прежнего файла при ошибке')
if (/\beval\b/.test(sbin)) fail('keflab-install-csp: eval запрещён')

// --- Root-утилита keflab-offers (срочное выключение офферов, шаг 13) ---
const OFFERS_UTIL = 'deploy/sbin/keflab-offers'
for (const problem of offersUtilProblems(read(OFFERS_UTIL), statSync(join(ROOT, OFFERS_UTIL)).mode))
  fail(`${OFFERS_UTIL}: ${problem}`)

/** Проверки текста и режима root-утилиты keflab-offers. Возвращает список проблем. */
function offersUtilProblems(text, mode) {
  const problems = []
  if (!text.startsWith('#!/usr/bin/env bash\n')) problems.push('нет shebang bash')
  if (!/^set -Eeuo pipefail$/m.test(text)) problems.push('нет set -Eeuo pipefail')
  if (/\beval\b/.test(text)) problems.push('eval запрещён')
  if (/^\s*(source|\.)\s+"?\$env_file/m.test(text) || /\bset\s+-a\b/.test(text))
    problems.push('env-файл подключается как shell (нужен только отбор строки OFFERS_ENABLED)')
  // Root-ветка: пути фиксированы. Переменные окружения для путей — только в песочнице без root.
  if (!/^\s*if \[\[ \$EUID -eq 0 \]\]; then$/m.test(text))
    problems.push('нет ветки root (EUID -eq 0)')
  if (!/^\s*env_file=\/etc\/keflab\/keflab\.env$/m.test(text))
    problems.push('в root-ветке путь к env-файлу не фиксирован')
  if (!/^\s*systemctl_bin=\/usr\/bin\/systemctl$/m.test(text))
    problems.push('в root-ветке systemctl не фиксирован')
  if (!/KEFLAB_OFFERS_SANDBOX/.test(text))
    problems.push('нет песочницы без root (KEFLAB_OFFERS_SANDBOX)')
  if (!/^\s*"\$systemctl_bin" restart keflab$/m.test(text))
    problems.push('нет перезапуска сервиса keflab')
  if (!/\bcp -p\b/.test(text) || !/\bmv -f\b/.test(text))
    problems.push('нет атомарной замены файла (cp -p и mv -f)')
  if (!/-L \$env_file/.test(text)) problems.push('нет проверки симлинка env-файла')
  if (!/--media-registered/.test(text)) problems.push('включение (on) без --media-registered')
  if ((mode & 0o111) === 0) problems.push('файл не исполняемый')
  if ((mode & 0o022) !== 0) problems.push('файл доступен на запись группе или остальным')
  return problems
}

/** Команда keflab-offers не должна быть в sudoers deploy: её запускает человек от root. */
function sudoersProblems(text) {
  return /keflab-offers/.test(stripComments(text))
    ? ['keflab-offers не добавлять в sudoers: команда запускается от root вручную']
    : []
}

// --- Workflow ---
const workflowPath = '.github/workflows/deploy.yml'
const workflowText = read(workflowPath)
for (const page of ['/embed/sistema/', '/embed/sistema/?theme=light']) {
  if (!workflowText.includes(`${page}`)) {
    fail(`${workflowPath}: хэши снимаются не со страницы ${page} (виджет)`)
  }
}
let workflow
try {
  const require = createRequire(join(ROOT, 'package.json'))
  const { parse } = require('yaml')
  workflow = parse(workflowText)
} catch (error) {
  fail(`${workflowPath}: не разбирается как YAML: ${error.message}`)
}
if (workflow) {
  const jobs = workflow.jobs ?? {}
  for (const [jobName, job] of Object.entries(jobs)) {
    for (const step of job.steps ?? []) {
      if (step.uses && !step.uses.startsWith('actions/')) {
        fail(`${workflowPath}: сторонний action в job ${jobName}: ${step.uses}`)
      }
      if (
        step.uses?.startsWith('actions/checkout') &&
        step.with?.['persist-credentials'] !== false
      ) {
        fail(`${workflowPath}: checkout в job ${jobName} без persist-credentials: false`)
      }
      if (typeof step.run === 'string') {
        // Тело heredoc, переданного на VPS, проверяем отдельно.
        const match = step.run.match(/<<'REMOTE'\n([\s\S]*?)\n\s*REMOTE/)
        if (match) {
          bashCheck(`${workflowPath} (скрипт на VPS)`, match[1].replace(/^ {10}/gm, ''))
        }
        bashCheck(`${workflowPath} (job ${jobName}, ${step.name ?? 'шаг'})`, step.run)
      }
    }
  }
  const build = jobs.build ?? {}
  const buildText = JSON.stringify(build)
  if (build.environment !== undefined)
    fail('deploy.yml: у job build есть environment (сборка получит секреты)')
  if (buildText.includes('secrets.')) fail('deploy.yml: в job build используются secrets')
  if (!buildText.includes('upload-artifact')) fail('deploy.yml: build не публикует артефакт')
  const deploy = jobs.deploy ?? {}
  const deployText = JSON.stringify(deploy)
  if (!deployText.includes('download-artifact')) fail('deploy.yml: deploy не скачивает артефакт')
  if (/npm (ci|run)/.test(deployText)) fail('deploy.yml: в job deploy запускается npm')
  if (deploy.environment === undefined) fail('deploy.yml: у job deploy нет environment')
  if (jobs.prepare?.permissions?.actions !== 'read')
    fail('deploy.yml: prepare без actions: read для проверки CI')
  if (!/gh api "?repos\//.test(workflowText))
    fail('deploy.yml: нет проверки CI через API для dispatch')
}
if (/StrictHostKeyChecking\s*=?\s*(no|accept-new)/.test(workflowText)) {
  fail(`${workflowPath}: отключена или ослаблена проверка ключа хоста`)
}
for (const secret of ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_SSH_KEY', 'DEPLOY_KNOWN_HOSTS']) {
  if (!workflowText.includes(`secrets.${secret}`)) fail(`${workflowPath}: нет secrets.${secret}`)
}

// --- sudoers ---
const sudoers = stripComments(read('deploy/sudoers/keflab-deploy'))
if (/\bnginx\b|reload/.test(sudoers))
  fail('sudoers: deploy не должен запускать nginx или reload напрямую')
if (!sudoers.includes('/usr/local/sbin/keflab-install-csp production')) {
  fail('sudoers: нет keflab-install-csp production')
}
for (const problem of sudoersProblems(read('deploy/sudoers/keflab-deploy')))
  fail(`sudoers: ${problem}`)

// --- Nginx ---
const SECURITY = 'snippets/security-headers.conf'
const EMBED = 'snippets/security-headers-embed.conf'
const EMBED_LOCATION = '^~ /embed/'
const EMBED_REDIRECT = '= /embed/sistema'
const SERVER_FILES = ['deploy/nginx/keflab.ru.conf', 'deploy/nginx/staging.keflab.ru.conf']
const SNIPPET_DIR = 'deploy/nginx/snippets'
const HEADERS_COMMON = [
  'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
  'X-Content-Type-Options "nosniff"',
  'Referrer-Policy "strict-origin-when-cross-origin"',
  'Permissions-Policy "camera=(), microphone=(), geolocation=()"',
]

function stripComments(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/** Блоки вида «<keyword> <arg> { ... }» с учётом вложенных фигурных скобок. */
function blocks(text, keyword) {
  const found = []
  // Ключевое слово — целым словом: `server_name` блоком не считается.
  const re = new RegExp(`\\b${keyword}(?=[\\s{])\\s*([^{};]*?)\\s*\\{`, 'g')
  let match
  while ((match = re.exec(text)) !== null) {
    let depth = 1
    let i = re.lastIndex
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++
      if (text[i] === '}') depth--
      i++
    }
    found.push({ header: match[1].trim(), body: text.slice(re.lastIndex, i - 1) })
  }
  return found
}

/** Location-блоки HTTPS-серверов (порт 80 отдаёт только ACME и редирект). */
function httpsServers(text) {
  return blocks(text, 'server').filter((server) => /\blisten\s+(\[::\]:)?443\b/.test(server.body))
}

/** Директивы CSP из add_header Content-Security-Policy: Map имя → значение. */
function cspDirectives(text) {
  const match = text.match(/add_header\s+Content-Security-Policy\s+"([^"]*)"/)
  if (!match) return null
  const directives = new Map()
  for (const part of match[1].split(';')) {
    const trimmed = part.trim()
    if (trimmed === '') continue
    const [name, ...values] = trimmed.split(/\s+/)
    directives.set(name, values.join(' '))
  }
  return directives
}

/** Общий набор заголовков (всё, кроме /embed/). Возвращает список проблем. */
function securitySnippetProblems(rawText) {
  const text = stripComments(rawText)
  const csp = cspDirectives(text)
  if (!csp) return ['нет Content-Security-Policy']
  const problems = []
  if (csp.get('frame-ancestors') !== "'none'") {
    problems.push("frame-ancestors должен быть 'none' (встраивание разрешено только для /embed/)")
  }
  for (const needle of [
    ...HEADERS_COMMON,
    'X-Frame-Options "DENY"',
    "default-src 'self'",
    'https://mc.yandex.ru',
    "frame-src 'self' https://mc.yandex.ru",
    "base-uri 'self'",
    "form-action 'self'",
    '$keflab_script_hashes',
  ]) {
    if (!text.includes(needle)) problems.push(`нет ${needle}`)
  }
  return problems
}

/** Набор для /embed/ (виджет). Возвращает список проблем. */
function embedSnippetProblems(rawText) {
  const text = stripComments(rawText)
  const csp = cspDirectives(text)
  if (!csp) return ['нет Content-Security-Policy']
  const problems = []
  if (csp.get('frame-ancestors') !== '*') problems.push('frame-ancestors должен быть *')
  for (const directive of [
    'default-src',
    'script-src',
    'style-src',
    'font-src',
    'object-src',
    'base-uri',
    'form-action',
  ]) {
    if (!csp.has(directive)) problems.push(`в CSP нет ${directive}`)
  }
  if (!(csp.get('script-src') ?? '').includes('$keflab_script_hashes')) {
    problems.push('script-src без $keflab_script_hashes (хэши inline-скриптов)')
  }
  if (csp.get('frame-src') !== "'none'") problems.push("frame-src должен быть 'none'")
  if (csp.get('connect-src') !== "'self'") problems.push("connect-src должен быть 'self'")
  if (/mc\.yandex\.ru/.test(text))
    problems.push('в embed-наборе есть mc.yandex.ru (Метрики в виджете нет)')
  if (/X-Frame-Options/i.test(text)) problems.push('X-Frame-Options на /embed/ запрещён')
  for (const needle of HEADERS_COMMON) {
    if (!text.includes(needle)) problems.push(`нет ${needle}`)
  }
  return problems
}

/** Файлы, где встречается frame-ancestors * (кроме набора /embed/). */
function frameAncestorsStarLeaks(sources) {
  return Object.keys(sources).filter(
    (file) => !file.endsWith(EMBED) && /frame-ancestors\s+\*/.test(stripComments(sources[file])),
  )
}

/** Карта кэша /embed/ и зоны в http-блоке. */
function httpEmbedProblems(httpStripped) {
  const problems = []
  const map = httpStripped.match(/map\s+\$args\s+\$keflab_embed_nocache\s*\{([^}]*)\}/)
  if (!map) {
    problems.push('нет map $args $keflab_embed_nocache')
  } else {
    const body = map[1]
    for (const key of ['""', '"theme=light"', '"theme=dark"']) {
      if (!body.includes(`${key}`) || !new RegExp(`${key}\\s+0;`).test(body)) {
        problems.push(`map $keflab_embed_nocache: ${key} должен давать 0`)
      }
    }
    if (!/default\s+1;/.test(body))
      problems.push('map $keflab_embed_nocache: default должен давать 1')
  }
  for (const zone of ['keflab_embed', 'keflab_staging_embed']) {
    if (!new RegExp(`keys_zone=${zone}:`).test(httpStripped)) {
      problems.push(`нет зоны кэша ${zone} (proxy_cache_path)`)
    }
  }
  return problems
}

/** Один location ^~ /embed/: что обязано в нём быть. */
function embedLocationProblems(where, body, isStaging) {
  const problems = []
  const node = isStaging ? 'keflab_staging_node' : 'keflab_node'
  const zone = isStaging ? 'keflab_staging_embed' : 'keflab_embed'
  if (!body.includes(EMBED)) problems.push(`${where}: нет ${EMBED}`)
  if (body.includes(SECURITY)) problems.push(`${where}: и ${SECURITY}, и embed — два CSP-заголовка`)
  if (/\bframe-ancestors\b/.test(body))
    problems.push(`${where}: CSP задаётся в сниппете, не в location`)
  if (/add_header\s+X-Frame-Options/.test(body))
    problems.push(`${where}: X-Frame-Options на /embed/ запрещён`)
  if (/mc\.yandex\.ru/.test(body)) problems.push(`${where}: Метрика в виджете запрещена`)
  if (!/proxy_hide_header\s+X-Frame-Options;/.test(body)) {
    problems.push(
      `${where}: Node может прислать X-Frame-Options, нет proxy_hide_header X-Frame-Options`,
    )
  }
  if (!/proxy_hide_header\s+X-Robots-Tag;/.test(body)) {
    problems.push(`${where}: нет proxy_hide_header X-Robots-Tag (дубль заголовка от Node)`)
  }
  if (!body.includes('proxy-node.conf')) problems.push(`${where}: нет proxy-node.conf`)
  if (!body.includes(`proxy_pass http://${node};`))
    problems.push(`${where}: proxy_pass не на ${node}`)
  if (isStaging) {
    if (/auth_basic\s+off/.test(body)) problems.push(`${where}: basic auth на staging отключён`)
    if (!body.includes('staging-noindex.conf'))
      problems.push(`${where}: нет noindex, nofollow (staging)`)
  } else if (!/add_header\s+X-Robots-Tag\s+"noindex"/.test(body)) {
    problems.push(`${where}: нет X-Robots-Tag noindex`)
  }
  if (!/access_log\s+\S+\s+keflab_main;/.test(body)) problems.push(`${where}: лог не keflab_main`)
  if (!body.includes(`proxy_cache ${zone};`)) problems.push(`${where}: кэш не ${zone}`)
  if (!body.includes('proxy_cache_bypass $keflab_embed_nocache;')) {
    problems.push(`${where}: нет proxy_cache_bypass $keflab_embed_nocache`)
  }
  if (!body.includes('proxy_no_cache $keflab_embed_nocache;')) {
    problems.push(`${where}: нет proxy_no_cache $keflab_embed_nocache`)
  }
  if (
    !body.includes(
      'proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;',
    )
  ) {
    problems.push(`${where}: нет use_stale при падении Node`)
  }
  return problems
}

/** Проверки одного файла сервера (prod или staging). Возвращает список проблем. */
function serverProblems(file, rawText, httpStripped) {
  const problems = []
  const text = stripComments(rawText)
  const isStaging = file.includes('staging')
  const cspInclude = isStaging
    ? '/etc/nginx/keflab/csp/staging.conf'
    : '/etc/nginx/keflab/csp/production.conf'
  if (!text.includes(`include ${cspInclude};`)) problems.push(`${file}: нет include ${cspInclude}`)

  // Ни один include nginx не указывает в /srv: туда пишет deploy.
  for (const line of text.split('\n')) {
    if (/^\s*include\s+\/srv\//.test(line)) {
      problems.push(`${file}: include из /srv запрещён: ${line.trim()}`)
    }
  }
  // Сниппеты берутся из репозитория: включённый файл обязан существовать.
  for (const match of text.matchAll(/include\s+\/etc\/nginx\/keflab\/snippets\/([^\s;]+);/g)) {
    if (!existsSync(join(ROOT, SNIPPET_DIR, match[1]))) {
      problems.push(`${file}: include несуществующего сниппета ${match[1]}`)
    }
  }

  if (/\breturn\b[^;]*\$uri\b/.test(text))
    problems.push(`${file}: $uri в return запрещён (CRLF в Location)`)
  if (/\badd_header\b[^;]*\$uri\b/.test(text)) problems.push(`${file}: $uri в add_header запрещён`)
  if (/X-Cache-Status/.test(text)) problems.push(`${file}: X-Cache-Status не должен уходить наружу`)
  if (/^\s*include\s+\S*brotli\.conf/m.test(text)) {
    problems.push(`${file}: brotli.conf подключён, а модуль по умолчанию не установлен`)
  }

  const servers = httpsServers(text)
  if (servers.length === 0) problems.push(`${file}: нет HTTPS-сервера`)
  const allLocations = servers.flatMap((server) => blocks(server.body, 'location'))
  const embedCount = allLocations.filter((loc) => loc.header === EMBED_LOCATION).length
  if (embedCount !== 1)
    problems.push(`${file}: нужен ровно один location ${EMBED_LOCATION}, найдено ${embedCount}`)

  for (const server of servers) {
    for (const loc of blocks(server.body, 'location')) {
      const where = `${file}: location ${loc.header}`
      const hasSecurity = loc.body.includes(SECURITY)
      const hasEmbed = loc.body.includes(EMBED)
      if (hasSecurity && hasEmbed) {
        problems.push(`${where}: и ${SECURITY}, и ${EMBED} — два CSP-заголовка`)
      }
      if (hasEmbed && loc.header !== EMBED_LOCATION) {
        problems.push(`${where}: ${EMBED} подключается только в location ${EMBED_LOCATION}`)
      }
      if (!hasSecurity && !hasEmbed) {
        problems.push(`${where}: без заголовков безопасности (${SECURITY})`)
      }
      if (isStaging && !loc.body.includes('staging-noindex.conf')) {
        problems.push(`${where}: без noindex (staging)`)
      }
      if (/\badd_header\b/.test(loc.body) && !hasSecurity && !hasEmbed) {
        problems.push(`${where}: задаёт add_header и теряет заголовки безопасности`)
      }
      // Каждый проксирующий location несёт X-Keflab-Country через proxy-node.conf (GeoIP, шаг 13).
      if (/\bproxy_pass\b/.test(loc.body) && !loc.body.includes('proxy-node.conf')) {
        problems.push(`${where}: proxy_pass без proxy-node.conf (нет X-Keflab-Country)`)
      }
      if (loc.header === '= /api/stat') {
        problems.push(...statLocationProblems(where, loc.body, isStaging))
      }
      if (loc.header === EMBED_LOCATION) {
        problems.push(...embedLocationProblems(where, loc.body, isStaging))
      }
      if (loc.header === EMBED_REDIRECT) {
        if (!/return\s+301\s+https:\/\/[^\s;]+\$keflab_slash_target;/.test(loc.body)) {
          problems.push(`${where}: редирект без слеша должен вести на $keflab_slash_target`)
        }
      }
      if (loc.header === '^~ /go/') {
        // 302 на оффер не кэшируются ни в Nginx, ни в браузере.
        if (!/\bproxy_cache\s+off;/.test(loc.body))
          problems.push(`${where}: /go без proxy_cache off`)
        if (!/proxy_no_cache\s+1;/.test(loc.body))
          problems.push(`${where}: /go без proxy_no_cache 1`)
        if (!/add_header\s+Cache-Control\s+"no-store"/.test(loc.body))
          problems.push(`${where}: /go без Cache-Control: no-store`)
        if (!/access_log\s+\S+\s+keflab_go;/.test(loc.body))
          problems.push(`${where}: /go без лога keflab_go`)
        if (!/error_log\s+\S+\s+crit;/.test(loc.body))
          problems.push(`${where}: /go без error_log ... crit`)
        if (!/limit_req\s+zone=keflab_go/.test(loc.body))
          problems.push(`${where}: /go без limit_req`)
        const noindex =
          loc.body.includes('X-Robots-Tag "noindex"') || loc.body.includes('staging-noindex.conf')
        if (!noindex) problems.push(`${where}: /go без X-Robots-Tag: noindex`)
      }
      if (loc.header === '= /api/error') {
        if (!/limit_req\s+zone=keflab_error\s+burst=10\s+nodelay;/.test(loc.body)) {
          problems.push(`${where}: без limit_req keflab_error burst=10 nodelay`)
        }
        if (!/limit_except\s+POST/.test(loc.body)) problems.push(`${where}: без limit_except POST`)
      }
      if (loc.header === '= /') {
        for (const needle of [
          'proxy_cache_key "$scheme$proxy_host$request_uri|$keflab_geo_country";',
          'proxy_cache_bypass $args;',
          'proxy_no_cache $args;',
          'proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;',
          'proxy_pass http://keflab',
        ]) {
          if (!loc.body.includes(needle)) problems.push(`${where}: главная без «${needle}»`)
        }
      }
      if (loc.header === '^~ /_nuxt/' && !loc.body.includes('immutable')) {
        problems.push(`${where}: без immutable`)
      }
    }
  }

  // /api/stat: ровно один location = и он на месте (exact-match перекрывает ^~ /api/).
  const statCount = allLocations.filter((loc) => loc.header === '= /api/stat').length
  if (statCount !== 1) {
    problems.push(`${file}: нужен ровно один location = /api/stat, найдено ${statCount}`)
  }
  if (!allLocations.some((loc) => loc.header === '^~ /go/')) {
    problems.push(`${file}: нет location ^~ /go/`)
  }
  // Редирект на слеш: регулярное выражение обязано исключать go/, api/ и _nuxt/ (иначе /go/<id> редиректится).
  const slashRedirect = allLocations.filter((loc) => loc.header.startsWith('~ ^/(?!'))
  if (slashRedirect.length !== 1) {
    problems.push(
      `${file}: нужен ровно один location редиректа на слеш, найдено ${slashRedirect.length}`,
    )
  } else if (!/\(\?!go\/\|api\/\|_nuxt\/\)/.test(slashRedirect[0].header)) {
    problems.push(`${file}: редирект на слеш не исключает go/, api/ или _nuxt/`)
  }

  // Кэш: каждая зона proxy_cache должна быть объявлена в keflab-http.conf (off — кэш выключен).
  for (const match of text.matchAll(/proxy_cache\s+(\S+);/g)) {
    if (match[1] === 'off') continue
    if (!new RegExp(`keys_zone=${match[1]}:`).test(httpStripped)) {
      problems.push(`${file}: proxy_cache ${match[1]} без keys_zone в keflab-http.conf`)
    }
  }

  const hasWwwRedirect = isStaging
    ? true
    : servers.some((s) => /server_name\s+www\.keflab\.ru/.test(s.body) && s.body.includes(SECURITY))
  if (!hasWwwRedirect) problems.push(`${file}: www-сервер без заголовков безопасности (HSTS)`)

  if (isStaging) {
    for (const needle of [
      'auth_basic "keflab staging";',
      'auth_basic_user_file /etc/nginx/keflab-staging.htpasswd;',
      'Disallow: /',
    ]) {
      if (!text.includes(needle)) problems.push(`${file}: нет «${needle}»`)
    }
  }
  return problems
}

// --- GeoIP и /api/stat (шаг 13) ---
const GEO_HEADER = 'proxy_set_header X-Keflab-Country $keflab_geo_country;'

/** Заголовок страны задаётся в proxy-node.conf (он включается в каждый location с proxy_pass). */
function proxyGeoProblems(rawText) {
  return stripComments(rawText).includes(GEO_HEADER)
    ? []
    : [`нет «${GEO_HEADER}»: приложение не получит страну`]
}

/** $keflab_geo_country: активный geoip2 (с базой MMDB) или запасной map, ровно одно. */
function geoProblems(httpStripped) {
  const problems = []
  const active =
    /geoip2\s+\/etc\/nginx\/keflab\/geo\/country\.mmdb\s*\{\s*\$keflab_geo_country\s+country\s+iso_code;\s*\}/.test(
      httpStripped,
    )
  const fallback = /\bmap\s+\S+\s+\$keflab_geo_country\s*\{/.test(httpStripped)
  if (!active && !fallback)
    problems.push('нет определения $keflab_geo_country (geoip2 или запасной map)')
  if (active && fallback) problems.push('$keflab_geo_country определён дважды (geoip2 и map)')
  if (fallback && !/default\s+""\s*;/.test(httpStripped)) {
    problems.push('запасной map $keflab_geo_country: default должен давать ""')
  }
  return problems
}

/**
 * Лимиты limit_req (/go, /api/error, /api/stat): один ключ $keflab_limit_key — IPv4 по /24,
 * IPv6 по /64 (первые четыре группы), IPv4-mapped как IPv4. Все зоны — от этого ключа.
 */
function httpLimitProblems(httpStripped) {
  const problems = []
  // Тело map заканчивается «}» в начале строки; внутри regex есть свои «{1,3}».
  const mapMatch = httpStripped.match(/map\s+\$remote_addr\s+\$keflab_limit_key\s*\{([\s\S]*?)\n\}/)
  if (!mapMatch) {
    problems.push('нет map $remote_addr $keflab_limit_key (лимиты по /24 и /64)')
  } else {
    const body = mapMatch[1]
    for (const [needle, label] of [
      ['?<net>', 'IPv4 по /24 (группа net)'],
      ['?<v4>', 'IPv4-mapped (группа v4)'],
      ['?<p>', 'IPv6 по /64: первые четыре группы (группа p)'],
      ['$p;', 'IPv6 /64: результат $p'],
      ['$a1:0;', 'IPv6: «::» после трёх групп'],
      ['$a2:0:0;', 'IPv6: «::» после двух групп'],
      ['$a3:0:0:0;', 'IPv6: «::» после одной группы'],
      ['"~^::"', 'IPv6: «::» в начале'],
      ['default', 'default'],
    ]) {
      if (!body.includes(needle)) problems.push(`map $keflab_limit_key: нет ${label}`)
    }
    if (!/default\s+\$remote_addr;/.test(body)) {
      problems.push('map $keflab_limit_key: default должен быть $remote_addr (ключ не пустой)')
    }
  }
  for (const zone of [
    'keflab_go:10m\\s+rate=10r\\/s',
    'keflab_error:10m\\s+rate=1r\\/s',
    'keflab_stat:10m\\s+rate=5r\\/s',
  ]) {
    if (!new RegExp(`limit_req_zone\\s+\\$keflab_limit_key\\s+zone=${zone};`).test(httpStripped)) {
      problems.push(`нет зоны ${zone.replace(/\\/g, '')} по $keflab_limit_key`)
    }
  }
  if (/limit_req_zone\s+\$binary_remote_addr/.test(httpStripped)) {
    problems.push(
      'зона limit_req по $binary_remote_addr: лимит обходится из блока адресов (нужен $keflab_limit_key)',
    )
  }
  return problems
}

/** location = /api/stat: только POST, лимит, тело до 1k, лог без IP, проксирование с геозаголовком. */
function statLocationProblems(where, body, isStaging) {
  const problems = []
  const node = isStaging ? 'keflab_staging_node' : 'keflab_node'
  for (const [needle, label] of [
    ['limit_req zone=keflab_stat burst=20 nodelay;', 'limit_req keflab_stat burst=20 nodelay'],
    ['limit_req_status 429;', 'limit_req_status 429'],
    ['limit_except POST { deny all; }', 'limit_except POST { deny all; }'],
    ['client_max_body_size 1k;', 'client_max_body_size 1k (тело до 1 КБ)'],
    [`proxy_pass http://${node};`, `proxy_pass на ${node}`],
    ['proxy-node.conf', 'proxy-node.conf (геозаголовок)'],
    ['error_log', 'error_log'],
  ]) {
    if (!body.includes(needle)) problems.push(`${where}: нет ${label}`)
  }
  if (!body.includes(SECURITY)) problems.push(`${where}: нет ${SECURITY}`)
  if (!/access_log\s+\S+\s+keflab_go;/.test(body)) {
    problems.push(`${where}: лог не keflab_go (без IP и User-Agent)`)
  }
  if (/keflab_main|\$remote_addr|\$keflab_ip24/.test(body)) {
    problems.push(`${where}: в location /api/stat не должно быть лога или переменной с IP`)
  }
  if (!/error_log\s+\S+\s+crit;/.test(body)) problems.push(`${where}: error_log должен быть crit`)
  if (isStaging && !body.includes('staging-noindex.conf')) {
    problems.push(`${where}: без noindex (staging)`)
  }
  return problems
}

/** Окружение: геозаголовок включён, каталог статистики внутри ReadWritePaths. */
function envProblems(text) {
  const problems = []
  if (!/^GEO_HEADER_TRUSTED=true$/m.test(text)) problems.push('нет GEO_HEADER_TRUSTED=true')
  const stats = text.match(/^KEFLAB_STATS_DIR=(\S+)$/m)
  if (!stats) problems.push('нет KEFLAB_STATS_DIR')
  else if (!stats[1].startsWith('/srv/keflab/shared/')) {
    problems.push('KEFLAB_STATS_DIR вне /srv/keflab/shared (ReadWritePaths юнита production)')
  }
  return problems
}

const envText = read('.env.example')
for (const problem of envProblems(envText)) fail(`.env.example: ${problem}`)
const readmeText = read('README.md')
for (const needle of [
  'sudo /usr/local/sbin/keflab-offers off',
  'GEO_HEADER_TRUSTED',
  'KEFLAB_STATS_DIR',
]) {
  if (!readmeText.includes(needle)) fail(`README.md: нет «${needle}»`)
}

// Исходники nginx в deploy/nginx (для проверки «frame-ancestors * только в одном месте»).
function confFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return confFiles(path)
    return entry.name.endsWith('.conf') ? [path] : []
  })
}

const nginxSources = {}
for (const path of confFiles(join(ROOT, 'deploy/nginx'))) {
  nginxSources[relative(ROOT, path)] = readFileSync(path, 'utf8')
}

const httpText = stripComments(read('deploy/nginx/conf.d/keflab-http.conf'))

// Формат логов: /go без $remote_addr; основной лог — только маскированный IP.
const goFormat = httpText.match(/log_format\s+keflab_go\s+'([^']*)'/)
if (!goFormat) fail('keflab-http.conf: нет log_format keflab_go')
else if (goFormat[1].includes('$remote_addr') || goFormat[1].includes('$keflab_ip24')) {
  fail('keflab_go: в формате лога /go не должно быть IP')
}
if (/log_format\s+\w+[^;]*\$remote_addr/.test(httpText)) {
  fail('keflab-http.conf: $remote_addr в log_format запрещён (только $keflab_ip24)')
}
if (!/server_tokens\s+off;/.test(httpText))
  fail('keflab-http.conf: нет server_tokens off на уровне http')
if (!/access_log\s+\S+\s+keflab_main;/.test(httpText))
  fail('keflab-http.conf: нет access_log на уровне http')
if (!/map\s+\$request_uri\s+\$keflab_slash_target/.test(httpText)) {
  fail('keflab-http.conf: редирект на слеш должен строиться через map по $request_uri')
}
for (const problem of httpEmbedProblems(httpText)) fail(`keflab-http.conf: ${problem}`)
for (const problem of geoProblems(httpText)) fail(`keflab-http.conf: ${problem}`)
for (const problem of httpLimitProblems(httpText)) fail(`keflab-http.conf: ${problem}`)

const securityFile = `deploy/nginx/${SECURITY}`
const embedFile = `deploy/nginx/${EMBED}`
for (const problem of securitySnippetProblems(read(securityFile)))
  fail(`${securityFile}: ${problem}`)
for (const problem of embedSnippetProblems(read(embedFile))) fail(`${embedFile}: ${problem}`)
for (const leak of frameAncestorsStarLeaks(nginxSources)) {
  fail(`${leak}: frame-ancestors * разрешён только в ${embedFile}`)
}
if (!existsSync(join(ROOT, embedFile))) fail(`нет файла ${embedFile}`)

const proxy = stripComments(read('deploy/nginx/snippets/proxy-node.conf'))
if (!proxy.includes('X-Real-IP $remote_addr')) fail('proxy-node.conf: нет X-Real-IP $remote_addr')
if (!proxy.includes('X-Forwarded-For $remote_addr;')) {
  fail('proxy-node.conf: X-Forwarded-For должен быть $remote_addr, а не цепочкой')
}
for (const problem of proxyGeoProblems(read('deploy/nginx/snippets/proxy-node.conf')))
  fail(`proxy-node.conf: ${problem}`)
// Геозаголовок задаётся только в proxy-node.conf: в других местах он бы разошёлся с общим правилом.
/** Файлы, кроме proxy-node.conf, где задаётся заголовок страны. */
function geoHeaderLeaks(sources) {
  return Object.keys(sources).filter(
    (file) =>
      !file.endsWith('snippets/proxy-node.conf') &&
      /proxy_set_header\s+X-Keflab-Country\b/.test(stripComments(sources[file])),
  )
}
for (const leak of geoHeaderLeaks(nginxSources)) {
  fail(`${leak}: X-Keflab-Country задаётся только в proxy-node.conf`)
}

const reject = stripComments(read('deploy/nginx/default-reject.conf'))
if (!/listen 443 ssl default_server;[\s\S]*?return 444;/.test(reject)) {
  fail('default-reject.conf: на 443 нет return 444')
}

const serverTexts = {}
for (const file of SERVER_FILES) {
  serverTexts[file] = read(file)
  for (const problem of serverProblems(file, serverTexts[file], httpText)) fail(problem)
}

// --- systemd ---
const units = ['deploy/systemd/keflab.service', 'deploy/systemd/keflab-staging.service']
for (const unit of units) {
  const text = read(unit)
  for (const needle of [
    'Restart=always',
    'RestartSec=2',
    'User=keflab',
    'NoNewPrivileges=yes',
    'ProtectSystem=strict',
    'PrivateTmp=yes',
    'PrivateDevices=yes',
    'ProtectProc=invisible',
    'CapabilityBoundingSet=\n',
    'RestrictNamespaces=yes',
    'IPAddressDeny=any',
    'IPAddressAllow=localhost',
    'SystemCallFilter=@system-service',
    'EnvironmentFile=/etc/keflab/',
    'WorkingDirectory=/srv/keflab',
    'ExecStart=/opt/node-24/bin/node .output/server/index.mjs',
  ]) {
    if (!text.includes(needle)) fail(`${unit}: нет ${needle.trim()}`)
  }
  if (/^User=root/m.test(text)) fail(`${unit}: запуск от root`)
  // Каталог статистики (KEFLAB_STATS_DIR) должен быть записываем для процесса.
  const writable = unit.endsWith('keflab-staging.service')
    ? '/srv/keflab-staging/shared'
    : '/srv/keflab/shared'
  if (!new RegExp(`^ReadWritePaths=${writable}$`, 'm').test(text)) {
    fail(`${unit}: нет ReadWritePaths=${writable} (каталог статистики)`)
  }
}

// --- Файлы, без которых не работает выпуск ---
for (const file of [
  'deploy/nginx/snippets/csp-script-hashes.example.conf',
  'deploy/nginx/snippets/security-headers-embed.conf',
  'deploy/sudoers/keflab-deploy',
  'deploy/sbin/keflab-install-csp',
  'deploy/scripts/csp-hashes.mjs',
  '.env.example',
]) {
  if (!existsSync(join(ROOT, file))) fail(`нет файла ${file}`)
}

// --- Самопроверка: намеренные ошибки на копиях текста. Каждая обязана быть обнаружена. ---
function selfTest() {
  let detected = 0
  const expectDetected = (label, problems) => {
    if (problems.length === 0) fail(`самопроверка: мутация «${label}» не обнаружена`)
    else detected++
  }
  const mutate = (label, text, from, to) => {
    if (!text.includes(from)) {
      fail(`самопроверка: в «${label}» не найден фрагмент для мутации`)
      return null
    }
    return text.replace(from, () => to)
  }

  // 1. frame-ancestors * в общем сниппете.
  // Фрагмент — из самой строки CSP (в комментарии такой же текст тоже есть).
  const generalBad = mutate(
    'frame-ancestors * в общем сниппете',
    read(securityFile),
    "form-action 'self'; frame-ancestors 'none'\" always;",
    "form-action 'self'; frame-ancestors *\" always;",
  )
  if (generalBad !== null) {
    expectDetected('общий сниппет: набор', securitySnippetProblems(generalBad))
    expectDetected(
      'общий сниппет: утечка frame-ancestors *',
      frameAncestorsStarLeaks({ ...nginxSources, [securityFile]: generalBad }),
    )
  }

  // 2. Метрика попала в CSP виджета.
  const embedBad = mutate(
    'mc.yandex.ru в CSP /embed/',
    read(embedFile),
    "script-src 'self' $keflab_script_hashes",
    "script-src 'self' https://mc.yandex.ru $keflab_script_hashes",
  )
  if (embedBad !== null) expectDetected('Метрика в CSP /embed/', embedSnippetProblems(embedBad))

  // 3. Набор /embed/ подключён в обычном location (/api/) — два типа заголовков не по месту.
  const prodFile = 'deploy/nginx/keflab.ru.conf'
  const apiBad = mutate(
    'embed-набор в /api/',
    serverTexts[prodFile],
    'location ^~ /api/ {\n        include /etc/nginx/keflab/snippets/security-headers.conf;',
    'location ^~ /api/ {\n        include /etc/nginx/keflab/snippets/security-headers-embed.conf;',
  )
  if (apiBad !== null)
    expectDetected('embed-набор в /api/', serverProblems(prodFile, apiBad, httpText))

  // 4. Location виджета переименован: /embed/ остаётся без своего location.
  const renamedBad = mutate(
    'location /embed/ переименован',
    serverTexts[prodFile],
    'location ^~ /embed/ {',
    'location ^~ /embedx/ {',
  )
  if (renamedBad !== null)
    expectDetected('нет location /embed/', serverProblems(prodFile, renamedBad, httpText))

  // 5. На staging у /embed/ снят noindex.
  const stagingFile = 'deploy/nginx/staging.keflab.ru.conf'
  const noindexBad = mutate(
    'staging /embed/ без noindex',
    serverTexts[stagingFile],
    'security-headers-embed.conf;\n        include /etc/nginx/keflab/snippets/staging-noindex.conf;',
    'security-headers-embed.conf;',
  )
  if (noindexBad !== null)
    expectDetected('staging /embed/ без noindex', serverProblems(stagingFile, noindexBad, httpText))

  // 6. Кэш /embed/ открыт для любого query (default 0).
  const mapBad = mutate('карта кэша: default 0', httpText, 'default        1;', 'default        0;')
  if (mapBad !== null) expectDetected('карта кэша /embed/', httpEmbedProblems(mapBad))

  // 7. Нет bypass кэша у /embed/ с произвольным query.
  const bypassBad = mutate(
    '/embed/ без proxy_cache_bypass',
    serverTexts[prodFile],
    'proxy_cache_bypass $keflab_embed_nocache;',
    '',
  )
  if (bypassBad !== null)
    expectDetected('нет proxy_cache_bypass /embed/', serverProblems(prodFile, bypassBad, httpText))

  // 8. Node-заголовок X-Frame-Options не скрыт: виджет перестал бы встраиваться.
  const hideBad = mutate(
    '/embed/ без proxy_hide_header X-Frame-Options',
    serverTexts[prodFile],
    'proxy_hide_header X-Frame-Options;',
    '',
  )
  if (hideBad !== null)
    expectDetected(
      'нет proxy_hide_header X-Frame-Options',
      serverProblems(prodFile, hideBad, httpText),
    )

  // 9. Геозаголовок убран из proxy-node.conf: приложение не получит страну.
  const proxyRaw = read('deploy/nginx/snippets/proxy-node.conf')
  const geoHeaderBad = mutate('proxy-node без геозаголовка', proxyRaw, GEO_HEADER, '')
  if (geoHeaderBad !== null) expectDetected('нет геозаголовка', proxyGeoProblems(geoHeaderBad))

  // 10. Геозаголовок задан клиентским значением в обычном location.
  const geoFakeBad = mutate(
    'подделка геозаголовка в /api/',
    serverTexts[prodFile],
    'location ^~ /api/ {\n        include /etc/nginx/keflab/snippets/security-headers.conf;',
    'location ^~ /api/ {\n        include /etc/nginx/keflab/snippets/security-headers.conf;\n        proxy_set_header X-Keflab-Country "RU";',
  )
  if (geoFakeBad !== null) {
    expectDetected(
      'заголовок страны вне proxy-node.conf',
      geoHeaderLeaks({ ...nginxSources, [prodFile]: geoFakeBad }),
    )
  }

  // 11. Location с proxy_pass без proxy-node.conf: страна до Node не дойдёт.
  const noProxyBad = mutate(
    '/go без proxy-node.conf',
    serverTexts[prodFile],
    'proxy_pass http://keflab_node;\n        include /etc/nginx/keflab/snippets/proxy-node.conf;\n    }\n\n    # Хэшированные',
    'proxy_pass http://keflab_node;\n    }\n\n    # Хэшированные',
  )
  if (noProxyBad !== null) {
    expectDetected('proxy_pass без proxy-node.conf', serverProblems(prodFile, noProxyBad, httpText))
  }

  // 12. /api/stat: без limit_except POST.
  const statExceptBad = mutate(
    '/api/stat без limit_except',
    serverTexts[prodFile],
    'limit_req_status 429;\n        limit_except POST { deny all; }\n        client_max_body_size 1k;',
    'limit_req_status 429;\n        client_max_body_size 1k;',
  )
  if (statExceptBad !== null) {
    expectDetected('/api/stat без limit_except', serverProblems(prodFile, statExceptBad, httpText))
  }

  // 13. /api/stat пишет лог с IP (keflab_main вместо keflab_go).
  const statLogBad = mutate(
    '/api/stat с логом keflab_main',
    serverTexts[prodFile],
    'access_log /var/log/nginx/keflab-stat.access.log keflab_go;',
    'access_log /var/log/nginx/keflab-stat.access.log keflab_main;',
  )
  if (statLogBad !== null) {
    expectDetected('/api/stat с IP в логе', serverProblems(prodFile, statLogBad, httpText))
  }

  // 14. Редирект на слеш ловит /go/<id>: исключение go/ убрано.
  const slashBad = mutate(
    'редирект на слеш без исключения go/',
    serverTexts[prodFile],
    'location ~ ^/(?!go/|api/|_nuxt/)[^.]*[^/]$ {',
    'location ~ ^/(?!api/|_nuxt/)[^.]*[^/]$ {',
  )
  if (slashBad !== null) {
    expectDetected('редирект на слеш без go/', serverProblems(prodFile, slashBad, httpText))
  }

  // 15. /go кэширует 302: убран proxy_cache off.
  const goCacheBad = mutate(
    '/go без proxy_cache off',
    serverTexts[prodFile],
    'proxy_cache off;\n        proxy_no_cache 1;',
    'proxy_no_cache 1;',
  )
  if (goCacheBad !== null) {
    expectDetected('/go без proxy_cache off', serverProblems(prodFile, goCacheBad, httpText))
  }

  // 16. Геоопределение: база указана не та (geoip2 не распознан).
  const geoDbBad = mutate(
    'geoip2 с другой базой',
    httpText,
    'geoip2 /etc/nginx/keflab/geo/country.mmdb {',
    'geoip2 /etc/nginx/keflab/geo/other.mmdb {',
  )
  if (geoDbBad !== null) expectDetected('geoip2 с другой базой', geoProblems(geoDbBad))

  // 17. Кэш главной не разделён по стране.
  const cacheKeyBad = mutate(
    'главная без cache key по стране',
    serverTexts[prodFile],
    'proxy_cache_key "$scheme$proxy_host$request_uri|$keflab_geo_country";',
    '',
  )
  if (cacheKeyBad !== null) {
    expectDetected(
      'главная без cache key по стране',
      serverProblems(prodFile, cacheKeyBad, httpText),
    )
  }

  // 18. keflab-offers: убрана root-ветка (пути станут зависеть от окружения).
  const offersText = read('deploy/sbin/keflab-offers')
  const rootBad = mutate(
    'keflab-offers без root-ветки',
    offersText,
    'if [[ $EUID -eq 0 ]]; then',
    'if true; then',
  )
  if (rootBad !== null)
    expectDetected('keflab-offers без root-ветки', offersUtilProblems(rootBad, 0o755))

  // 19. keflab-offers: eval внутри утилиты root.
  const evalBad = mutate(
    'keflab-offers с eval',
    offersText,
    'case $cmd in',
    'eval "true"\ncase $cmd in',
  )
  if (evalBad !== null) expectDetected('keflab-offers с eval', offersUtilProblems(evalBad, 0o755))

  // 20. keflab-offers: доступна на запись группе (режим 0775).
  expectDetected('keflab-offers режим 0775', offersUtilProblems(offersText, 0o775))

  // 21. keflab-offers добавлена в sudoers deploy.
  const sudoersBad = read('deploy/sudoers/keflab-deploy') + '\n/usr/local/sbin/keflab-offers off\n'
  expectDetected('keflab-offers в sudoers', sudoersProblems(sudoersBad))

  // 23. Лимит /go снова по полному адресу ($binary_remote_addr): блок адресов обходит лимит.
  const limitGoBad = mutate(
    'зона keflab_go по $binary_remote_addr',
    httpText,
    'limit_req_zone $keflab_limit_key zone=keflab_go:10m rate=10r/s;',
    'limit_req_zone $binary_remote_addr zone=keflab_go:10m rate=10r/s;',
  )
  if (limitGoBad !== null)
    expectDetected('зона keflab_go по полному адресу', httpLimitProblems(limitGoBad))

  // 24. IPv6 без группировки по /64: результат $p заменён на полный адрес.
  const limitV6Bad = mutate('IPv6 без /64', httpText, '$p;', '$remote_addr;')
  if (limitV6Bad !== null) expectDetected('IPv6 без /64', httpLimitProblems(limitV6Bad))

  // 25. Ключ лимита пустой по умолчанию: default убран.
  const limitDefBad = mutate('default ключа лимита', httpText, '$remote_addr;\n}', '\n}')
  if (limitDefBad !== null)
    expectDetected('нет default в ключе лимита', httpLimitProblems(limitDefBad))

  // 22. .env.example: геозаголовок выключен.
  const envBad = mutate(
    '.env.example: GEO_HEADER_TRUSTED=false',
    envText,
    'GEO_HEADER_TRUSTED=true',
    'GEO_HEADER_TRUSTED=false',
  )
  if (envBad !== null) expectDetected('GEO_HEADER_TRUSTED выключен', envProblems(envBad))

  return detected
}

const selfTestCount = selfTest()

for (const note of notes) console.log(`заметка: ${note}`)
if (failures.length > 0) {
  console.error(`\nПроверка деплоя не пройдена (${failures.length}):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(
  `Проверка деплоя: ок (${shFiles.length + sbinFiles.length} shell-скриптов, workflow, nginx, systemd, sudoers, самопроверка: ${selfTestCount} мутаций обнаружено)`,
)

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
//   - systemd: перезапуск, непривилегированный пользователь, изоляция сети и процесса;
//   - sudoers: deploy не может сам вызвать nginx или reload nginx;
//   - root-утилита CSP: только строгий шаблон хэша и откат при ошибке nginx -t.
// Не заменяет nginx -t: синтаксис конфигов nginx проверяет только сам nginx.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
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
const sbinFiles = ['deploy/sbin/keflab-install-csp']
for (const file of [...shFiles, ...sbinFiles]) bashCheck(file, read(file))
shellcheckAll([...shFiles, ...sbinFiles])

// activate.sh не должен выполнять env-файл как shell.
const activate = read('deploy/scripts/activate.sh')
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

// --- Workflow ---
const workflowPath = '.github/workflows/deploy.yml'
const workflowText = read(workflowPath)
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

// --- Nginx ---
const SECURITY = 'snippets/security-headers.conf'

function stripComments(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/** Блоки вида «<keyword> <arg> { ... }» с учётом вложенных фигурных скобок. */
function blocks(text, keyword) {
  const found = []
  const re = new RegExp(`\\b${keyword}\\s*([^{]*?)\\s*\\{`, 'g')
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

const SERVER_FILES = ['deploy/nginx/keflab.ru.conf', 'deploy/nginx/staging.keflab.ru.conf']
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
if (!/limit_req_zone\s+\$binary_remote_addr\s+zone=keflab_error:10m\s+rate=1r\/s;/.test(httpText)) {
  fail('keflab-http.conf: нет зоны keflab_error 1r/s')
}

const security = stripComments(read(`deploy/nginx/${SECURITY}`))
for (const needle of [
  "default-src 'self'",
  'https://mc.yandex.ru',
  'frame-src https://mc.yandex.ru',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  '$keflab_script_hashes',
  'Strict-Transport-Security',
  'X-Content-Type-Options "nosniff"',
  'Referrer-Policy "strict-origin-when-cross-origin"',
  'Permissions-Policy "camera=(), microphone=(), geolocation=()"',
]) {
  if (!security.includes(needle)) fail(`security-headers.conf: нет ${needle}`)
}

const proxy = stripComments(read('deploy/nginx/snippets/proxy-node.conf'))
if (!proxy.includes('X-Real-IP $remote_addr')) fail('proxy-node.conf: нет X-Real-IP $remote_addr')
if (!proxy.includes('X-Forwarded-For $remote_addr;')) {
  fail('proxy-node.conf: X-Forwarded-For должен быть $remote_addr, а не цепочкой')
}

const reject = stripComments(read('deploy/nginx/default-reject.conf'))
if (!/listen 443 ssl default_server;[\s\S]*?return 444;/.test(reject)) {
  fail('default-reject.conf: на 443 нет return 444')
}

for (const file of SERVER_FILES) {
  const text = stripComments(read(file))
  const isStaging = file.includes('staging')
  const cspInclude = isStaging
    ? '/etc/nginx/keflab/csp/staging.conf'
    : '/etc/nginx/keflab/csp/production.conf'
  if (!text.includes(`include ${cspInclude};`)) fail(`${file}: нет include ${cspInclude}`)

  // Ни один include nginx не указывает в /srv: туда пишет deploy.
  for (const line of text.split('\n')) {
    if (/^\s*include\s+\/srv\//.test(line))
      fail(`${file}: include из /srv запрещён: ${line.trim()}`)
  }

  if (/\breturn\b[^;]*\$uri\b/.test(text)) fail(`${file}: $uri в return запрещён (CRLF в Location)`)
  if (/\badd_header\b[^;]*\$uri\b/.test(text)) fail(`${file}: $uri в add_header запрещён`)
  if (/X-Cache-Status/.test(text)) fail(`${file}: X-Cache-Status не должен уходить наружу`)
  if (/\bbrotli\.conf\b/.test(text.replace(/^.*brotli\.conf.*$/gm, (line) => line))) {
    if (/^\s*include\s+\S*brotli\.conf/m.test(text)) {
      fail(`${file}: brotli.conf подключён, а модуль по умолчанию не установлен`)
    }
  }

  for (const server of httpsServers(text)) {
    for (const loc of blocks(server.body, 'location')) {
      if (!loc.body.includes(SECURITY)) {
        fail(`${file}: location ${loc.header} без заголовков безопасности (${SECURITY})`)
      }
      if (isStaging && !loc.body.includes('staging-noindex.conf')) {
        fail(`${file}: location ${loc.header} без noindex (staging)`)
      }
      if (/\badd_header\b/.test(loc.body) && !loc.body.includes(SECURITY)) {
        fail(`${file}: location ${loc.header} задаёт add_header и теряет заголовки безопасности`)
      }
      if (loc.header === '^~ /go/') {
        if (!/access_log\s+\S+\s+keflab_go;/.test(loc.body)) fail(`${file}: /go без лога keflab_go`)
        if (!/error_log\s+\S+\s+crit;/.test(loc.body)) fail(`${file}: /go без error_log ... crit`)
        if (!/limit_req\s+zone=keflab_go/.test(loc.body)) fail(`${file}: /go без limit_req`)
        const noindex =
          loc.body.includes('X-Robots-Tag "noindex"') || loc.body.includes('staging-noindex.conf')
        if (!noindex) fail(`${file}: /go без X-Robots-Tag: noindex`)
      }
      if (loc.header === '= /api/error') {
        if (!/limit_req\s+zone=keflab_error\s+burst=10\s+nodelay;/.test(loc.body)) {
          fail(`${file}: /api/error без limit_req keflab_error burst=10 nodelay`)
        }
        if (!/limit_except\s+POST/.test(loc.body)) fail(`${file}: /api/error без limit_except POST`)
      }
      if (loc.header === '= /') {
        for (const needle of [
          'proxy_cache_bypass $args;',
          'proxy_no_cache $args;',
          'proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;',
          'proxy_pass http://keflab',
        ]) {
          if (!loc.body.includes(needle)) fail(`${file}: главная без «${needle}»`)
        }
      }
      if (loc.header === '^~ /_nuxt/' && !loc.body.includes('immutable')) {
        fail(`${file}: /_nuxt/ без immutable`)
      }
    }
  }

  const hasWwwRedirect = isStaging
    ? true
    : httpsServers(text).some(
        (s) => /server_name\s+www\.keflab\.ru/.test(s.body) && s.body.includes(SECURITY),
      )
  if (!hasWwwRedirect) fail(`${file}: www-сервер без заголовков безопасности (HSTS)`)

  if (isStaging) {
    for (const needle of [
      'auth_basic "keflab staging";',
      'auth_basic_user_file /etc/nginx/keflab-staging.htpasswd;',
      'Disallow: /',
    ]) {
      if (!text.includes(needle)) fail(`${file}: нет «${needle}»`)
    }
  }
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
}

// --- Файлы, без которых не работает выпуск ---
for (const file of [
  'deploy/nginx/snippets/csp-script-hashes.example.conf',
  'deploy/sudoers/keflab-deploy',
  'deploy/sbin/keflab-install-csp',
  'deploy/scripts/csp-hashes.mjs',
  '.env.example',
]) {
  if (!existsSync(join(ROOT, file))) fail(`нет файла ${file}`)
}

for (const note of notes) console.log(`заметка: ${note}`)
if (failures.length > 0) {
  console.error(`\nПроверка деплоя не пройдена (${failures.length}):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(
  `Проверка деплоя: ок (${shFiles.length + sbinFiles.length} shell-скриптов, workflow, nginx, systemd, sudoers)`,
)

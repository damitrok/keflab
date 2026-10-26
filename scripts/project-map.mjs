// Карта проекта и граф зависимостей. Генерируется из кода, поэтому не
// устаревает: `npm run map` пишет docs/PROJECT_MAP.md и docs/project-map.html,
// `npm run map:check` (в CI) падает, если карта не соответствует коду.
//
// Что учитывается: явные импорты (`~/`, `#shared/`, относительные, JSON из
// data/), автоимпорт компонентов Nuxt по тегам в шаблоне (<LegalAgeMark />,
// <LazyCalcSystemCalculator />) и автоимпорт composables (вызов useXxx()
// без import). Маршруты — из app/pages по правилам Nuxt.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCAN = ['app', 'server', 'shared', 'data']
const EXT = /\.(vue|ts|json)$/
const SKIP =
  /(^|\/)(node_modules|\.nuxt|\.output)(\/|$)|\.d\.ts$|^data\/schema\.ts$|^shared\/lastmod\.json$/

// ---------- сбор файлов ----------

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(join(ROOT, dir))
  } catch {
    return out
  }
  for (const name of entries.sort()) {
    const rel = `${dir}/${name}`
    if (SKIP.test(rel)) continue
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out)
    else if (EXT.test(name)) out.push(rel)
  }
  return out
}

export function collectFiles() {
  const files = SCAN.flatMap((d) => walk(d))
  // data/schema.ts — тоже модуль (его импортируют проверки), но пропущен выше
  // ради порядка; вернём его отдельно.
  return [...files, 'data/schema.ts'].sort()
}

// ---------- классификация ----------

export function kindOf(file) {
  if (file.startsWith('app/pages/')) return 'страница'
  if (file.startsWith('app/layouts/')) return 'макет'
  if (file.startsWith('app/components/')) return 'компонент'
  if (file.startsWith('app/composables/')) return 'composable'
  if (file.startsWith('app/plugins/')) return 'плагин'
  if (file.startsWith('app/lib/calc/')) return 'движок расчётов'
  if (file.startsWith('app/lib/')) return 'библиотека'
  if (file.startsWith('app/')) return 'приложение'
  if (file.startsWith('server/api/')) return 'API'
  if (file.startsWith('server/routes/')) return 'серверный маршрут'
  if (file.startsWith('server/plugins/')) return 'серверный плагин'
  if (file.startsWith('server/middleware/')) return 'middleware'
  if (file.startsWith('server/utils/')) return 'серверная утилита'
  if (file.startsWith('shared/')) return 'общий модуль'
  if (file.startsWith('data/')) return 'данные'
  return 'прочее'
}

// ---------- маршруты ----------

/** app/pages/sistema-[k]-iz-[n].vue → /sistema-:k-iz-:n/ */
export function routeOf(file) {
  if (!file.startsWith('app/pages/') || !file.endsWith('.vue')) return null
  let p = file.slice('app/pages'.length, -'.vue'.length)
  p = p.replace(/\/index$/, '/')
  p = p.replace(/\[\.\.\.(\w+)\]/g, '*').replace(/\[(\w+)\]/g, ':$1')
  return p.endsWith('/') ? p : `${p}/`
}

// ---------- имена компонентов Nuxt ----------

const pascal = (s) =>
  s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')

/** app/components/legal/AgeMark.vue → LegalAgeMark; calc/CalcForm.vue → CalcForm. */
export function componentName(file) {
  const parts = file.slice('app/components/'.length, -'.vue'.length).split('/').map(pascal)
  const fileName = parts.pop()
  // Nuxt убирает повторы: если имя файла начинается с имени каталога — каталог не дублируется.
  let prefix = ''
  for (const dir of parts) {
    const candidate = prefix + dir
    if (fileName.startsWith(dir) || fileName.startsWith(candidate)) continue
    prefix = candidate
  }
  const name = fileName.startsWith(prefix) ? fileName : prefix + fileName
  return name === 'Index' ? pascal(parts.join('-') || 'Index') : name
}

// ---------- разбор файла ----------

function scriptPart(file, text) {
  if (!file.endsWith('.vue')) return text
  return [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
}

function templatePart(file, text) {
  if (!file.endsWith('.vue')) return ''
  const m = text.match(/<template>([\s\S]*)<\/template>/)
  return m ? m[1] : ''
}

/**
 * Краткое описание модуля — комментарий в самом начале файла (до импортов и
 * кода). Если его нет — берётся из docs/map-descriptions.json.
 */
export function describe(file, text) {
  if (file.endsWith('.json')) return ''
  const code = scriptPart(file, text)
  const lines = code.split('\n')
  const out = []
  let inBlock = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!inBlock && line === '') {
      if (out.length) break
      continue
    }
    if (line.startsWith('/*')) {
      inBlock = true
      const rest = line.replace(/^\/\*+\s?/, '').replace(/\*\/\s*$/, '')
      if (rest) out.push(rest)
      if (line.endsWith('*/')) break
      continue
    }
    if (inBlock) {
      if (line.endsWith('*/')) {
        const rest = line.replace(/\*\/$/, '').replace(/^\*\s?/, '')
        if (rest) out.push(rest)
        break
      }
      out.push(line.replace(/^\*\s?/, ''))
      continue
    }
    if (line.startsWith('//')) {
      out.push(line.replace(/^\/\/\s?/, ''))
      continue
    }
    break
  }
  const textOut = out.join(' ').replace(/\s+/g, ' ').trim()
  // Только первое предложение — для таблиц.
  const first = textOut.match(/^.*?[.!?](\s|$)/)
  return (first ? first[0] : textOut).trim().slice(0, 220)
}

function resolveImport(from, spec, files) {
  let base
  if (spec.startsWith('~/') || spec.startsWith('@/')) base = `app/${spec.slice(2)}`
  else if (spec.startsWith('#shared/')) base = `shared/${spec.slice('#shared/'.length)}`
  else if (spec.startsWith('.'))
    base = relative(ROOT, resolve(ROOT, dirname(from), spec))
      .split(sep)
      .join('/')
  else return null
  const candidates = [base, `${base}.ts`, `${base}.vue`, `${base}/index.ts`, `${base}.json`]
  return candidates.find((c) => files.has(c)) ?? null
}

/** Все рёбра «файл → от чего зависит» с типом связи. */
export function loadDescriptions() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'docs/map-descriptions.json'), 'utf8'))
  } catch {
    return {}
  }
}

export function buildGraph(
  files,
  read = (f) => readFileSync(join(ROOT, f), 'utf8'),
  descriptions = loadDescriptions(),
) {
  const set = new Set(files)
  const texts = new Map(files.map((f) => [f, read(f)]))

  const components = new Map()
  for (const f of files) {
    if (f.startsWith('app/components/') && f.endsWith('.vue')) components.set(componentName(f), f)
  }
  const composables = new Map()
  for (const f of files) {
    if (!f.startsWith('app/composables/')) continue
    for (const m of texts.get(f).matchAll(/export\s+(?:async\s+)?function\s+(use\w+)/g)) {
      composables.set(m[1], f)
    }
  }

  const nodes = files.map((f) => ({
    id: f,
    kind: kindOf(f),
    route: routeOf(f),
    component: f.startsWith('app/components/') && f.endsWith('.vue') ? componentName(f) : null,
    description: describe(f, texts.get(f)) || descriptions[f] || '',
  }))

  const edges = []
  const add = (from, to, via) => {
    if (to && to !== from && !edges.some((e) => e.from === from && e.to === to)) {
      edges.push({ from, to, via })
    }
  }

  for (const f of files) {
    if (f.endsWith('.json')) continue
    const text = texts.get(f)
    const script = scriptPart(f, text)
    const imported = new Set()
    for (const m of script.matchAll(
      /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g,
    )) {
      const spec = m[1] ?? m[2]
      const target = resolveImport(f, spec, set)
      add(f, target, 'import')
      for (const n of m[0].match(/\b(use\w+)\b/g) ?? []) imported.add(n)
    }
    // Автоимпорт composables Nuxt: вызов без import.
    for (const m of script.matchAll(/\b(use\w+)\s*\(/g)) {
      if (!imported.has(m[1]) && composables.has(m[1])) add(f, composables.get(m[1]), 'автоимпорт')
    }
    // Автоимпорт компонентов по тегам шаблона.
    const template = templatePart(f, text)
    for (const m of template.matchAll(/<([A-Z][A-Za-z0-9]*|[a-z]+(?:-[a-z0-9]+)+)[\s/>]/g)) {
      let tag = m[1].includes('-') ? pascal(m[1]) : m[1]
      if (tag.startsWith('Lazy')) tag = tag.slice(4)
      if (components.has(tag)) add(f, components.get(tag), 'компонент')
    }
  }
  return { nodes, edges }
}

// ---------- обходы ----------

export function dependentsClosure(graph, id) {
  const rev = new Map()
  for (const e of graph.edges) {
    if (!rev.has(e.to)) rev.set(e.to, [])
    rev.get(e.to).push(e.from)
  }
  const seen = new Set()
  const stack = [id]
  while (stack.length) {
    for (const p of rev.get(stack.pop()) ?? []) {
      if (!seen.has(p)) {
        seen.add(p)
        stack.push(p)
      }
    }
  }
  return [...seen].sort()
}

// ---------- вывод ----------

const LAYERS = [
  ['страница', 'Страницы (app/pages)'],
  ['макет', 'Макеты (app/layouts)'],
  ['компонент', 'Компоненты (app/components)'],
  ['composable', 'Composables (app/composables)'],
  ['плагин', 'Плагины (app/plugins)'],
  ['библиотека', 'Библиотеки (app/lib)'],
  ['движок расчётов', 'Движок расчётов (app/lib/calc)'],
  ['приложение', 'Корень приложения (app)'],
  ['API', 'API (server/api)'],
  ['серверный маршрут', 'Серверные маршруты (server/routes)'],
  ['серверный плагин', 'Серверные плагины (server/plugins)'],
  ['middleware', 'Middleware (server/middleware)'],
  ['серверная утилита', 'Серверные утилиты (server/utils)'],
  ['общий модуль', 'Общие модули app + server (shared)'],
  ['данные', 'Данные (data) — заполняет человек'],
]

const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')

function serverRoute(file) {
  if (file.startsWith('server/api/')) {
    const m = file.match(/^server\/api\/(.+?)(?:\.(get|post|put|delete))?\.ts$/)
    return m ? `${(m[2] ?? 'ANY').toUpperCase()} /api/${m[1].replace(/\[(\w+)\]/g, ':$1')}` : null
  }
  if (file.startsWith('server/routes/')) {
    const m = file.match(/^server\/routes\/(.+?)(?:\.(get|post))?\.ts$/)
    return m ? `${(m[2] ?? 'ANY').toUpperCase()} /${m[1].replace(/\[(\w+)\]/g, ':$1')}` : null
  }
  return null
}

export function renderMarkdown(graph) {
  const deps = new Map()
  const users = new Map()
  for (const e of graph.edges) {
    if (!deps.has(e.from)) deps.set(e.from, [])
    deps.get(e.from).push(e.to)
    if (!users.has(e.to)) users.set(e.to, [])
    users.get(e.to).push(e.from)
  }
  const link = (f) => `[${f}](../${f})`
  const short = (f) => f.replace(/^app\//, '').replace(/^server\//, 'server/')
  const lines = []
  lines.push('# Карта проекта keflab.ru')
  lines.push('')
  lines.push(
    '> Файл генерируется командой `npm run map` из кода — не править руками. CI (`npm run map:check`) падает, если карта устарела.',
  )
  lines.push('> Интерактивная схема зависимостей: `docs/project-map.html` (открыть в браузере).')
  lines.push('')
  lines.push(`Модулей: ${graph.nodes.length}, связей: ${graph.edges.length}.`)
  lines.push('')
  lines.push('## Как пользоваться')
  lines.push('')
  lines.push('- Ищете, где что лежит, — разделы «Страницы» и «Модули по слоям».')
  lines.push(
    '- Меняете модуль — посмотрите «Используется в» (прямые) или в `docs/project-map.html` — «На что повлияет» (все, кто зависит транзитивно), и проверьте эти места.',
  )
  lines.push('- Описание модуля — первый комментарий в начале файла: пишите его коротко и по делу.')
  lines.push('')
  lines.push('## Слои и направления зависимостей')
  lines.push('')
  lines.push('```mermaid')
  lines.push('flowchart TD')
  const layerIds = new Map(LAYERS.map(([k], i) => [k, `L${i}`]))
  for (const [k, title] of LAYERS) {
    const n = graph.nodes.filter((x) => x.kind === k).length
    if (n) lines.push(`  ${layerIds.get(k)}["${title}<br/>${n} шт."]`)
  }
  const layerEdges = new Map()
  const kindById = new Map(graph.nodes.map((n) => [n.id, n.kind]))
  for (const e of graph.edges) {
    const a = kindById.get(e.from)
    const b = kindById.get(e.to)
    if (a === b) continue
    const key = `${a}→${b}`
    layerEdges.set(key, (layerEdges.get(key) ?? 0) + 1)
  }
  for (const [key, count] of [...layerEdges].sort()) {
    const [a, b] = key.split('→')
    lines.push(`  ${layerIds.get(a)} -->|${count}| ${layerIds.get(b)}`)
  }
  lines.push('```')
  lines.push('')

  lines.push('## Страницы')
  lines.push('')
  lines.push('| Адрес | Файл | Основные компоненты |')
  lines.push('| --- | --- | --- |')
  for (const n of graph.nodes
    .filter((x) => x.kind === 'страница')
    .sort((a, b) => a.route.localeCompare(b.route))) {
    const comps = (deps.get(n.id) ?? [])
      .filter((d) => d.startsWith('app/components/'))
      .map((d) => graph.nodes.find((x) => x.id === d).component ?? short(d))
    lines.push(`| \`${n.route}\` | ${link(n.id)} | ${cell(comps.join(', '))} |`)
  }
  lines.push('')

  lines.push('## Серверные адреса')
  lines.push('')
  lines.push('| Адрес | Файл | Описание |')
  lines.push('| --- | --- | --- |')
  for (const n of graph.nodes.filter((x) => serverRoute(x.id))) {
    lines.push(`| \`${serverRoute(n.id)}\` | ${link(n.id)} | ${cell(n.description)} |`)
  }
  lines.push('')

  lines.push('## Модули по слоям')
  lines.push('')
  for (const [k, title] of LAYERS) {
    const list = graph.nodes.filter((x) => x.kind === k)
    if (!list.length) continue
    lines.push(`### ${title}`)
    lines.push('')
    lines.push('| Модуль | Описание | Использует | Используется в |')
    lines.push('| --- | --- | --- | --- |')
    for (const n of list) {
      const name = n.component ? `${link(n.id)}<br/>\`<${n.component}>\`` : link(n.id)
      const d = (deps.get(n.id) ?? []).map(short).join(', ')
      const u = (users.get(n.id) ?? []).map(short).join(', ')
      lines.push(`| ${name} | ${cell(n.description)} | ${cell(d)} | ${cell(u)} |`)
    }
    lines.push('')
  }

  const orphans = graph.nodes.filter(
    (n) =>
      !users.has(n.id) &&
      ![
        'страница',
        'макет',
        'плагин',
        'API',
        'серверный маршрут',
        'серверный плагин',
        'middleware',
        'приложение',
      ].includes(n.kind),
  )
  lines.push('## Никем не используются в app/server/shared')
  lines.push('')
  lines.push(
    'Их могут использовать скрипты (`scripts/`), тесты или Nuxt по соглашению. Если ни то ни другое — кандидат на удаление.',
  )
  lines.push('')
  for (const n of orphans) lines.push(`- ${link(n.id)} — ${n.kind}`)
  lines.push('')
  return lines.join('\n')
}

export function renderHtml(graph) {
  const data = JSON.stringify(graph).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Карта зависимостей keflab.ru</title>
<style>
  :root { --bg:#101010; --panel:#1d1a18; --line:#3d3a39; --text:#eeeeee; --muted:#b8b3b0; --accent:#ee6018; --ok:#a0ca92; }
  @media (prefers-color-scheme: light) { :root { --bg:#fafafa; --panel:#ffffff; --line:#d9d6d4; --text:#101010; --muted:#4d4947; --accent:#b8440c; --ok:#3f7a2c; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  header { padding:16px; border-bottom:1px solid var(--line); }
  h1 { margin:0 0 4px; font-size:20px; font-weight:500; }
  .muted { color:var(--muted); font-size:13px; }
  main { display:grid; grid-template-columns:minmax(260px, 360px) 1fr; min-height:calc(100vh - 80px); }
  @media (max-width: 760px) { main { grid-template-columns:1fr; } aside { max-height:45vh; } }
  aside { border-right:1px solid var(--line); overflow:auto; padding:12px; }
  input, select { width:100%; padding:8px 10px; margin-bottom:8px; background:var(--panel); color:var(--text); border:1px solid var(--line); border-radius:3px; font:inherit; }
  ul { list-style:none; margin:0; padding:0; }
  li button { width:100%; text-align:left; padding:6px 8px; border:0; border-radius:3px; background:none; color:var(--text); font:inherit; cursor:pointer; overflow-wrap:anywhere; }
  li button:hover, li button[aria-current="true"] { background:var(--panel); }
  li button small { color:var(--muted); }
  section { padding:16px; overflow:auto; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px; margin-bottom:16px; }
  .cols { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; }
  .tag { display:inline-block; font-size:12px; padding:1px 6px; border:1px solid var(--line); border-radius:3px; color:var(--muted); margin-left:6px; }
  .impact { color:var(--accent); }
  .uses { color:var(--ok); }
  a.file { color:inherit; text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
  svg text { fill:var(--text); font-size:12px; }
  svg .edge { stroke:var(--line); fill:none; }
</style>
</head>
<body>
<header>
  <h1>Карта зависимостей keflab.ru</h1>
  <div class="muted">Генерируется <code>npm run map</code> из кода. Выберите модуль: слева — что он использует, справа — на что повлияет его изменение.</div>
</header>
<main>
  <aside>
    <label class="muted" for="q">Поиск по файлу, компоненту, адресу</label>
    <input id="q" type="search" placeholder="например, useSystemCalc или /sistema">
    <label class="muted" for="kind">Слой</label>
    <select id="kind"><option value="">все слои</option></select>
    <ul id="list"></ul>
  </aside>
  <section id="view"><p class="muted">Выберите модуль в списке.</p></section>
</main>
<script>
const G = ${data};
const byId = new Map(G.nodes.map(n => [n.id, n]));
const deps = new Map(), users = new Map();
for (const e of G.edges) {
  (deps.get(e.from) || deps.set(e.from, []).get(e.from)).push(e);
  (users.get(e.to) || users.set(e.to, []).get(e.to)).push(e);
}
function closure(id, map, key) {
  const seen = new Set(), stack = [id];
  while (stack.length) for (const e of map.get(stack.pop()) || []) { const n = e[key]; if (!seen.has(n) && n !== id) { seen.add(n); stack.push(n); } }
  return [...seen].sort();
}
const kinds = [...new Set(G.nodes.map(n => n.kind))];
const kindSel = document.getElementById('kind');
for (const k of kinds) { const o = document.createElement('option'); o.value = k; o.textContent = k; kindSel.append(o); }
const q = document.getElementById('q'), list = document.getElementById('list'), view = document.getElementById('view');
let current = null;
function label(n) { return (n.component ? '<' + n.component + '>' : n.route || n.id); }
function renderList() {
  const s = q.value.trim().toLowerCase(), k = kindSel.value;
  list.innerHTML = '';
  for (const n of G.nodes) {
    if (k && n.kind !== k) continue;
    const hay = (n.id + ' ' + (n.component || '') + ' ' + (n.route || '') + ' ' + n.description).toLowerCase();
    if (s && !hay.includes(s)) continue;
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = n.id;
    b.setAttribute('aria-current', String(current === n.id));
    b.innerHTML = '';
    b.append(document.createTextNode(n.id));
    const sm = document.createElement('small'); sm.textContent = ' ' + n.kind + (n.component ? ' · <' + n.component + '>' : '') + (n.route ? ' · ' + n.route : '');
    b.append(sm);
    b.onclick = () => select(n.id);
    li.append(b); list.append(li);
  }
}
function fileList(ids, cls) {
  const ul = document.createElement('ul');
  if (!ids.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'нет'; ul.append(li); }
  for (const id of ids) {
    const li = document.createElement('li'), a = document.createElement('a');
    a.className = 'file ' + (cls || ''); a.textContent = id; a.onclick = () => select(id);
    const n = byId.get(id);
    li.append(a);
    if (n) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = n.kind; li.append(t); }
    ul.append(li);
  }
  return ul;
}
function block(title, ids, cls, note) {
  const d = document.createElement('div');
  const h = document.createElement('h3'); h.textContent = title + ' (' + ids.length + ')'; d.append(h);
  if (note) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = note; d.append(p); }
  d.append(fileList(ids, cls));
  return d;
}
function select(id) {
  current = id;
  // Список не перерисовываем — только отмечаем выбранный (иначе клик «теряется»).
  for (const b of list.querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === id));
  const n = byId.get(id);
  view.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card';
  const h = document.createElement('h2'); h.textContent = id; card.append(h);
  const meta = document.createElement('p'); meta.className = 'muted';
  meta.textContent = n.kind + (n.component ? ' · компонент <' + n.component + '>' : '') + (n.route ? ' · адрес ' + n.route : '');
  card.append(meta);
  if (n.description) { const p = document.createElement('p'); p.textContent = n.description; card.append(p); }
  view.append(card);
  const direct = (deps.get(id) || []).map(e => e.to);
  const directUsers = (users.get(id) || []).map(e => e.from);
  const impact = closure(id, users, 'from');
  const allDeps = closure(id, deps, 'to');
  const pages = impact.filter(x => byId.get(x)?.kind === 'страница' || byId.get(x)?.kind === 'API' || byId.get(x)?.kind === 'серверный маршрут');
  const cols = document.createElement('div'); cols.className = 'cols';
  cols.append(block('Использует напрямую', direct, 'uses'));
  cols.append(block('Используется напрямую в', directUsers, 'impact'));
  cols.append(block('На что повлияет изменение (транзитивно)', impact, 'impact', 'Все модули, которые зависят от этого через цепочку. Их стоит проверить после правки.'));
  cols.append(block('Затронутые страницы и адреса', pages.map(x => x + (byId.get(x).route ? '  →  ' + byId.get(x).route : '')).map(s => s.split('  →  ')[0]), 'impact'));
  cols.append(block('Зависит от (транзитивно)', allDeps, 'uses'));
  view.append(cols);
  try { history.replaceState(null, '', '#' + encodeURIComponent(id)); } catch {}
  view.scrollTop = 0; window.scrollTo(0, 0);
}
q.oninput = renderList; kindSel.onchange = renderList;
renderList();
const start = decodeURIComponent(location.hash.slice(1));
if (byId.has(start)) select(start);
</script>
</body>
</html>
`
}

// ---------- CLI ----------

function main() {
  const check = process.argv.includes('--check')
  const graph = buildGraph(collectFiles())
  const md = renderMarkdown(graph)
  const html = renderHtml(graph)
  const mdPath = join(ROOT, 'docs/PROJECT_MAP.md')
  const htmlPath = join(ROOT, 'docs/project-map.html')
  const missing = graph.nodes.filter((n) => !n.description).map((n) => n.id)
  const extra = Object.keys(loadDescriptions()).filter((k) => !graph.nodes.some((n) => n.id === k))
  if (check) {
    for (const m of missing) {
      console.error(
        `map: у модуля ${m} нет описания — добавьте комментарий в начало файла или строку в docs/map-descriptions.json`,
      )
    }
    for (const e of extra)
      console.error(`map: в docs/map-descriptions.json лишний ключ ${e} (файла нет)`)
    if (missing.length || extra.length) process.exit(1)
    const read = (p) => {
      try {
        return readFileSync(p, 'utf8')
      } catch {
        return ''
      }
    }
    const stale = [
      [mdPath, md],
      [htmlPath, html],
    ].filter(([p, content]) => read(p) !== content)
    if (stale.length) {
      for (const [p] of stale)
        console.error(`map: устарел ${relative(ROOT, p)} — выполните npm run map и закоммитьте`)
      process.exit(1)
    }
    console.log(`map: актуальна (${graph.nodes.length} модулей, ${graph.edges.length} связей)`)
    return
  }
  mkdirSync(join(ROOT, 'docs'), { recursive: true })
  writeFileSync(mdPath, md)
  writeFileSync(htmlPath, html)
  console.log(
    `map: ${graph.nodes.length} модулей, ${graph.edges.length} связей → docs/PROJECT_MAP.md, docs/project-map.html`,
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()

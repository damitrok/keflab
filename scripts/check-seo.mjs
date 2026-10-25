// Гейт шага 6: техническое SEO по собранному серверу.
// Запуск: node scripts/check-seo.mjs [--self-test]  (нужна сборка .output).
// Реестр страниц — shared/site-pages.ts (Node ≥ 22.18 читает .ts без флагов).
import { SITE_PAGES, SITE_URL } from '../shared/site-pages.ts'
import { withServer } from './gates/lib-server.mjs'

const PORT = 3160
const PARAM_PATH = '/?s=3000&k=2&e=1.80w,2.10w,1.65l'
const TITLE_MAX = 60
const DESC_MAX = 160

// ---------- разбор HTML ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

const norm = (s) =>
  decode(s)
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function attrs(tag) {
  const out = {}
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3])
  }
  return out
}

const headOf = (html) => html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html

function metaAll(html, key, value) {
  return [...headOf(html).matchAll(/<meta\b[^>]*>/gi)]
    .map((m) => attrs(m[0]))
    .filter((a) => a[key]?.toLowerCase() === value)
    .map((a) => a.content ?? '')
}

function links(html, rel) {
  return [...headOf(html).matchAll(/<link\b[^>]*>/gi)]
    .map((m) => attrs(m[0]))
    .filter((a) => a.rel?.toLowerCase() === rel)
    .map((a) => a.href ?? '')
}

const titles = (html) =>
  [...headOf(html).matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => norm(m[1]))
const h1Count = (html) => (html.match(/<h1[\s>]/gi) ?? []).length

function visibleText(html) {
  return norm(
    html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '),
  )
}

/** Все JSON-LD узлы страницы (с разворачиванием @graph и массивов). Ошибки разбора — в errors. */
function jsonLd(html) {
  const nodes = []
  const errors = []
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter((m) =>
    /type\s*=\s*["']application\/ld\+json["']/i.test(m[1]),
  )
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      nodes.push(v)
      if (v['@graph']) walk(v['@graph'])
    }
  }
  for (const [i, m] of scripts.entries()) {
    try {
      walk(JSON.parse(m[2]))
    } catch (e) {
      errors.push(`JSON-LD #${i + 1} не парсится: ${e.message}`)
    }
  }
  return { nodes, errors, count: scripts.length }
}

const typesOf = (n) => [n['@type']].flat().filter(Boolean)
const ofType = (nodes, t) => nodes.filter((n) => typesOf(n).includes(t))
const isAbs = (u) => typeof u === 'string' && u.startsWith(`${SITE_URL}/`)

// ---------- проверки ----------
// snap: { registry:[{path,indexable}], sitemapXml, robotsTxt, pages:{path:{status,xRobots,html}},
//         param:{status,xRobots,html}, today:'YYYY-MM-DD' }

export function parseSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: m[1].match(/<loc>\s*([^<]*?)\s*<\/loc>/)?.[1] ?? '',
    lastmod: m[1].match(/<lastmod>\s*([^<]*?)\s*<\/lastmod>/)?.[1] ?? '',
  }))
}

const noindexIn = (page) =>
  metaAll(page.html, 'name', 'robots').some((c) => /noindex/i.test(c)) ||
  /noindex/i.test(page.xRobots ?? '')

export function runChecks(snap) {
  const results = []
  const check = (name, fn) => {
    const errors = []
    fn((msg) => errors.push(msg))
    results.push({ name, errors })
  }

  const entries = parseSitemap(snap.sitemapXml)
  const expected = snap.registry.filter((p) => p.indexable).map((p) => SITE_URL + p.path)
  const locs = entries.map((e) => e.loc)
  const paths = Object.keys(snap.pages)

  check('sitemap: адреса совпадают с реестром (indexable)', (err) => {
    for (const u of expected) if (!locs.includes(u)) err(`нет в sitemap: ${u}`)
    for (const u of locs) if (!expected.includes(u)) err(`лишний адрес в sitemap: ${u}`)
    if (new Set(locs).size !== locs.length) err('в sitemap есть дубликаты <loc>')
  })

  check('sitemap: lastmod YYYY-MM-DD и не в будущем', (err) => {
    const limit = new Date(snap.today)
    limit.setUTCDate(limit.getUTCDate() + 1) // запас на часовой пояс
    for (const e of entries) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.lastmod) || Number.isNaN(Date.parse(e.lastmod)))
        err(`${e.loc}: lastmod «${e.lastmod}»`)
      else if (new Date(e.lastmod) > limit) err(`${e.loc}: lastmod в будущем (${e.lastmod})`)
    }
  })

  check('sitemap: нет страниц с noindex', (err) => {
    for (const p of paths) {
      if (locs.includes(SITE_URL + p) && noindexIn(snap.pages[p])) err(`${p} в sitemap, но noindex`)
    }
  })

  check('страницы: ответ 200', (err) => {
    for (const p of paths) if (snap.pages[p].status !== 200) err(`${p}: ${snap.pages[p].status}`)
  })

  check('страницы: title ровно один и ≤ 60 символов', (err) => {
    for (const p of paths) {
      const t = titles(snap.pages[p].html)
      if (t.length !== 1) err(`${p}: тегов title ${t.length}`)
      else if (!t[0]) err(`${p}: пустой title`)
      else if ([...t[0]].length > TITLE_MAX) err(`${p}: title ${[...t[0]].length} символов`)
    }
  })

  check('страницы: description есть и ≤ 160 символов', (err) => {
    for (const p of paths) {
      const d = metaAll(snap.pages[p].html, 'name', 'description')
      if (d.length !== 1 || !norm(d[0])) err(`${p}: meta description: ${d.length} шт.`)
      else if ([...norm(d[0])].length > DESC_MAX) err(`${p}: description ${[...norm(d[0])].length}`)
    }
  })

  check('страницы: title уникальны', (err) => {
    const seen = new Map()
    for (const p of paths) {
      const t = titles(snap.pages[p].html)[0]
      if (t === undefined) continue
      if (seen.has(t)) err(`одинаковый title «${t}»: ${seen.get(t)} и ${p}`)
      else seen.set(t, p)
    }
  })

  check('страницы: description уникальны', (err) => {
    const seen = new Map()
    for (const p of paths) {
      const d = metaAll(snap.pages[p].html, 'name', 'description')[0]
      if (d === undefined) continue
      if (seen.has(norm(d))) err(`одинаковый description: ${seen.get(norm(d))} и ${p}`)
      else seen.set(norm(d), p)
    }
  })

  check('страницы: noindex нет (meta и X-Robots-Tag)', (err) => {
    for (const p of paths) if (noindexIn(snap.pages[p])) err(`${p}: noindex`)
  })

  check('страницы: canonical = абсолютный адрес со слешем', (err) => {
    for (const p of paths) {
      const c = links(snap.pages[p].html, 'canonical')
      if (c.length !== 1 || c[0] !== SITE_URL + p) err(`${p}: canonical ${JSON.stringify(c)}`)
    }
  })

  check('страницы: og:title, og:description, og:url', (err) => {
    for (const p of paths) {
      const { html } = snap.pages[p]
      const og = (n) => metaAll(html, 'property', n)
      if (og('og:title').length !== 1 || !og('og:title')[0]) err(`${p}: og:title`)
      if (og('og:description').length !== 1 || !og('og:description')[0]) err(`${p}: og:description`)
      if (og('og:url')[0] !== SITE_URL + p) err(`${p}: og:url ${JSON.stringify(og('og:url'))}`)
    }
  })

  check('страницы: ровно один H1', (err) => {
    for (const p of paths) {
      const n = h1Count(snap.pages[p].html)
      if (n !== 1) err(`${p}: H1 ${n}`)
    }
  })

  check('JSON-LD: каждый блок парсится', (err) => {
    for (const p of paths) for (const e of jsonLd(snap.pages[p].html).errors) err(`${p}: ${e}`)
  })

  check('JSON-LD: BreadcrumbList на всех, кроме главной', (err) => {
    for (const p of paths) {
      const crumbs = ofType(jsonLd(snap.pages[p].html).nodes, 'BreadcrumbList')
      if (p === '/' && crumbs.length === 0) continue
      if (crumbs.length !== 1) {
        err(`${p}: BreadcrumbList ${crumbs.length} шт.`)
        continue
      }
      const items = crumbs[0].itemListElement
      if (!Array.isArray(items) || items.length === 0) {
        err(`${p}: пустой itemListElement`)
        continue
      }
      items.forEach((it, i) => {
        if (it.position !== i + 1) err(`${p}: position ${it.position}, ожидалось ${i + 1}`)
        const url = typeof it.item === 'string' ? it.item : it.item?.['@id']
        if (!it.name && !it.item?.name) err(`${p}: крошка ${i + 1} без name`)
        if (url === undefined ? i !== items.length - 1 : !isAbs(url))
          err(`${p}: крошка ${i + 1} item «${url}» не абсолютный`)
      })
    }
  })

  check('JSON-LD: FAQPage только при видимых вопросах', (err) => {
    for (const p of paths) {
      const { html } = snap.pages[p]
      const faqs = ofType(jsonLd(html).nodes, 'FAQPage')
      if (faqs.length === 0) continue
      if (!/<details[\s>]/i.test(html)) err(`${p}: FAQPage без <details> на странице`)
      const text = visibleText(html)
      const qs = faqs.flatMap((f) => [f.mainEntity].flat().filter(Boolean))
      if (qs.length === 0) err(`${p}: FAQPage без mainEntity`)
      for (const q of qs) {
        const name = norm(String(q.name ?? ''))
        if (!name || !text.includes(name)) err(`${p}: вопроса «${name}» нет в видимом тексте`)
        const ans = norm(String(q.acceptedAnswer?.text ?? '').replace(/<[^>]+>/g, ' '))
        if (!ans) err(`${p}: у вопроса «${name}» нет ответа`)
      }
    }
  })

  check('JSON-LD: WebApplication на / и /kalkulyator-ekspressa/', (err) => {
    for (const p of ['/', '/kalkulyator-ekspressa/']) {
      if (!snap.pages[p]) continue
      const apps = ofType(jsonLd(snap.pages[p].html).nodes, 'WebApplication')
      if (apps.length !== 1) err(`${p}: WebApplication ${apps.length} шт.`)
    }
  })

  check('robots.txt: Sitemap и Disallow: /go/', (err) => {
    if (!new RegExp(`^Sitemap:\\s*${SITE_URL}/sitemap\\.xml\\s*$`, 'm').test(snap.robotsTxt))
      err(`нет «Sitemap: ${SITE_URL}/sitemap.xml»`)
    if (!/^Disallow:\s*\/go\/\s*$/m.test(snap.robotsTxt)) err('нет «Disallow: /go/»')
  })

  check('адрес с параметрами: 200, noindex, нет в sitemap', (err) => {
    if (snap.param.status !== 200) err(`статус ${snap.param.status}`)
    if (!noindexIn(snap.param)) err('нет noindex')
    if (locs.some((l) => l.includes('?'))) err('в sitemap есть адрес с параметрами')
  })

  return results
}

// ---------- запуск ----------

function printAndExit(results) {
  let failed = 0
  for (const r of results) {
    console.log(`${r.errors.length ? 'FAIL' : 'ok  '} ${r.name}`)
    for (const e of r.errors) console.log(`       - ${e}`)
    if (r.errors.length) failed++
  }
  if (failed) {
    console.log(`check:seo: ошибок в проверках: ${failed}`)
    process.exit(1)
  }
  console.log('check:seo: ок')
}

async function collect() {
  const registry = SITE_PAGES.map(({ path, indexable }) => ({ path, indexable }))
  return withServer(PORT, async (get) => {
    await get('/') // ждём готовности сервера
    const fetchFull = async (path) => {
      const res = await fetch(`http://localhost:${PORT}${path}`, { redirect: 'manual' })
      return {
        status: res.status,
        xRobots: res.headers.get('x-robots-tag') ?? '',
        type: res.headers.get('content-type') ?? '',
        html: await res.text(),
      }
    }
    const sitemap = await fetchFull('/sitemap.xml')
    const robots = await fetchFull('/robots.txt')
    const pages = {}
    for (const loc of parseSitemap(sitemap.html).map((e) => e.loc)) {
      const path = loc.replace(SITE_URL, '')
      pages[path] = await fetchFull(path)
    }
    // Индексируемые страницы реестра, которых нет в sitemap, тоже проверяем.
    for (const p of registry) pages[p.path] ??= await fetchFull(p.path)
    const param = await fetchFull(PARAM_PATH)
    const results = [
      {
        name: 'sitemap.xml: 200 и application/xml',
        errors:
          sitemap.status === 200 && /xml/i.test(sitemap.type)
            ? []
            : [`статус ${sitemap.status}, тип ${sitemap.type}`],
      },
    ]
    return results.concat(
      runChecks({
        registry,
        sitemapXml: sitemap.html,
        robotsTxt: robots.html,
        pages,
        param,
        today: new Date().toISOString().slice(0, 10),
      }),
    )
  })
}

// ---------- позитивный контроль ----------

function fakePage(path, title, extra = '') {
  const url = SITE_URL + path
  const crumbs =
    path === '/'
      ? ''
      : `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: title, item: url },
          ],
        })}</script>`
  const app = ['/', '/kalkulyator-ekspressa/'].includes(path)
    ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: title })}</script>`
    : ''
  return {
    status: 200,
    xRobots: '',
    html: `<html><head><title>${title}</title><meta name="description" content="Описание ${title}">
<link rel="canonical" href="${url}"><meta property="og:title" content="${title}">
<meta property="og:description" content="Описание"><meta property="og:url" content="${url}">
${crumbs}${app}${extra}</head><body><h1>${title}</h1></body></html>`,
  }
}

function goodSnapshot() {
  const registry = ['/', '/kalkulyator-ekspressa/', '/o-proekte/'].map((path) => ({
    path,
    indexable: true,
  }))
  const pages = {}
  for (const [i, r] of registry.entries()) pages[r.path] = fakePage(r.path, `Страница ${i}`)
  return {
    registry,
    sitemapXml: sitemapOf(registry.map((r) => r.path)),
    robotsTxt: `User-agent: *\nDisallow: /go/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    pages,
    param: { status: 200, xRobots: 'noindex', html: '<html></html>' },
    today: '2026-01-10',
  }
}

const sitemapOf = (paths, lastmod = '2026-01-05') =>
  `<urlset>${paths.map((p) => `<url><loc>${SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('')}</urlset>`

function selfTest() {
  const failedNames = (snap) =>
    runChecks(snap)
      .filter((r) => r.errors.length)
      .map((r) => r.name)
  const base = failedNames(goodSnapshot())
  if (base.length) {
    console.log(`self-test: эталон не проходит: ${base.join('; ')}`)
    process.exit(1)
  }
  const cases = [
    [
      'дубликат title',
      'title уникальны',
      (s) => (s.pages['/o-proekte/'] = fakePage('/o-proekte/', 'Страница 0')),
    ],
    [
      'title 61 символ',
      'title ровно один и ≤ 60',
      (s) => (s.pages['/o-proekte/'] = fakePage('/o-proekte/', 'я'.repeat(61))),
    ],
    [
      'noindex-страница в sitemap',
      'sitemap: нет страниц с noindex',
      (s) => (s.pages['/o-proekte/'].xRobots = 'noindex, follow'),
    ],
    [
      'лишний адрес в sitemap',
      'sitemap: адреса совпадают',
      (s) => (s.sitemapXml = sitemapOf([...s.registry.map((r) => r.path), '/lishnyaya/'])),
    ],
    [
      'lastmod в будущем',
      'lastmod',
      (s) =>
        (s.sitemapXml = sitemapOf(['/', '/kalkulyator-ekspressa/', '/o-proekte/'], '2027-01-01')),
    ],
    [
      'canonical без слеша',
      'canonical',
      (s) =>
        (s.pages['/o-proekte/'].html = s.pages['/o-proekte/'].html.replace(
          '/o-proekte/"',
          '/o-proekte"',
        )),
    ],
    [
      'битый JSON-LD',
      'каждый блок парсится',
      (s) => (s.pages['/'].html += '<script type="application/ld+json">{oops</script>'),
    ],
    [
      'FAQPage с невидимым вопросом',
      'FAQPage только',
      (s) =>
        (s.pages['/o-proekte/'] = fakePage(
          '/o-proekte/',
          'Страница 2',
          `<script type="application/ld+json">${JSON.stringify({ '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Нет такого?', acceptedAnswer: { text: 'Да' } }] })}</script>`,
        )),
    ],
    [
      'нет BreadcrumbList',
      'BreadcrumbList',
      (s) =>
        (s.pages['/o-proekte/'].html = s.pages['/o-proekte/'].html.replace(
          /<script[\s\S]*?<\/script>/,
          '',
        )),
    ],
    [
      'robots без Disallow /go/',
      'robots.txt',
      (s) => (s.robotsTxt = `Sitemap: ${SITE_URL}/sitemap.xml\n`),
    ],
    ['параметры без noindex', 'адрес с параметрами', (s) => (s.param.xRobots = '')],
  ]
  let bad = 0
  for (const [label, expectName, mutate] of cases) {
    const snap = goodSnapshot()
    mutate(snap)
    const caught = failedNames(snap).some((n) => n.includes(expectName))
    console.log(
      `${caught ? 'ok  ' : 'FAIL'} self-test: «${label}» ловится проверкой «${expectName}»`,
    )
    if (!caught) bad++
  }
  if (bad) {
    console.log('self-test: проверки пропускают испорченные данные')
    process.exit(1)
  }
  console.log('self-test: ок')
}

if (process.argv.includes('--self-test')) selfTest()
else printAndExit(await collect())

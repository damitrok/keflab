// Гейт шага 5: SSR страниц экспресса и разбора.
import { report, visibleText, withServer } from './lib-server.mjs'

const h1Count = (html) => (html.match(/<h1[\s>]/g) ?? []).length
const crumbs = (html) => /<nav[^>]+aria-label="Хлебные крошки"/.test(html)
const link = (html, href) => new RegExp(`<a[^>]+href="${href}"`).test(html)

/** Слова статьи: текст внутри <article>, без таблиц и калькулятора. */
function articleWords(html) {
  const article = html.match(/<article[\s\S]*?<\/article>/)?.[0] ?? ''
  const prose = article
    .replace(/<table[\s\S]*?<\/table>/g, ' ')
    .replace(/<form[\s\S]*?<\/form>/g, ' ')
    .replace(/<section[^>]+data-testid="calc-result"[\s\S]*?<\/section>/g, ' ')
  return visibleText(prose)
    .split(' ')
    .filter((w) => /[а-яёa-z]/i.test(w)).length
}

await withServer(3152, async (get) => {
  const express = await get('/kalkulyator-ekspressa/')
  const article = await get('/chto-takoe-sistema-v-stavkah/')
  const words = articleWords(article.html)
  console.log(`слов в статье: ${words}`)
  report({
    'экспресс: 200, один H1, крошки':
      express.status === 200 && h1Count(express.html) === 1 && crumbs(express.html),
    'экспресс: ссылки на систему и разбор':
      link(express.html, '/') && link(express.html, '/chto-takoe-sistema-v-stavkah/'),
    'разбор: 200, один H1, крошки':
      article.status === 200 && h1Count(article.html) === 1 && crumbs(article.html),
    'разбор: ссылки на оба калькулятора':
      link(article.html, '/') && link(article.html, '/kalkulyator-ekspressa/'),
    'разбор: от 1 000 до 1 500 слов': words >= 1000 && words <= 1500,
  })
})

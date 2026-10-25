import { describe, expect, it } from 'vitest'
import { shouldRedirect } from '../../shared/trailing-slash'

describe('shouldRedirect', () => {
  const cases: [string, string | null][] = [
    ['/', null],
    ['/reklama/', null],
    ['/reklama', '/reklama/'],
    ['/kalkulyator-ekspressa', '/kalkulyator-ekspressa/'],
    ['/bk/fonbet/kak-schitaetsya-sistema', '/bk/fonbet/kak-schitaetsya-sistema/'],
    ['//', '/'],
    ['//reklama/', '/reklama/'],
    ['/reklama//', '/reklama/'],
    ['//reklama', '/reklama/'],
    ['/favicon.ico', null],
    ['/_nuxt/entry.abc.js', null],
    ['/_nuxt', null],
    ['/api/geo', null],
    ['/__nuxt_error', null],
    ['/sitemap.xml', null],
    ['/robots.txt', null],
    ['//sitemap.xml', '/sitemap.xml'],
    ['/go/abc', null],
    ['/go', null],
    ['/go/', null],
    ['net-slasha', null],
  ]
  it.each(cases)('%s -> %s', (input, expected) => {
    expect(shouldRedirect(input)).toBe(expected)
  })
})

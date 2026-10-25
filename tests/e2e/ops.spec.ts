import { expect, test } from '@playwright/test'

test.describe('служебные эндпоинты', () => {
  test('GET /api/health: 200, ok:true, no-store', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers()['cache-control']).toContain('no-store')
  })

  test('POST /api/error: корректное тело -> 204', async ({ request }) => {
    const res = await request.post('/api/error', {
      data: { where: 'test', name: 'Error', message: 'x' },
    })
    expect(res.status()).toBe(204)
  })

  // Лишние поля отбрасываются (в лог попадают только where, name, message):
  // так старый сервер принимает отчёты от более нового клиента.
  test('POST /api/error: лишнее поле отбрасывается -> 204', async ({ request }) => {
    const res = await request.post('/api/error', {
      data: { where: 'test', name: 'Error', message: 'x', extra: 1 },
    })
    expect(res.status()).toBe(204)
  })

  test('POST /api/error: не JSON -> 400', async ({ request }) => {
    const res = await request.post('/api/error', {
      headers: { 'content-type': 'application/json' },
      data: '{not json',
    })
    expect(res.status()).toBe(400)
    const plain = await request.post('/api/error', {
      headers: { 'content-type': 'text/plain' },
      data: 'hello',
    })
    expect(plain.status()).toBe(400)
  })

  test('robots.txt закрывает /go/', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain('Disallow: /go/')
  })
})

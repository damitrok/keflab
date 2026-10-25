import { defineEventHandler, getRouterParam, sendRedirect, setResponseHeaders } from 'h3'
import { todayMoscow } from '../../../shared/bookmakers'
import { decideGo } from '../../../shared/offers'
import { countryFromHeaders } from '../../utils/geo'
import { allOffers, allowlistDomains } from '../../utils/offers-data'
import { offersEnabledNow } from '../../utils/offers'
import { reportError } from '../../utils/report-error'
import { recordEvent } from '../../utils/stats-store'

const GONE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Предложение больше не действует</title>
</head>
<body>
<main>
<h1>Предложение больше не действует</h1>
<p>Срок этого предложения закончился или оно ещё не началось.</p>
<p><a href="/">Калькулятор системы</a></p>
</main>
</body>
</html>
`

// Единственное место перехода на букмекера. Всё проверяется на сервере заново.
// Без cookie, IP и User-Agent в логах и статистике.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  const id = getRouterParam(event, 'id') ?? ''
  const offer = allOffers.find((o) => o.id === id)
  const decision = decideGo(offer, {
    today: todayMoscow(),
    enabled: offersEnabledNow(),
    country: countryFromHeaders(event.node.req.headers),
    allowlist: allowlistDomains,
  })

  if (decision.status === 302 && offer) {
    try {
      await recordEvent(offer.erid, 'click')
    } catch (error) {
      reportError(error, { where: 'stats' })
    }
    return sendRedirect(event, decision.location, 302)
  }
  if (decision.status === 410) {
    event.node.res.statusCode = 410
    event.node.res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return GONE_HTML
  }
  if (decision.status === 404 && decision.reason === 'domain') {
    reportError(new Error('offer domain not in allowlist'), { where: 'go' })
  }
  event.node.res.statusCode = 404
  event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  return 'Не найдено'
})

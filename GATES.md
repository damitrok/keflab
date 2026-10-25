# Gates: шаг 13 — модуль офферов

OWNS: app/**, server/**, shared/**, scripts/**, tests/**, deploy/**, data/schema.ts, nuxt.config.ts, package.json, playwright.offers.config.ts, README.md, .env.example, .github/**

Scope: офферы легальных БК из data/offers.json — видны только при OFFERS_ENABLED=true, registered=true, erid и рекламодателе, в сроке по Москве и для RU; карточка с «Реклама», рекламодателем, erid, 18+ и предупреждением; блок только в браузере после /api/geo, никогда в /embed/; переход через /go/<id> (allowlist, erid в адресе, 302/404/410); показы и клики по erid и дням без cookie и IP, 13 месяцев; выключатель в рантайме; check:offers; гейты шагов 1–12 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (каждое условие видимости, /go, статистика, check:offers, клиент) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=b6a1db1da9642a63a8144668673764187445a1f53bf0cefdcd60aa6ce6169cd2; output-bytes=1334; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, ссылки, SEO, проверка офферов и стоп-слов проходят на реальных данных
  CHECK: npm run check:offers && npm run build && npm run check:links && npm run check:seo && node scripts/gates/stopwords.mjs && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=7a21b2e4c669a2ccea276e5de756c81a4b70f644d6dbec39d13ba76b342ef2c2; exit=0; EXPECT=matched; output-sha256=cb28c487ff91699f7a4e91ea68f9eee24d65a4fad8bb65f9d4da506562cbbe0b; output-bytes=48563; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: e2e офферов на копии с тестовыми данными: условия показа, не-RU и неизвестная страна, таймаут /api/geo, /go 302/404/410, статистика, виджет без офферов, выключение флага без пересборки
  CHECK: node scripts/gates/offers-e2e.mjs && echo GATE_E2E_OFFERS_OK
  EXPECT: GATE_E2E_OFFERS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=4543ea127686075b8b3239eef9a9703135a9f5a799da667ef2bec37f52829344; exit=0; EXPECT=matched; output-sha256=12f12a10557af1df0d97934bc9b40394a089cf998dedab63cda40ab1698fb020; output-bytes=4372; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: выключатель офферов шага 7 по-прежнему работает (сборка с флагом без регистрации падает)
  CHECK: node scripts/gates/offers-flag.mjs && echo GATE_OFFERS_FLAG_OK
  EXPECT: GATE_OFFERS_FLAG_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c2ac78cb7f34fb2ee985a3fd911497e1dd674fbb87184cff0380692c3372fba4; exit=0; EXPECT=matched; output-sha256=c09b897dcf347801997c243144fe328b2b1e247043a38cc03d4698e623bcbed0; output-bytes=504; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: конфиги Nginx (GeoIP-заголовок во всех proxy, /api/stat, /go без редиректа на слеш)
  CHECK: npm run check:deploy && echo GATE_DEPLOY_OK
  EXPECT: GATE_DEPLOY_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=70a9ff43b3426b9c5fc68f22c26b9a23f8ccaf059136d2bce95b27506e6bd87b; exit=0; EXPECT=matched; output-sha256=36d6f5a1fb33c189a00f0e75e0b1e7acf39bf14ab30a00b16714676ed320478e; output-bytes=319; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: e2e всего сайта (регрессия, офферов на реальных данных нет) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=e9fe4445d1f3db6f492bc65cdb0dbc38e7fdede8abdaeed8266a386478ff2c91; output-bytes=139186; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: независимое ревью рекламной и денежной логики (/go, видимость, статистика) без неисправленных проблем
  EVIDENCE: 2026-10-25 surgeon-reviewer, 1-й проход DO NOT SHIP: (1) оффер внутри чужого iframe через клиентскую навигацию из виджета; (2) кеш /api/geo без TTL — офферы после срока/выключения; (3) накрутка/гашение показов общим лимитом; (4) места показа — решение человека; мелочь: registered=true без riskWarning не ловится в CI. Плюс e2e: KEFLAB_STATS_DIR запекался при сборке, оффер с доменом вне allowlist показывался. Исправлено: липкий признак виджета + guard навигации + запрет в любом iframe; TTL 60 с и скрытие по validTo по Москве; места fail-closed (/, экспресс, системы); offerShowable с allowlist; лимит по erid; каталог статистики в рантайме; check-offers на riskWarning; Nginx /24 и /64. 2-й проход SHIP WITH FIXES: сон телефона (таймер) и лимит = лимиту сети. Исправлено: пересчёт сроков и перезапрос по visibilitychange/pageshow/focus; лимит 3000/мин на erid и поле throttled; README про поддельный Origin. E2E на копии: атака из виджета на другом origin, места показа, bad-domain, учёт показов — 18/18.

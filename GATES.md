# Gates: шаг 7 — юридический слой без офферов

OWNS: app/**, server/**, shared/**, scripts/**, tests/**, data/allowlist.json, nuxt.config.ts, playwright.config.ts

Scope: 18+, плашка «справочный характер», блок про ответственную игру, выходные данные СМИ из data/site.json (скрыты до регистрации), предупреждение о рисках, выключатель офферов (сборка падает, сервер считает выключенными), шаблоны служебных страниц с TODO(legal), баннер cookie и Метрика только после согласия; гейты шагов 1–6 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (включая выключатель офферов) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=cf1a5b5ebc2a9fc394a8668b65b0c0fc27743ec03231452dafb0674fc246e368; output-bytes=1135; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, внешние ссылки и SEO проходят
  CHECK: npm run build && npm run check:links && npm run check:seo && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=e3b1b940a8fecb865ee3193e732fc3e6a0251311025014b3d8b3dff5cd832eb5; exit=0; EXPECT=matched; output-sha256=0b996040dd5aeae41017eb30fbd60dbc3957f900979c4fd361113e4db58346ad; output-bytes=25039; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: при media.registered = false сборка с OFFERS_ENABLED=true падает с понятной ошибкой, а запущенный сервер с таким флагом считает офферы выключенными и пишет ошибку
  CHECK: node scripts/gates/offers-flag.mjs && echo GATE_OFFERS_FLAG_OK
  EXPECT: GATE_OFFERS_FLAG_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c2ac78cb7f34fb2ee985a3fd911497e1dd674fbb87184cff0380692c3372fba4; exit=0; EXPECT=matched; output-sha256=c09b897dcf347801997c243144fe328b2b1e247043a38cc03d4698e623bcbed0; output-bytes=504; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: Метрика не грузится до «Принять» (e2e по сетевым запросам), «Настройки cookie» меняют выбор, блокировщик не ломает страницу; 18+ и плашка на каждой странице
  CHECK: npx playwright test tests/e2e/consent tests/e2e/legal && echo GATE_E2E_LEGAL_OK
  EXPECT: GATE_E2E_LEGAL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=482ce2c5250e8bd0378ba6d10a3bbc9fd0028755cb8ed36dfd4d84c860d30554; exit=0; EXPECT=matched; output-sha256=75e9c225dd444842dde3769dbe09ed2d547fcd753e7b4a4f266d5ba5e2bd786e; output-bytes=18440; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (регрессия шагов 1–6) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=f0ea61c8a62b9cecb7f7713b88d09a84d0724b8fe2ce051a53de446fbb18d103; output-bytes=66270; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: стоп-слова не встречаются в тексте страниц
  CHECK: node scripts/gates/stopwords.mjs && echo GATE_STOPWORDS_OK
  EXPECT: GATE_STOPWORDS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c8c48b436f964c3a770307b2cfdf076c022b648bfd7aa75e95f042da56041fe1; exit=0; EXPECT=matched; output-sha256=13627385ec21cbb055b19285d602bef07fb031cb515404eba2db7da4b47571c7; output-bytes=358; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

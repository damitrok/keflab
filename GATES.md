# Gates: шаг 12 — виджет

OWNS: app/**, shared/site-pages.ts, nuxt.config.ts, deploy/**, tests/**, README.md

Scope: /embed/sistema/ (без шапки и подвала, noindex, тот же калькулятор, 18+, тема, высота через postMessage) и /vidzhet/ (описание и генератор кода iframe с title и подписью-ссылкой); встраивание только для /embed/; в виджете нет рекламы, офферов и Метрики; план А — без партнёров; гейты шагов 1–11 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (генератор кода: title, тема, ширина, проверка origin и source) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=d76e09a1e773917a1cd0986a4f518c799cf783e8eb2a4539aba4cb0975f7ff9f; output-bytes=1334; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, ссылки и SEO проходят (/embed/ не в sitemap)
  CHECK: npm run build && npm run check:links && npm run check:seo && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=e3b1b940a8fecb865ee3193e732fc3e6a0251311025014b3d8b3dff5cd832eb5; exit=0; EXPECT=matched; output-sha256=11b14477d188285f243077ec81c7fafb8616a1fcbd13c0bb28268bb3cf5fec2d; output-bytes=44583; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: виджет работает на тестовой странице с другого домена, высота подстраивается, чужой postMessage игнорируется, при OFFERS_ENABLED=true офферов в виджете нет, Метрика не грузится
  CHECK: npx playwright test tests/e2e/widget && echo GATE_E2E_WIDGET_OK
  EXPECT: GATE_E2E_WIDGET_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=3a691f783a9c6d070c49d1fd5cd7338712d6420af24786ac7c5279032b0fca5e; exit=0; EXPECT=matched; output-sha256=eac2d3832ffacda21f5c3a59b1c5c2c81e82224384ba81b4a9bf879dfb7bca4e; output-bytes=4677; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: Nginx: frame-ancestors * только для /embed/, без Метрики в CSP виджета (проверка конфигов)
  CHECK: npm run check:deploy && echo GATE_DEPLOY_OK
  EXPECT: GATE_DEPLOY_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=70a9ff43b3426b9c5fc68f22c26b9a23f8ccaf059136d2bce95b27506e6bd87b; exit=0; EXPECT=matched; output-sha256=8d322a831b783140d83c1c349e579d95baabdf71b4ca19498433ce3e072dd1e6; output-bytes=318; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=3f42c1375e0287070abf448e54a164ac3f6c8528f98b2926df24b643b8acc696; output-bytes=139234; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

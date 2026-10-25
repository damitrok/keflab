# Gates: шаг 5 — калькулятор экспресса и разбор для новичков

OWNS: app/**, tests/**, scripts/gates/**

Scope: /kalkulyator-ekspressa/ (поля и статусы, общий коэффициент, возврат, «если одно событие вернут») и /chto-takoe-sistema-v-stavkah/ (1 000–1 500 слов, мини-калькулятор, таблица систем из движка, ошибки новичков, FAQ), хлебные крошки и перекрёстные ссылки; гейты шагов 1–4 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты с порогом покрытия проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=c97a0710549ea9324a1db2bb6ee9f68e4560adc417e43421254314120a69d514; output-bytes=1135; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: числа таблицы типов систем совпадают с функциями шага 2 (тест)
  CHECK: npx vitest run tests/unit/system-table.test.ts && echo GATE_TABLE_OK
  EXPECT: GATE_TABLE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=97e38afea604411dc83474f2a0307f5b3e79edf19e0b56725652fbcdc80464c2; exit=0; EXPECT=matched; output-sha256=b8eb5a77174e350df029d727a4a1c8dbdb266f7624dc879c55a66d24590b0f89; output-bytes=227; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: сборка и проверка внешних ссылок проходят
  CHECK: npm run build && npm run check:links && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad3ac20e2f8c7659a16a201309363f82a8ee4d07697349e11427bd8d572c5ed8; exit=0; EXPECT=matched; output-sha256=101b47fa0706f4a8eae25603c8aae0fda92d16073a1456c2262941490f8f3255; output-bytes=19452; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: SSR: у каждой новой страницы ровно один H1, хлебные крошки и ссылки на калькуляторы; в статье от 1 000 до 1 500 слов
  CHECK: node scripts/gates/ssr-step5.mjs && echo GATE_SSR_STEP5_OK
  EXPECT: GATE_SSR_STEP5_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=57d58c7bcfdd9a64d29e003f171e63f7d31f1fcc24d2f221ddfb781370014467; exit=0; EXPECT=matched; output-sha256=13fd7ad19a01a5025267b5052b2144d295a06fa5a145c25604505feef1498de6; output-bytes=339; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e экспресса и статьи проходят
  CHECK: npx playwright test tests/e2e/express tests/e2e/article && echo GATE_E2E_STEP5_OK
  EXPECT: GATE_E2E_STEP5_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=9b017d7555331db2537e886e44b9011c5cbb7e25a1d767ddeedb1e4fa86cdb31; exit=0; EXPECT=matched; output-sha256=06ecdf198bfea50d6387668d2fcdd8c330d3ac8674106cb5bb8c77fbedbf57a9; output-bytes=10241; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: e2e всего сайта (регрессия шагов 1, 3, 4) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=02e23bab66b855b1e2a8f7e1e73d4be2229bdf57393884cc27d1a3202cf3c602; output-bytes=39767; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: стоп-слова из data/site.json не встречаются в тексте страниц сайта
  CHECK: node scripts/gates/stopwords.mjs && echo GATE_STOPWORDS_OK
  EXPECT: GATE_STOPWORDS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c8c48b436f964c3a770307b2cfdf076c022b648bfd7aa75e95f042da56041fe1; exit=0; EXPECT=matched; output-sha256=13627385ec21cbb055b19285d602bef07fb031cb515404eba2db7da4b47571c7; output-bytes=358; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

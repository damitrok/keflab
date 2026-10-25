# Gates: шаг 11 — мелкие калькуляторы

OWNS: app/**, shared/site-pages.ts, tests/**

Scope: /kalkulyatory/ с маржой (2–3 исхода, честные коэффициенты), сложением коэффициентов (движок экспресса), догоном (предупреждение до результата, без советов), конвертером (десятичные, дробные, американские, вероятность); у каждого 300–600 слов, FAQ и ссылка на главный калькулятор; гейты шагов 1–10 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (маржа 1,90/1,90 → 5,26; конвертер 2,50 ↔ 3/2 ↔ +150 ↔ 40 %; догон; объём текстов) с порогом покрытия проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=866c8d70d53e135a11c1daed57b7b358860effdcc20ccc0417d1374841e1f7ec; output-bytes=1335; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, ссылки, SEO и стоп-слова проходят
  CHECK: npm run build && npm run check:links && npm run check:seo && node scripts/gates/stopwords.mjs && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=76fb976bf62485ee6146a270f016bff51d9198b22f78f6aaa2212fc1a57412ce; exit=0; EXPECT=matched; output-sha256=34e6fd1fd3948058ab38916c01233649496ef31b2c8671b57fe227616ff676a2; output-bytes=42709; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: e2e мелких калькуляторов (приёмка ТЗ, предупреждение догона до результата, подсказка из калькулятора системы ведёт на конвертер) проходят
  CHECK: npx playwright test tests/e2e/small-calcs && echo GATE_E2E_SMALL_OK
  EXPECT: GATE_E2E_SMALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b0b60dfd0a79b95e2534e5863816e1b109ebbe6300f69e0a31464ca8b33cf160; exit=0; EXPECT=matched; output-sha256=d7bddd45395565d69fd55a3e147e5618fc428b8aa0bdaf12ff260ad250b5417a; output-bytes=16161; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e всего сайта (регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=a436ed91d3705254a5bdfdf8294c8b99ba020eb93454b6e16e0327a8f9881052; output-bytes=133145; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

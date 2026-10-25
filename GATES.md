# Gates: шаг 4 — ссылка на расчёт

OWNS: app/**, tests/**

Scope: состояние калькулятора в адресе (s, k, e, m), копирование ссылки с запасным полем, мягкая обработка мусора, noindex и canonical для страниц с параметрами; гейты шагов 1–3 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты, включая разбор и кодирование ссылки, проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=f249b715c72f39bc89ca7c4f2068c8a4a99643efb6b78bb5f0bdf551584a1a71; output-bytes=1131; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка и проверка внешних ссылок проходят
  CHECK: npm run build && npm run check:links && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad3ac20e2f8c7659a16a201309363f82a8ee4d07697349e11427bd8d572c5ed8; exit=0; EXPECT=matched; output-sha256=d2fe520d7eff8c4aaa01f793234f1f10051f1916b3ba75959c6321607f09a7a7; output-bytes=13616; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: e2e ссылки (восстановление в другом браузере, мусор, HTML в параметрах, replaceState, копирование и запасное поле, noindex и canonical) проходят
  CHECK: npx playwright test tests/e2e/share && echo GATE_E2E_SHARE_OK
  EXPECT: GATE_E2E_SHARE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f2aaf673a51ab7371bd299ccaeab707bbd95218065bb6a6bb76b958b47a115d3; exit=0; EXPECT=matched; output-sha256=cf4779eb0db9d0d6fe6a2cdb45c303695703244cfa22c21e0f4f7960254434a8; output-bytes=8213; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e всего сайта (регрессия шагов 1 и 3) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=112efd6cab7c8792bd5efaee2327209bd514d2f05bc1f9f6e12adf7171adf7d5; output-bytes=29554; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: SSR: страница с параметрами отдаёт noindex и canonical без параметров, а ?e=abc отвечает 200
  CHECK: node scripts/gates/ssr-share.mjs && echo GATE_SSR_SHARE_OK
  EXPECT: GATE_SSR_SHARE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8bc64095b9385c29fac1e3e451e23842f1319a3fe780eb236c4d2dec722c7420; exit=0; EXPECT=matched; output-sha256=7fd06f2a565feaedfef8b4b66a257953863c82d6dba93640907ddb4fbe5766b4; output-bytes=357; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

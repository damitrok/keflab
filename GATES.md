# Gates: шаг 9 — страницы систем K из N

OWNS: app/**, shared/site-pages.ts, scripts/gen-lastmod.mjs, tests/**

Scope: 21 страница /sistema-k-iz-n/ (3 ≤ N ≤ 8, 2 ≤ K < N) с калькулятором с заданными N и K, таблицей комбинаций и побед, примером из движка, сравнением с соседними системами, FAQ и ссылками; все в sitemap; гейты шагов 1–8 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (включая снапшот примера 3 из 5 против движка) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=01ad2a5f88bb94bb62405ae9ab7778a1d2fa069a55bae6904323f031b2a4b7b7; output-bytes=1335; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: собирается 21 страница систем, проверка ссылок проходит
  CHECK: npm run build && npm run check:links && test "$(ls -d .output/public/sistema-*-iz-*/ | wc -l | tr -d ' ')" = 21 && echo GATE_BUILD_21_OK
  EXPECT: GATE_BUILD_21_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=293ac61baa2f2b56ee9c6d2e284b9f50b48668fe78f2ea037d73c4f4ce2ada05; exit=0; EXPECT=matched; output-sha256=6ef045960d6840c6cd5e245db21af6a6a8287e035903403a5eb486da9ba5e47c; output-bytes=28573; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: у каждой страницы свои title и description, все 21 в sitemap, JSON-LD корректен
  CHECK: npm run check:seo && echo GATE_SEO_OK
  EXPECT: GATE_SEO_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=02a609cf37799a4465e56d5b2975655fd67d6122d56bd31247ed71fe1f41d7b1; exit=0; EXPECT=matched; output-sha256=91d4154407e4da53ae3503facf4be88daa756e09e5b8b4451892c6d36f7c5644; output-bytes=1223; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e страниц систем (сценарий с телефона «система 3 из 5», 404 для несуществующих, axe) проходят
  CHECK: npx playwright test tests/e2e/system-pages && echo GATE_E2E_SYSTEMS_OK
  EXPECT: GATE_E2E_SYSTEMS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=cab3e0fc56894b2e76c6ce0f815fc6f5c438ba4aba7793122298676a8ea1ba59; exit=0; EXPECT=matched; output-sha256=ed2f7d6c9b2add553ac37777b44cab3b9055d6be515773a59ff43f1c23cc505e; output-bytes=16067; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=1bff5f9ac0d8c894b1f7217bd827826dfaf2d8686a088146bc6141703fdf2dd6; output-bytes=110659; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: стоп-слова не встречаются на страницах (включая 21 систему)
  CHECK: node scripts/gates/stopwords.mjs && echo GATE_STOPWORDS_OK
  EXPECT: GATE_STOPWORDS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c8c48b436f964c3a770307b2cfdf076c022b648bfd7aa75e95f042da56041fe1; exit=0; EXPECT=matched; output-sha256=3000fdf84fa4566809943fde50fe3d451c0d4287a9269af01675e590736a8916; output-bytes=1345; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

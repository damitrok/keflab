# Gates: шаг 10 — правила букмекеров

OWNS: app/**, data/schema.ts, shared/**, scripts/**, tests/**

Scope: страницы /bk/<slug>/kak-schitaetsya-sistema/ из data/bookmakers.json — только с заполненными правилами и проверкой не старше 180 дней; дата проверки и источник видны, ссылок на сайт БК нет; калькулятор берёт правила БК (режим ставки, максимум событий, минимальная ставка на комбинацию); гейты шагов 1–9 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (схема БК, отбор по сроку проверки, данные страницы) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=d7fc95c980233c344630cd825360a43c38de95731c15d4a4897aa7c0559b5358; output-bytes=1334; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка на реальных данных, ссылки и SEO проходят
  CHECK: npm run check:data && npm run build && npm run check:links && npm run check:seo && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=91117c9ef5edfb36e1ca9f6967a239e7c651a2b087610700a03809a7503672ff; exit=0; EXPECT=matched; output-sha256=e0286bfa947aefe635e55a947b3e02b711328fe7c68708e0afdd2890ff7962a3; output-bytes=32959; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: БК без правил или с просроченной проверкой не попадает ни в сборку, ни в sitemap; на странице видны дата проверки и источник, ссылок на сайт БК нет (сборка копии с тестовыми данными)
  CHECK: node scripts/gates/bookmakers.mjs && echo GATE_BOOKMAKERS_OK
  EXPECT: GATE_BOOKMAKERS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=191949d53b08b8b16703f25717d36d866f4a7fe98d4a399c5856bb9ec2f9d26f; exit=0; EXPECT=matched; output-sha256=99db62191ef3ce9035639836986657e115259456caf853f3454800de2cf63181; output-bytes=940; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: битые данные всё так же роняют check:data (регрессия шага 1)
  CHECK: node scripts/check-data.ts --dir tests/fixtures/data-invalid > /dev/null 2>&1; test $? -ne 0 && echo GATE_DATA_NEGATIVE_OK
  EXPECT: GATE_DATA_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f9a228508814ec8aedbe205e6179d6604a84886899f306630f700734d817cc51; exit=0; EXPECT=matched; output-sha256=dd5f3de6c738264ecb93dac943ab833dc4eb4c92d772950fb29d30ee908d3b6e; output-bytes=22; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (регрессия калькуляторов) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=d511b248f88298212f6484b0b29650309fd70f5bb48af8bc86a13d45d76b9fa7; output-bytes=110611; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

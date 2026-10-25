# Gates: шаг 14 — калькулятор фрибета

OWNS: app/**, shared/site-pages.ts, tests/**

Scope: /kalkulyatory/fribet/ — сумма, минимальный коэффициент, тип (только выигрыш или со ставкой), маржа 5 % по умолчанию; выигрыш при заходе и ожидаемая ценность = выигрыш × 1 / (коэф. × (1 + маржа)); условия БК только через офферы шага 13; гейты шагов 1–13 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (1 000 / 2,00 / только выигрыш / маржа 0 → 1 000 и 500) с порогом покрытия проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=f0ee86ebdaccbc0d5d52484b1429860b89444dd83ce72dbfd1ed164c64d1b58b; output-bytes=1334; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, ссылки, SEO, стоп-слова проходят
  CHECK: npm run build && npm run check:links && npm run check:seo && node scripts/gates/stopwords.mjs && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=76fb976bf62485ee6146a270f016bff51d9198b22f78f6aaa2212fc1a57412ce; exit=0; EXPECT=matched; output-sha256=c9204478c99a66623bdaa2069618287c1560a00c4d3bfdd5d2693123893697b7; output-bytes=49890; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: e2e фрибета (приёмка ТЗ; с выключенными офферами нет названий БК и бонусов)
  CHECK: npx playwright test tests/e2e/freebet && echo GATE_E2E_FREEBET_OK
  EXPECT: GATE_E2E_FREEBET_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=bdf010e721b204a684a09dc91a8a08a8f8b90b8098066a9e3c396bfa9f3ae1f7; exit=0; EXPECT=matched; output-sha256=415d14ffa463bfaf3080243b08cf248cd237edc236d5fff83b9075e85ad4b112; output-bytes=3915; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e офферов на копии (в т. ч. блок на странице фрибета) проходят
  CHECK: node scripts/gates/offers-e2e.mjs && echo GATE_E2E_OFFERS_OK
  EXPECT: GATE_E2E_OFFERS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=4543ea127686075b8b3239eef9a9703135a9f5a799da667ef2bec37f52829344; exit=0; EXPECT=matched; output-sha256=941c3b9569842c1e9c1d5ef041e20d938d71a10b3ea70a533907f9325f2b2d1f; output-bytes=4641; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=5f227579b7ad9814a2e3a18e9943bc3f5f84a9ec2f5062857957c89314dcaf66; output-bytes=144262; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

# Gates: шаг 3 — калькулятор системы, интерфейс

OWNS: app/**, tests/**, scripts/gates/**

Scope: главная с калькулятором системы (форма, итог, комбинации, сценарии, сравнение), удобная на телефоне, доступная и с примером без JavaScript; гейты шагов 1–2 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (движок, форматирование, данные, ссылки) с порогом покрытия проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=f07ab4dd7a512bd3a4e16778eb94e08c41b373da9f93db5ad52d5044ec92feab; output-bytes=1131; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка и проверка внешних ссылок проходят
  CHECK: npm run build && npm run check:links && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad3ac20e2f8c7659a16a201309363f82a8ee4d07697349e11427bd8d572c5ed8; exit=0; EXPECT=matched; output-sha256=e95f73362293b63132c19151625d4e78cd0a8b54ddc04769979fbef1a987a71f; output-bytes=12987; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: e2e калькулятора (приёмка шага 3 и строки сценариев шага 3) на телефоне и компьютере проходят
  CHECK: npx playwright test tests/e2e/system-calc && echo GATE_E2E_CALC_OK
  EXPECT: GATE_E2E_CALC_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=bcfa07204f63f4373fd93640d6eaf9904893fd0e5ae7e6b8ea1406a6cbc33b09; exit=0; EXPECT=matched; output-sha256=dce529ff65b71efac36efa145ddd389740f31a7d50ca629daf1dcf11ab5d22ab; output-bytes=14413; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e всего сайта (каркас шага 1 — регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=802e43369f4fa1c61bc5b91c79077897c87c65ec3086593194265a2c9b6e3897; output-bytes=21377; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: без JavaScript в HTML главной есть H1, пример с 3 780,00 ₽ и сообщение про JavaScript
  CHECK: node scripts/gates/ssr-home.mjs && echo GATE_SSR_OK
  EXPECT: GATE_SSR_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8b9c69135be3ecb1c1a70bdf1848fc377e73241a62c9b8621a56492f8654acf9; exit=0; EXPECT=matched; output-sha256=d17d96bf3e330d2930fc3cb3d4b8544411562defb35bb51d3bd56b11b8f4a51e; output-bytes=156; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: e2e приёмки действительно ловит неверный итог (позитивный контроль)
  EVIDENCE: 2026-10-25 копия system-calc.spec.ts с ожиданием «3 781,00 ₽» вместо «3 780,00 ₽», тест «приёмка» на mobile: 1 failed, Expected "3 781,00 ₽", Received "3 780,00 ₽". Копия удалена.

- [x] G9: ручная проверка на телефоне 375 px: всё помещается, итог виден сразу после ввода
  EVIDENCE: 2026-10-25 встроенный браузер 375x812: пример ТЗ (3000, 1,80 W, 2,10 W, 1,65 L) → «Возврат 3 780,00 ₽ / Прибыль +780,00 ₽» без кнопки, scrollWidth 375 = clientWidth. Найдено и исправлено: вкладка «Сравнить» обрезалась — вкладки стали сеткой 3×1fr и 14px на узких экранах (scrollWidth = clientWidth у всех трёх). После reload состояние восстановлено из localStorage; при статусах «ждём» — «Итог ещё не рассчитан», сценарии «Зайдёт m из 3».

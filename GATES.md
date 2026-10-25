# Gates: шаг 2 — движок расчётов

OWNS: app/lib/calc/**, tests/unit/calc/**, vitest.config.ts, package.json

Scope: чистые функции одиночных, экспресса, системы K из N и сценариев на big.js с валидацией ввода; гейты шага 1 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: все юнит-тесты с порогом покрытия проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=d83a10f180fc0c01fc0a1362ae3090b43a4b0b85bb97614f707fae520feec6e7; output-bytes=1131; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка проходит
  CHECK: npm run build && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=872c86655172eb25600d31f1a4a92948cc504f90e772c61ded677724c9408387; exit=0; EXPECT=matched; output-sha256=dc0ee71ed92df82252931c4fe2674555fc78ba732f4a96d1141b5bdb2efa2077; output-bytes=8075; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: все приёмочные проверки из ТЗ (точные значения, сценарии 3 из 5, 8 из 16 быстрее 200 мс) проходят
  CHECK: npx vitest run tests/unit/calc/engine.test.ts -t "приёмка шага 2"
  EXPECT: /Tests\s+9 passed/
  EVIDENCE: automatic-evidence=v1; definition-sha256=cbcf989c7065718e780fe513b6fb1b6fbeed0e1df02929474a149f882832c6d0; exit=0; EXPECT=matched; output-sha256=6b5f942e3ea139544a0acd28a7e4961a4af3d85d9a3606d49f6e9c4097ad6198; output-bytes=224; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: строки сценариев шага 2 (ввод, все возвраты, все проигрыши, 1,005, неровное деление, купон в игре) покрыты тестами и проходят
  CHECK: npx vitest run tests/unit/calc -t "сценарии и крайние случаи шага 2|parseOdds|parseStake" && echo GATE_SCENARIOS_OK
  EXPECT: GATE_SCENARIOS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=26e0c0c0afe81ffa49659e35b73ad65e21f3796bb5c175239817068733ce180f; exit=0; EXPECT=matched; output-sha256=7cc6591f8987d6dbc1c0ae866ddda62bf31da70e9561b894ecabcc5236505030; output-bytes=243; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: быстрые сценарии совпадают с полным перебором подмножеств
  CHECK: npx vitest run tests/unit/calc/engine.test.ts -t "полного перебора" && echo GATE_BRUTE_OK
  EXPECT: GATE_BRUTE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=7195ce23574acae5ef82d60a5e0252ef1ede958ddca8ec8e98538533510a5478; exit=0; EXPECT=matched; output-sha256=22b2d8a91b2197b778c43d3ea65d4ce0771aecc57cfb23ed8c3c21474a75a007; output-bytes=238; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: покрытие app/lib/calc не меньше порога в строках
  CHECK: npx vitest run tests/unit/calc --coverage && echo GATE_COVERAGE_OK
  EXPECT: GATE_COVERAGE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f9d0eedd33373b747b4cb4a2f16a99993a9d4dcf2f693515dbc562b79926f86a; exit=0; EXPECT=matched; output-sha256=0f709ed56a2e823469d12353318d1b1c4d468cf90d4c264514d06678a0bb1298; output-bytes=1087; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: порог покрытия действительно роняет прогон (позитивный контроль: порог 101%)
  CHECK: npx vitest run tests/unit/calc --coverage --coverage.thresholds.lines=101 > /dev/null 2>&1; test $? -ne 0 && echo GATE_COVERAGE_NEGATIVE_OK
  EXPECT: GATE_COVERAGE_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=93b644fa5a245240466b76b7e539fab2d019837a17f06d64dbfa40637643be7e; exit=0; EXPECT=matched; output-sha256=e4a59f81ec1af4118eacdc78a00126da36802f4319a6ecbc588a13af44ec2ffa; output-bytes=26; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G10: независимое ревью денежной логики (surgeon-reviewer) без неисправленных проблем
  EVIDENCE: 2026-10-25 surgeon-reviewer: WILL BREAK нет, вердикт SHIP WITH FIXES; доказательство монотонности сценариев проверено, 300 случайных купонов против перебора со всеми 6 статусами. Исправлено: (1) признак rowsDifferFromTotal — сумма строк ≠ итог (тест 1,85×3 → 342,25 против 342,24); (2) лимит 10 000 000 от общей ставки в режиме «на комбинацию» — ошибка total_stake_too_large, решение вынесено в TODO.md; (3) scenarios бросает ошибку при параметрах от другого числа событий; в перебор добавлены half_win/half_lose. Нагрузка 8 из 16 (~42 мс на Node) — учесть в шаге 3.

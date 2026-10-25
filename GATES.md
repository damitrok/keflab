# Gates: шаг 1 — каркас проекта

OWNS: **

Scope: пустой Nuxt-проект keflab.ru с проверками качества, схемами data/*.json, базовым макетом с 18+ и CI.

- [x] G1: линтер (ESLint + Prettier) проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов vue-tsc в strict проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=a62139575085558a934ddb4a0fec5600711b95938a0b10fa1e5cb9cc745467f7; output-bytes=260; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка проходит
  CHECK: npm run build && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=872c86655172eb25600d31f1a4a92948cc504f90e772c61ded677724c9408387; exit=0; EXPECT=matched; output-sha256=151191d7da362bb9c8c8bc1904bd35ac3547a67903decac119f772ffa5bd9144; output-bytes=8075; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: все data/*.json проходят схемы
  CHECK: npm run check:data && echo GATE_DATA_OK
  EXPECT: GATE_DATA_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2f7ec24dd8a772924f793f116da97b65c003db692016363b0844603e64531f1e; exit=0; EXPECT=matched; output-sha256=d614293886a288c2bfa8739e1ec343b03cad4992a5778496cb997dd365c57665; output-bytes=136; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: битый data/*.json роняет проверку с понятным сообщением (файл и поле)
  CHECK: node scripts/check-data.ts --dir tests/fixtures/data-invalid > /dev/null 2>&1; test $? -ne 0 && node scripts/check-data.ts --dir tests/fixtures/data-invalid 2>&1 | grep -q 'offers.json' && echo GATE_DATA_NEGATIVE_OK
  EXPECT: GATE_DATA_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2240e66e30a851cf09c08b117f3e58586cfab87fe6182e5dfeab8bfca499ac23; exit=0; EXPECT=matched; output-sha256=dd5f3de6c738264ecb93dac943ab833dc4eb4c92d772950fb29d30ee908d3b6e; output-bytes=22; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e — главная открывается, в подвале 18+ и ссылки на служебные страницы, axe без serious/critical, 375 px без горизонтальной прокрутки
  CHECK: npm run test:e2e && echo GATE_E2E_OK
  EXPECT: GATE_E2E_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=e2193fd73f07480f4d29afb58e1bce3dd5719e4a904ba4f5b01fd4bfbc180db4; exit=0; EXPECT=matched; output-sha256=3f7314d5fe34db2ce022388b69edfcffb04770ee603075940c6004bdab29203a; output-bytes=6922; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: внешние ссылки только на домены из allowlist
  CHECK: npm run check:links && echo GATE_LINKS_OK
  EXPECT: GATE_LINKS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c5db2bbda8cce9abc6f73432ff60416b2f7965a6c56289da1c1ee83e45826979; exit=0; EXPECT=matched; output-sha256=6093ad630b82e179b02fcf49f521e6c4d96b65b91491b8b8d898d0cf4e1ed4a7; output-bytes=128; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: ссылка на домен вне allowlist роняет check:links (позитивный контроль)
  CHECK: node scripts/check-links.ts --root tests/fixtures/links-bad > /dev/null 2>&1; test $? -ne 0 && echo GATE_LINKS_NEGATIVE_OK
  EXPECT: GATE_LINKS_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=585609d16ca6bad7d91b62139aa859b4397b6d7108348108c2a42a7dd820c7fe; exit=0; EXPECT=matched; output-sha256=6cc625ab8579ee53a6f34b0f36a04938e3e45c7eca21f023e7fecb4aeb2e731f; output-bytes=23; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G10: CI: на push — lint, typecheck, check:data, unit, build, check:links; на main — ещё e2e и Lighthouse CI
  EVIDENCE: 2026-10-25 ручная проверка .github/workflows/ci.yml: YAML разобран, job check без условия (check:data, lint, typecheck, test, build, check:links), job e2e и lighthouse с if main и needs check; все npm run-скрипты из workflow есть в package.json. Реальный прогон в GitHub Actions — после первого push (удалённого репозитория пока нет).

- [x] G11: на чистой машине (свежая копия без node_modules, npm ci) lint, typecheck, test, build проходят
  EVIDENCE: 2026-10-25 копия файлов из git ls-files в scratchpad, без node_modules/.nuxt/.output: npm ci OK, lint OK, typecheck OK, test 3 файла / 41 тест OK, build OK, check:data OK, check:links OK (Node 22.23.2, macOS).

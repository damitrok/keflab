# Gates: шаг 15 — сопровождение

OWNS: scripts/**, tests/**, .github/**, README.md, deploy/**, package.json

Scope: check:offers, check:links (битые и внешние вне allowlist, трекинговые ссылки), check:rules, report за месяц (CSV по erid по Москве), еженедельный npm audit и ежедневные проверки по расписанию, ежемесячный и ежеквартальный чек-листы в README; гейты шагов 1–14 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (check-rules, report, check-links, check-offers) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=181e9165c5153cc549d5b3438e81e4faad9259333e4af572c92b04bcfdea5a71; output-bytes=1334; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: на реальных данных все проверки проходят, сборка и битые ссылки чисты
  CHECK: npm run check:offers && npm run check:rules && npm run build && npm run check:links && node scripts/check-links.ts --external && echo GATE_CHECKS_OK
  EXPECT: GATE_CHECKS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=a1a51a01ae89a56ab0f50493f5d3bf8bd9bc9c683e9c9bd6f671467ad2417655; exit=0; EXPECT=matched; output-sha256=6a5e839628045f6fa7833ef41c6ce3847b999e6c080136d832bfdf35a8679933; output-bytes=47312; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: check:offers завершается с ненулевым кодом при найденной проблеме (оффер без erid)
  CHECK: node scripts/check-offers.mjs --dir tests/fixtures/offers/no-erid > /dev/null 2>&1; test $? -ne 0 && echo GATE_OFFERS_NEGATIVE_OK
  EXPECT: GATE_OFFERS_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=13b1ae707d1b0d5b5820d45622a0a41dc19c7baf2e9961cd1f1b4a42fb532fb7; exit=0; EXPECT=matched; output-sha256=c3274cf817ff76aed0f160bde1d5d1b40bfa224bf2abef8dbf551a4f1508f283; output-bytes=24; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: check:rules завершается с ненулевым кодом при правилах старше 180 дней
  CHECK: node scripts/check-rules.mjs --dir tests/fixtures/rules/stale > /dev/null 2>&1; test $? -ne 0 && echo GATE_RULES_NEGATIVE_OK
  EXPECT: GATE_RULES_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=fee7a9129d6f8bb98a06c040be0e6eb0d619f003190863a046baf89cf888b8b6; exit=0; EXPECT=matched; output-sha256=fedf71e83eeace7b05013b4491dc7f3afc9608ec2c631c76d4b854a3a4108abb; output-bytes=23; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: check:links завершается с ненулевым кодом при внешней ссылке вне allowlist
  CHECK: node scripts/check-links.ts --root tests/fixtures/links-bad --no-internal > /dev/null 2>&1; test $? -ne 0 && echo GATE_LINKS_NEGATIVE_OK
  EXPECT: GATE_LINKS_NEGATIVE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=5a6dbcfc2301ff10005643b9d60bc1387402c6b94d40276178747f135fd1de98; exit=0; EXPECT=matched; output-sha256=6cc625ab8579ee53a6f34b0f36a04938e3e45c7eca21f023e7fecb4aeb2e731f; output-bytes=23; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: отчёт за месяц выдаёт CSV с заголовком по erid
  CHECK: npm run --silent report -- --month=2026-10 2>/dev/null | grep -q "erid" && echo GATE_REPORT_OK
  EXPECT: GATE_REPORT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8c69dab1355bfc7427a0e817b20b89f8ec02611189cf3670278eecc6e19d9542; exit=0; EXPECT=matched; output-sha256=f426aa06280d50ce3c04b5e950072b90b186dcf6cf22333343aeaf03d8cfde3e; output-bytes=15; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: в README есть ежемесячный и ежеквартальный чек-листы, расписания проверок разбираются
  CHECK: grep -q "Ежемесячно" README.md && grep -q "Ежеквартально" README.md && node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/scheduled.yml','utf8'))" && npm run check:deploy > /dev/null && echo GATE_README_OK
  EXPECT: GATE_README_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f96dd00f7a31fe26f0dced7509893758ec9072f4f2074e54b707ac48e5269fe4; exit=0; EXPECT=matched; output-sha256=67d534a746fd86b0083b3947b26a29cf9f315242873e6c009377df6a8c471ab6; output-bytes=15; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G10: e2e всего сайта (регрессия) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=df52dc9a8cf97c6191f444321cf16c297a2b44f7530d1c887765994c7bbce19b; output-bytes=144277; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G11: еженедельный аудит продакшен-зависимостей проходит с учётом пересматриваемых исключений и падает без них (позитивный контроль)
  CHECK: npm run --silent audit:prod > /dev/null && echo '[]' > "${TMPDIR:-/tmp}/keflab-noex.json" && ! AUDIT_EXCEPTIONS="${TMPDIR:-/tmp}/keflab-noex.json" node scripts/audit.mjs > /dev/null 2>&1 && echo GATE_AUDIT_OK
  EXPECT: GATE_AUDIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=566436730d9fa69046b8cced2d6d44efa240cfc3675042ee216c44b497d5b4a3; exit=0; EXPECT=matched; output-sha256=e0917a159216e43642ec50bca7937064944cec3d39a4f5fa3703d0468bc55374; output-bytes=14; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

# Gates: шаг 8 — аналитика, выпуск, мониторинг

OWNS: app/**, server/**, scripts/**, tests/**, deploy/**, .github/**, README.md, .env.example, package.json

Scope: цели Метрики (calc_used, scenario_opened, compare_opened, share_copied; заготовки для виджета и офферов), Nginx (HTTPS, HTTP/2, сжатие, кэш статики, заголовки безопасности, /go без IP), выпуск из GitHub Actions по SSH и откат одной командой, staging под паролем и noindex, мониторинг ошибок без пользовательских данных, нагрузочный тест, README; гейты шагов 1–7 — в истории git. Реальные VPS, домен и сервис мониторинга — за человеком.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (цели, приём ошибок) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=d1014b3e599e71e1fcc459c9136a3916584a653d83c3964924caa78375e457bc; output-bytes=1335; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка, ссылки и SEO проходят
  CHECK: npm run build && npm run check:links && npm run check:seo && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=e3b1b940a8fecb865ee3193e732fc3e6a0251311025014b3d8b3dff5cd832eb5; exit=0; EXPECT=matched; output-sha256=578bc6af2f2c10257270ec6dcfbf3018bde7d2160afbc1ba68e05d6ed194cee5; output-bytes=26766; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: цели Метрики срабатывают только после согласия на cookie (локально, вместо staging)
  CHECK: npx playwright test tests/e2e/goals tests/e2e/ops && echo GATE_E2E_GOALS_OK
  EXPECT: GATE_E2E_GOALS_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1c9c855452eb0d819db49bb8ff22561f43e473f45dce1322718078699a2db041; exit=0; EXPECT=matched; output-sha256=73f0fd384619e5d042a949d6b860fe058c69cd807081c0c434c08480bdeed256; output-bytes=3201; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: e2e всего сайта (регрессия шагов 1–7) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=999011307cc8ea35aca6942f4d13fa2aefe487e0a1ff05eb191b9a6ebc771bda; output-bytes=69243; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: нагрузочный тест локально: 100 rps на главную и 20 rps на /api/geo без ошибок
  CHECK: node scripts/gates/load.mjs && echo GATE_LOAD_OK
  EXPECT: GATE_LOAD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=72a24680db8242936044177a8ee05f5ade75ae69a6449583afbc1694fdadb8a9; exit=0; EXPECT=matched; output-sha256=39d54c073d46ee3d9623d93f43b74b28bb7de23973fd90629266960e37b9b4c3; output-bytes=1864; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: скрипты выпуска и отката синтаксически корректны, workflow выпуска разбирается
  CHECK: for f in deploy/scripts/*.sh; do bash -n "$f" || exit 1; done && node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/deploy.yml','utf8'))" && echo GATE_DEPLOY_SYNTAX_OK
  EXPECT: GATE_DEPLOY_SYNTAX_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=5dae5d8330604b80113697500f04665f012869c97eb38a1829f2f448efedc8c4; exit=0; EXPECT=matched; output-sha256=d839cc468a4990b2661c87f2fcea32c3ac45f42f2e240b87060577d21a6acafc; output-bytes=22; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G9: ревью заголовков безопасности и конфигов Nginx (security-auditor) без неисправленных проблем
  EVIDENCE: 2026-10-25 security-auditor: вердикт «нельзя выпускать» — 2 блокера (env для deploy, права статики для www-data), 1 высокая (CSP-include от deploy разбирался root-nginx — путь к root), 3 средних (CRLF в редиректе через $uri, сборка и SSH-ключ в одной задаче, полные IP в логах порта 80 и error.log /go), низкие (обход CI вручную, default 443, server_tokens, /api/error с чужих сайтов и C1/bidi-символы, повторный выпуск того же sha, X-Forwarded-For, юнит systemd). Всё исправлено: root-утилита keflab-install-csp и sudoers без nginx -t/reload, map по $request_uri, build без секретов и deploy без npm, access_log/error_log crit, проверка CI перед ручным выпуском, isSameOriginReport и Cc/Cf в приёме ошибок (тесты), изоляция юнитов. check:deploy проверяет исправления мутационно (include из /srv и $uri в return ловятся); песочница выпуска и отката — 16 сценариев зелёные. Без VPS не проверено: nginx -t, systemd-analyze — в TODO.

- [ ] G10: прод открывается по HTTPS из России, staging закрыт паролем и не индексируется, откат меньше 5 минут
  EVIDENCE: pending

ABANDON: G10 нужен реальный VPS в России, домен keflab.ru, DNS и сертификаты — за человеком (README «Восстановление на новом VPS», TODO.md шаг 8); конфиги, выпуск и откат проверены в песочнице.

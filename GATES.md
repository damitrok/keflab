# Gates: шаг 6 — техническое SEO

OWNS: app/**, server/**, shared/**, scripts/**, tests/**, nuxt.config.ts, package.json, lighthouserc.json, .github/**

Scope: предсборка статических страниц и SSR для страниц с параметрами, title/description/OG/canonical, robots.txt, sitemap.xml с lastmod, 404 и 410, BreadcrumbList/FAQPage/WebApplication, один формат адресов со слешем и 301, метатеги подтверждения из окружения, скорость; гейты шагов 1–5 — в истории git.

- [x] G1: линтер проходит
  CHECK: npm run lint && echo GATE_LINT_OK
  EXPECT: GATE_LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b8a521fb2d264c92ba21960957f8ae56e7ce0453a0d83f38db5de916d63ef00f; exit=0; EXPECT=matched; output-sha256=48a896375ad6f710c6ea06070240a4f397d3ce923003a45804043184b1b21c89; output-bytes=134; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G2: проверка типов проходит
  CHECK: npm run typecheck && echo GATE_TYPECHECK_OK
  EXPECT: GATE_TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=b55b7c8e520339601268674b6c62c81c5cacdb718784d554a415fcb725729f4c; exit=0; EXPECT=matched; output-sha256=f8a32e4b14dc4337629dcd24f60c8f4d15d8c76e0724450727ed7a03fa888cb4; output-bytes=62; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G3: юнит-тесты (включая sitemap, 301, JSON-LD) проходят
  CHECK: npm test && echo GATE_UNIT_OK
  EXPECT: GATE_UNIT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=278326bc14f1fc435a51db07db8624860d16173663ef6c5591119aeb225f8f38; exit=0; EXPECT=matched; output-sha256=90581979c428a3870af6e17be13f45de0d9f6d6a68b2386f8a53d8d749088f27; output-bytes=1135; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G4: сборка с предсборкой страниц и проверка внешних ссылок проходят
  CHECK: npm run build && npm run check:links && echo GATE_BUILD_OK
  EXPECT: GATE_BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad3ac20e2f8c7659a16a201309363f82a8ee4d07697349e11427bd8d572c5ed8; exit=0; EXPECT=matched; output-sha256=3ba7bc93103308bc1bc6f82882bfb59b8457683a0ae968d70d3b2f2463e35070; output-bytes=20955; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G5: в sitemap все индексируемые страницы и ни одной с noindex; title уникальны и до 60 символов; description до 160; canonical, OG и JSON-LD корректны
  CHECK: npm run check:seo && echo GATE_SEO_OK
  EXPECT: GATE_SEO_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=02a609cf37799a4465e56d5b2975655fd67d6122d56bd31247ed71fe1f41d7b1; exit=0; EXPECT=matched; output-sha256=91d4154407e4da53ae3503facf4be88daa756e09e5b8b4451892c6d36f7c5644; output-bytes=1223; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G6: проверка SEO ловит дубликат title, длинный title и noindex в sitemap (позитивный контроль)
  CHECK: node scripts/check-seo.mjs --self-test && echo GATE_SEO_SELFTEST_OK
  EXPECT: GATE_SEO_SELFTEST_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=9d9ea52fd6962769fc48d2e0ec9ca018a97d3972f2bafd11a4c77b29593a20c9; exit=0; EXPECT=matched; output-sha256=623017e6c11438f550e177fd824037e1d522fb8f11fae1e5148a2454033b9783; output-bytes=1280; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G7: e2e всего сайта (включая 301, 404, sitemap) проходят
  CHECK: npm run test:e2e && echo GATE_E2E_ALL_OK
  EXPECT: GATE_E2E_ALL_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a51bae5a0e8c04dc3acb33e51b9c6736f20d2db217beea5c76c9cfd1410b16b; exit=0; EXPECT=matched; output-sha256=77a93435b4dc9b8994b38d2c22173716c1ce9e9a5b8fbc61fd5ea12314b95b7c; output-bytes=45884; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [x] G8: Lighthouse на телефоне: Performance от 90, SEO и Accessibility от 95 на пяти ключевых страницах
  CHECK: CHROME_PATH="$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/'Google Chrome for Testing.app' | tail -1)/Contents/MacOS/Google Chrome for Testing" npm run lhci && echo GATE_LIGHTHOUSE_OK
  EXPECT: GATE_LIGHTHOUSE_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=d19a8a4f30ea0edf5dddf2326f33913bc1e742f8f9430eac542bc0538fc57919; exit=0; EXPECT=matched; output-sha256=9ed54774b23421138aa546b375d4d2f731d336368d111b767caf786efa80f813; output-bytes=1102; shell=/bin/sh; cwd=/Users/dmitriymitrokhin/Desktop/my-project/betting; path=f54d7d698ebf/18 entries

- [ ] G9: валидатор микроразметки Яндекса без ошибок
  EVIDENCE: pending

ABANDON: G9 валидатор Яндекса (webmaster.yandex.ru/tools/microtest/) — внешний сервис под аккаунтом человека; локально структура JSON-LD проверена check:seo (G5). Передано человеку в TODO.md, шаг 6.

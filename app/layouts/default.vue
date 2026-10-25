<script setup lang="ts">
// Подтверждение прав в Вебмастере и Search Console: только непустые значения.
const { public: site } = useRuntimeConfig()
const verification = [
  { name: 'yandex-verification', content: site.yandexVerification },
  { name: 'google-site-verification', content: site.googleVerification },
].filter((m) => m.content)

useHead({ meta: verification })

// Сохранённый выбор по cookie читаем только в браузере; на сервере баннера нет.
const consent = useConsent()
onMounted(() => consent.load())
</script>

<template>
  <div class="layout">
    <a class="skip-link" href="#content">Перейти к содержанию</a>
    <SiteHeader />
    <main id="content" class="layout__main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
    <CookieBanner />
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;

  &__main {
    flex: 1 0 auto;
    width: 100%;
    max-width: var(--page-max-width);
    margin: 0 auto;
    padding: var(--spacing-40) var(--spacing-16) var(--spacing-56);

    &:focus {
      outline: none;
    }
  }
}

.skip-link {
  position: absolute;
  left: var(--spacing-8);
  top: -100px;
  z-index: 10;
  padding: var(--spacing-8) var(--spacing-16);
  background: var(--color-chalk);
  color: var(--color-obsidian-canvas);
  border-radius: var(--radius-buttons);
  text-decoration: none;

  &:focus {
    top: var(--spacing-8);
  }
}

@media (min-width: 768px) {
  .layout__main {
    padding: var(--spacing-80) var(--spacing-24) var(--spacing-96);
  }
}
</style>

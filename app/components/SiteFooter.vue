<script setup lang="ts">
const { openSettings } = useConsent()
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__info">
        <div class="site-footer__age">
          <LegalAgeMark />
          <LegalReferenceNotice />
        </div>
        <LegalResponsibleGamingLink />
        <LegalMediaImprint />
      </div>
      <nav class="site-footer__nav" aria-label="Служебные страницы">
        <ul class="site-footer__list">
          <li><NuxtLink to="/o-proekte/">О проекте</NuxtLink></li>
          <li><NuxtLink to="/reklama/">Реклама на сайте</NuxtLink></li>
          <li>
            <NuxtLink to="/politika-konfidencialnosti/">Политика конфиденциальности</NuxtLink>
          </li>
          <li><NuxtLink to="/otvetstvennaya-igra/">Ответственная игра</NuxtLink></li>
          <li>
            <button type="button" class="site-footer__link-button" @click="openSettings">
              Настройки cookie
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.site-footer {
  border-top: 1px solid var(--color-carbon-lift);

  &__inner {
    display: grid;
    gap: var(--spacing-32);
    max-width: var(--page-max-width);
    margin: 0 auto;
    padding: var(--spacing-40) var(--spacing-16);
  }

  &__info {
    display: grid;
    gap: var(--spacing-16);
    align-content: start;
  }

  &__age {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-16);
  }

  &__list {
    display: grid;
    gap: var(--spacing-8);
    margin: 0;
    padding: 0;
    list-style: none;

    a,
    button {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--color-pale-stone);
      font-size: var(--text-body-sm);
      text-decoration: none;
      transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        color: var(--color-chalk);
        text-decoration: underline;
      }
    }
  }

  &__link-button {
    padding: 0;
    border: 0;
    background: none;
    font-family: inherit;
    cursor: pointer;
  }
}

@media (min-width: 768px) {
  .site-footer {
    &__inner {
      grid-template-columns: 1fr auto;
      padding: var(--spacing-56) var(--spacing-24);
    }

    &__info {
      max-width: 420px;
    }
  }
}
</style>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <NuxtLink to="/" class="site-header__brand">keflab.ru</NuxtLink>
      <nav class="site-header__nav" aria-label="Калькуляторы">
        <NuxtLink to="/" class="site-header__link">Система</NuxtLink>
        <NuxtLink to="/kalkulyator-ekspressa/" class="site-header__link">Экспресс</NuxtLink>
        <NuxtLink to="/kalkulyatory/" class="site-header__link">Ещё</NuxtLink>
        <NuxtLink to="/chto-takoe-sistema-v-stavkah/" class="site-header__link">Разбор</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="scss">
.site-header {
  border-bottom: 1px solid var(--color-carbon-lift);

  &__inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0 var(--spacing-16);
    max-width: var(--page-max-width);
    min-height: 64px;
    margin: 0 auto;
    padding: 0 var(--spacing-16);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--color-bone);
    font-family: var(--font-geist-mono);
    font-size: var(--text-body-sm);
    letter-spacing: var(--tracking-caption);
    text-decoration: none;
  }

  &__nav {
    display: flex;
    gap: var(--spacing-16);
  }

  &__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--color-pale-stone);
    font-size: var(--text-body-sm);
    text-decoration: none;

    &:hover,
    &.router-link-exact-active {
      color: var(--color-bone);
    }

    &.router-link-exact-active {
      text-decoration: underline;
      text-underline-offset: 6px;
    }
  }
}

@media (min-width: 768px) {
  .site-header__inner {
    padding: 0 var(--spacing-24);
  }
}
</style>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <NuxtLink to="/" class="site-header__brand">keflab.ru</NuxtLink>
    </div>
  </header>
</template>

<style scoped lang="scss">
.site-header {
  border-bottom: 1px solid var(--color-carbon-lift);

  &__inner {
    display: flex;
    align-items: center;
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
}

@media (min-width: 768px) {
  .site-header__inner {
    padding: 0 var(--spacing-24);
  }
}
</style>

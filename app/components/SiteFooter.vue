<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__age">
        <LegalAgeMark />
        <!-- TODO(legal): формулировку утверждает юрист, текст переедет в data/site.json на шаге 7 -->
        <p class="site-footer__note">
          Сайт содержит справочные расчёты и не является предложением делать ставки.
        </p>
      </div>
      <nav class="site-footer__nav" aria-label="Служебные страницы">
        <ul class="site-footer__list">
          <li><NuxtLink to="/o-proekte/">О проекте</NuxtLink></li>
          <li><NuxtLink to="/reklama/">Реклама на сайте</NuxtLink></li>
          <li>
            <NuxtLink to="/politika-konfidencialnosti/">Политика конфиденциальности</NuxtLink>
          </li>
          <li><NuxtLink to="/otvetstvennaya-igra/">Ответственная игра</NuxtLink></li>
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

  &__age {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-16);
  }

  &__note {
    margin: 0;
    color: var(--color-pale-stone);
    font-size: var(--text-body-sm);
    line-height: var(--leading-body-sm);
  }

  &__list {
    display: grid;
    gap: var(--spacing-8);
    margin: 0;
    padding: 0;
    list-style: none;

    a {
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
}

@media (min-width: 768px) {
  .site-footer {
    &__inner {
      grid-template-columns: 1fr auto;
      padding: var(--spacing-56) var(--spacing-24);
    }

    &__age {
      max-width: 420px;
    }
  }
}
</style>

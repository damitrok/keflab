<template>
  <p class="rg-link">
    <!-- TODO(legal): формулировку утверждает юрист. -->
    <NuxtLink to="/otvetstvennaya-igra/">
      Ответственная игра: как ограничить себя и куда обратиться за помощью
    </NuxtLink>
  </p>
</template>

<style scoped lang="scss">
.rg-link {
  margin: 0;
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-sm);

  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--color-bone);
    text-decoration: underline;
  }
}
</style>

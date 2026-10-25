<template>
  <div class="faq" data-testid="faq">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.faq {
  display: grid;
  gap: var(--spacing-8);
  margin-bottom: var(--spacing-16);
}

.faq :deep(details) {
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-cards);
}

.faq :deep(summary) {
  min-height: 44px;
  padding: 10px 16px;
  color: var(--color-bone);
  cursor: pointer;
}

.faq :deep(details > p) {
  margin: 0;
  padding: 0 16px 16px;
  color: var(--color-pale-stone);
}
</style>

<template>
  <span class="age-mark" role="img" aria-label="Только для лиц старше 18 лет">18+</span>
</template>

<style scoped lang="scss">
.age-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 28px;
  padding: 0 var(--spacing-8);
  border: 1px solid var(--color-pale-stone);
  border-radius: var(--radius-sm);
  color: var(--color-bone);
  font-family: var(--font-geist-mono);
  font-size: var(--text-body-sm);
  line-height: 1;
  white-space: nowrap;
}
</style>

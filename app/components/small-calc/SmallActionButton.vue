<template>
  <button type="button" class="btn"><slot /></button>
</template>

<style scoped lang="scss">
.btn {
  min-height: 48px;
  padding: 0 var(--spacing-24);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-buttons);
  background: transparent;
  color: var(--color-bone);
  font: inherit;
  cursor: pointer;

  &:disabled {
    color: var(--color-warm-granite);
    cursor: not-allowed;
  }
}
</style>

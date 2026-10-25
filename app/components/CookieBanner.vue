<script setup lang="ts">
const { bannerOpen, choice, accept, reject } = useConsent()
// В виджете (/embed/) баннера и аналитики нет.
const isEmbed = useIsEmbed()

const acceptButton = ref<HTMLButtonElement | null>(null)
// Фокус не берём при первой загрузке; только когда баннер открыли из «Настройки cookie».
const hadChoice = computed(() => choice.value !== null)

watch(bannerOpen, async (open) => {
  if (open && hadChoice.value) {
    await nextTick()
    acceptButton.value?.focus()
  }
})

function onEscape() {
  // Escape закрывает без смены выбора, только если выбор уже был.
  if (hadChoice.value) bannerOpen.value = false
}
</script>

<template>
  <section
    v-if="bannerOpen && !isEmbed"
    class="cookie-banner"
    role="region"
    aria-label="Cookie"
    @keydown.esc="onEscape"
  >
    <!-- TODO(legal): текст баннера утверждает юрист -->
    <p class="cookie-banner__text">
      Сайт использует cookie Яндекс Метрики для статистики посещений, только если вы согласны.
      Калькулятор работает и без этого.
      <NuxtLink to="/politika-konfidencialnosti/">Политика конфиденциальности</NuxtLink>
    </p>
    <div class="cookie-banner__actions">
      <button ref="acceptButton" type="button" class="cookie-banner__button" @click="accept">
        Принять
      </button>
      <button type="button" class="cookie-banner__button" @click="reject">Отклонить</button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cookie-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  max-height: 30vh;
  overflow-y: auto;
  display: grid;
  gap: var(--spacing-8);
  padding: var(--spacing-8) var(--spacing-16);
  background: var(--color-carbon-lift);
  border-top: 1px solid var(--color-ash-stroke);
  color: var(--color-bone);

  &__text {
    margin: 0;
    font-size: var(--text-body-sm);
    line-height: var(--leading-body-sm);

    a {
      color: var(--color-bone);
      text-decoration: underline;
    }
  }

  &__actions {
    display: flex;
    gap: var(--spacing-8);
  }

  // Обе кнопки одинаковы по весу: без тёмных паттернов.
  &__button {
    flex: 1 1 0;
    min-height: 44px;
    padding: 0 var(--spacing-16);
    border: 1px solid var(--color-pale-stone);
    border-radius: var(--radius-buttons);
    background: transparent;
    color: var(--color-bone);
    font: inherit;
    font-size: var(--text-body-sm);
    cursor: pointer;
    transition:
      color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      color: var(--color-chalk);
      border-color: var(--color-chalk);
    }

    &:focus-visible {
      outline: 2px solid var(--color-chalk);
      outline-offset: 2px;
    }
  }
}

@media (min-width: 768px) {
  .cookie-banner {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--spacing-24);
    padding: var(--spacing-16) var(--spacing-24);

    &__button {
      flex: 0 0 auto;
      min-width: 140px;
    }
  }
}
</style>

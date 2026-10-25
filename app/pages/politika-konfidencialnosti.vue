<script setup lang="ts">
const breadcrumbs = [{ label: 'Главная', to: '/' }, { label: 'Политика конфиденциальности' }]

const { openSettings } = useConsent()

usePageSeo({
  path: '/politika-konfidencialnosti/',
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности keflab.ru: какие данные обрабатываются и как. Страница готовится.',
  breadcrumbs,
})
</script>

<template>
  <div>
    <Breadcrumbs :items="breadcrumbs" />
    <div class="prose">
      <h1>Политика конфиденциальности</h1>
      <section>
        <!-- TODO(legal): факты о продукте, нужна вычитка юристом. -->
        <h2>Какие данные мы собираем</h2>
        <ul>
          <li>На сайте нет аккаунтов и форм с персональными данными.</li>
          <li>Аналитика — только Яндекс Метрика и только после вашего согласия на cookie.</li>
          <li>
            Калькулятор хранит последний расчёт в вашем браузере, на сервер он не отправляется.
          </li>
        </ul>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Cookie и Яндекс Метрика</h2>
        <button type="button" class="prose__button" @click="openSettings">
          Изменить настройки cookie
        </button>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
      <section>
        <!-- TODO(legal): текст раздела утверждает юрист. -->
        <h2>Ваши права</h2>
        <p class="notice">Текст готовится и будет утверждён юристом.</p>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.prose li {
  color: var(--color-pale-stone);
}

.prose__button {
  min-height: 44px;
  margin-bottom: var(--spacing-16);
  padding: 0 var(--spacing-16);
  border: 1px solid var(--color-ash-stroke);
  border-radius: var(--radius-sm);
  background: var(--color-carbon-lift);
  color: var(--color-bone);
  font: inherit;
  cursor: pointer;
}
</style>

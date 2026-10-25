<script setup lang="ts">
// Любой неизвестный адрес — 404 со страницей app/error.vue.
throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
</script>

<template>
  <div />
</template>

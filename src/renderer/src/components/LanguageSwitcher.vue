<script setup lang="ts">
import { availableLocales } from '../../../shared/i18n'
import { useI18n, switchLocale } from '../composables/useI18n'

const { locale } = useI18n()

function onChange(e: Event): void {
  void switchLocale((e.target as HTMLSelectElement).value)
}
</script>

<template>
  <select class="lang-select" :value="locale" @change="onChange">
    <option v-for="loc in availableLocales()" :key="loc.code" :value="loc.code">
      {{ loc.label }}
    </option>
  </select>
</template>

<style scoped>
.lang-select {
  padding: 2px 6px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-panel);
  color: var(--text-primary);
  cursor: pointer;
}
.lang-select:focus {
  outline: none;
  border-color: var(--accent);
}
</style>

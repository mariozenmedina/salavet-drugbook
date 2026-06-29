<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Calculator, Languages, Search } from '@lucide/vue'
import { useUiText } from '../composables/useUiText'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const { error, isLoading, uiText } = useUiText(locale.value)
</script>

<template>
  <main class="app-shell">
    <header class="top-bar">
      <strong class="brand">{{ uiText?.appName || 'Sala Vet Drugbook' }}</strong>

      <label class="search-field">
        <Search :size="18" aria-hidden="true" />
        <input :placeholder="uiText?.search.placeholder || ''" type="search" />
      </label>

      <RouterLink :to="`/${locale}/prescription`" class="icon-link" aria-label="Prescription">
        <Calculator :size="20" aria-hidden="true" />
      </RouterLink>

      <button class="icon-button" type="button" aria-label="Locale">
        <Languages :size="20" aria-hidden="true" />
      </button>
    </header>

    <section class="welcome-panel">
      <p v-if="isLoading" class="status-text">Loading</p>
      <p v-else-if="error" class="status-text">Unable to load locale data</p>
      <template v-else-if="uiText">
        <p class="eyebrow">{{ uiText.appName }}</p>
        <h1>{{ uiText.welcome.title }}</h1>
        <p>{{ uiText.welcome.subtitle }}</p>
      </template>
    </section>
  </main>
</template>

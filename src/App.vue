<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Languages, Search } from '@lucide/vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUiText } from './composables/useUiText'

const route = useRoute()
const router = useRouter()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const { uiText } = useUiText(locale)
const searchQuery = ref('')

watch(
  () => route.query.q,
  (query) => {
    searchQuery.value = typeof query === 'string' ? query : ''
  },
  { immediate: true },
)

function updateSearch(): void {
  const query = searchQuery.value.trim()

  void router.replace({
    name: 'welcome',
    params: { locale: locale.value },
    query: query ? { q: query } : {},
  })
}
</script>

<template>
  <header class="top-bar">
    <RouterLink
      :aria-label="uiText?.navigation.home"
      :to="{ name: 'welcome', params: { locale } }"
      class="brand"
    >
      <span class="brand-mark" aria-hidden="true">SV</span>
      <span class="brand-name">{{ uiText?.appName }}</span>
    </RouterLink>

    <label class="search-field">
      <Search :size="19" aria-hidden="true" />
      <input
        v-model="searchQuery"
        :aria-label="uiText?.search.ariaLabel"
        :placeholder="uiText?.search.placeholder"
        autocomplete="off"
        enterkeyhint="search"
        type="search"
        @input="updateSearch"
      />
    </label>

    <div :aria-label="uiText?.navigation.locale" class="locale-indicator">
      <Languages :size="18" aria-hidden="true" />
      <span>{{ uiText?.navigation.localeShortLabel }}</span>
    </div>
  </header>

  <main class="app-shell">
    <RouterView />
  </main>
</template>

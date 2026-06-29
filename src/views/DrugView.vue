<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const slug = computed(() => String(route.params.slug || ''))
const { uiText } = useUiText(locale.value)
</script>

<template>
  <main class="app-shell">
    <section class="placeholder-panel">
      <p class="eyebrow">{{ slug }}</p>
      <h1>{{ uiText?.placeholders.drug || 'Drug monograph' }}</h1>
    </section>
  </main>
</template>

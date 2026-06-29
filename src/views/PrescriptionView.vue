<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const { uiText } = useUiText(locale.value)
</script>

<template>
  <main class="app-shell">
    <section class="placeholder-panel">
      <p class="eyebrow">{{ uiText?.appName }}</p>
      <h1>{{ uiText?.prescription.title || 'Prescription' }}</h1>
    </section>
  </main>
</template>

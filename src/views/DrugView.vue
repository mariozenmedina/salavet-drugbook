<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const slug = computed(() => String(route.params.slug || ''))
const { uiText } = useUiText(locale)
</script>

<template>
  <section class="placeholder-panel">
    <p class="eyebrow">{{ slug }}</p>
    <h1>{{ uiText?.placeholders.drug }}</h1>
  </section>
</template>

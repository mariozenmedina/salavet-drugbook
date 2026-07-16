<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const letter = computed(() => String(route.params.letter || '').toUpperCase())
const { uiText } = useUiText(locale)
</script>

<template>
  <section class="placeholder-panel">
    <p class="eyebrow">{{ letter }}</p>
    <h1>{{ uiText?.placeholders.letter }}</h1>
  </section>
</template>

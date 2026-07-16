<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'
import { loadCommercialProduct, ProductNotFoundError } from '../services/drugbookData'
import type { CommercialProduct } from '../types/drugbook'

const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const productId = computed(() => String(route.params.id || ''))
const previousQuery = computed(() => (typeof route.query.from === 'string' ? route.query.from : ''))
const { uiText } = useUiText(locale)
const product = ref<CommercialProduct | null>(null)
const isLoading = ref(true)
const isNotFound = ref(false)
const error = ref<Error | null>(null)

watch(
  [locale, productId],
  async ([activeLocale, activeProductId], _previousValue, onCleanup) => {
    let isCurrent = true
    onCleanup(() => {
      isCurrent = false
    })

    product.value = null
    isLoading.value = true
    isNotFound.value = false
    error.value = null

    try {
      const loadedProduct = await loadCommercialProduct(activeLocale, activeProductId)
      if (isCurrent) {
        product.value = loadedProduct
      }
    } catch (caughtError) {
      if (isCurrent) {
        isNotFound.value = caughtError instanceof ProductNotFoundError
        error.value = caughtError instanceof Error
          ? caughtError
          : new Error('Unknown product loading error')
      }
    } finally {
      if (isCurrent) {
        isLoading.value = false
      }
    }
  },
  { immediate: true },
)

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value.includes('T') ? value : `${value}T00:00:00Z`))
}
</script>

<template>
  <div v-if="uiText" class="product-page">
    <RouterLink
      :to="{
        name: 'welcome',
        params: { locale },
        query: previousQuery ? { q: previousQuery } : {},
      }"
      class="back-link"
    >
      <ArrowLeft :size="18" aria-hidden="true" />
      {{ uiText.product.backToCatalog }}
    </RouterLink>

    <section v-if="isLoading" :aria-busy="true" class="state-panel product-state">
      <span class="loading-indicator" aria-hidden="true" />
      <p>{{ uiText.common.loading }}</p>
    </section>

    <section v-else-if="isNotFound" class="state-panel product-state">
      <h1>{{ uiText.product.notFoundTitle }}</h1>
      <p>{{ uiText.product.notFoundBody }}</p>
    </section>

    <section v-else-if="error" class="state-panel state-panel--error product-state">
      <p>{{ uiText.common.loadError }}</p>
    </section>

    <template v-else-if="product">
      <header class="product-hero">
        <div>
          <p class="eyebrow">{{ uiText.product.recordEyebrow }}</p>
          <h1>{{ product.tradeName }}</h1>
        </div>
        <span :class="`status-badge status-badge--${product.marketingStatus}`">
          {{ uiText.product.marketingStatus[product.marketingStatus] }}
        </span>
      </header>

      <aside :class="`relationship-note relationship-note--${product.componentLinkStatus}`">
        <strong>{{ uiText.product.componentLinkStatus[product.componentLinkStatus] }}</strong>
        <p>{{ uiText.product.componentLinkNote[product.componentLinkStatus] }}</p>
      </aside>

      <div class="product-section-grid">
        <section class="detail-section">
          <h2>{{ uiText.product.sections.regulatory }}</h2>
          <dl class="field-grid">
            <div>
              <dt>{{ uiText.product.fields.marketingStatus }}</dt>
              <dd>{{ uiText.product.marketingStatus[product.marketingStatus] }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.registrationNumber }}</dt>
              <dd>{{ product.registrationNumber || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.previousRegistrationNumber }}</dt>
              <dd>{{ product.previousRegistrationNumber || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.regulatoryAuthority }}</dt>
              <dd>{{ product.regulatoryAuthority }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.jurisdiction }}</dt>
              <dd>{{ product.jurisdiction }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section">
          <h2>{{ uiText.product.sections.composition }}</h2>
          <ul v-if="product.components.length" class="value-list value-list--accent">
            <li v-for="component in product.components" :key="component.sourceIngredientName">
              {{ component.sourceIngredientName }}
            </li>
          </ul>
          <p v-else class="empty-value">{{ uiText.common.notAvailable }}</p>
        </section>

        <section class="detail-section">
          <h2>{{ uiText.product.sections.presentation }}</h2>
          <dl class="field-grid">
            <div>
              <dt>{{ uiText.product.fields.dosageForms }}</dt>
              <dd>{{ product.dosageForms.join(', ') || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.pharmaceuticalClasses }}</dt>
              <dd>{{ product.pharmaceuticalClasses.join(', ') || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.routes }}</dt>
              <dd>{{ product.routes.join(', ') || uiText.common.notAvailable }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section">
          <h2>{{ uiText.product.sections.authorization }}</h2>
          <dl class="field-grid">
            <div>
              <dt>{{ uiText.product.fields.authorizedSpecies }}</dt>
              <dd>{{ product.authorizedSpecies.join(', ') || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.holder }}</dt>
              <dd>{{ product.holder || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.holderRegistrationNumber }}</dt>
              <dd>{{ product.holderRegistrationNumber || uiText.common.notAvailable }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.origin }}</dt>
              <dd>{{ product.origin || uiText.common.notAvailable }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section detail-section--source">
          <h2>{{ uiText.product.sections.source }}</h2>
          <dl class="field-grid">
            <div>
              <dt>{{ uiText.product.fields.sourceId }}</dt>
              <dd>{{ product.sourceRecord.sourceId }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.sourceRecordId }}</dt>
              <dd>{{ product.sourceRecord.recordId }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.retrievedAt }}</dt>
              <dd>{{ formatDate(product.sourceRecord.retrievedAt) }}</dd>
            </div>
            <div>
              <dt>{{ uiText.product.fields.contentHash }}</dt>
              <dd class="hash-value">{{ product.sourceRecord.contentHash }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Database, Search } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUiText } from '../composables/useUiText'
import { loadProductCatalogManifest, loadProductSearchIndex } from '../services/drugbookData'
import { searchProductIndexWithMeta } from '../services/productSearch'
import { formatUiText } from '../services/uiText'
import type { ProductCatalogManifest, ProductSearchIndexFile } from '../types/drugbook'

const resultLimit = 50
const route = useRoute()
const locale = computed(() => String(route.params.locale || 'pt-BR'))
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const { uiText } = useUiText(locale)
const manifest = ref<ProductCatalogManifest | null>(null)
const productIndex = ref<ProductSearchIndexFile | null>(null)
const isLoading = ref(true)
const error = ref<Error | null>(null)

watch(
  locale,
  async (activeLocale, _previousLocale, onCleanup) => {
    let isCurrent = true
    onCleanup(() => {
      isCurrent = false
    })

    isLoading.value = true
    error.value = null

    try {
      const [loadedManifest, loadedIndex] = await Promise.all([
        loadProductCatalogManifest(activeLocale),
        loadProductSearchIndex(activeLocale),
      ])

      if (isCurrent) {
        manifest.value = loadedManifest
        productIndex.value = loadedIndex
      }
    } catch (caughtError) {
      if (isCurrent) {
        manifest.value = null
        productIndex.value = null
        error.value = caughtError instanceof Error
          ? caughtError
          : new Error('Unknown product catalog loading error')
      }
    } finally {
      if (isCurrent) {
        isLoading.value = false
      }
    }
  },
  { immediate: true },
)

const searchResult = computed(() => {
  if (!productIndex.value || !query.value) {
    return { items: [], total: 0 }
  }

  return searchProductIndexWithMeta(productIndex.value, query.value, {
    limit: resultLimit,
    locale: locale.value,
  })
})

const formattedUpdateDate = computed(() => {
  if (!manifest.value) {
    return ''
  }

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(manifest.value.updatedAt),
  )
})
</script>

<template>
  <div v-if="uiText" class="catalog-page">
    <section class="catalog-hero">
      <div class="catalog-hero__copy">
        <p class="eyebrow">{{ uiText.catalog.eyebrow }}</p>
        <h1>{{ uiText.welcome.title }}</h1>
        <p class="catalog-hero__subtitle">{{ uiText.welcome.subtitle }}</p>
      </div>

      <div v-if="manifest" class="catalog-stat">
        <Database :size="22" aria-hidden="true" />
        <strong>
          {{ formatUiText(uiText.catalog.productCount, { count: manifest.totalCount }) }}
        </strong>
        <span>
          {{ formatUiText(uiText.catalog.updatedAt, { date: formattedUpdateDate }) }}
        </span>
      </div>

      <p class="catalog-source-note">{{ uiText.catalog.sourceNotice }}</p>
    </section>

    <section :aria-busy="isLoading" aria-live="polite" class="catalog-results">
      <div v-if="isLoading" class="state-panel">
        <span class="loading-indicator" aria-hidden="true" />
        <p>{{ uiText.common.loading }}</p>
      </div>

      <div v-else-if="error" class="state-panel state-panel--error">
        <p>{{ uiText.common.loadError }}</p>
      </div>

      <div v-else-if="!query" class="state-panel state-panel--prompt">
        <Search :size="26" aria-hidden="true" />
        <p>{{ uiText.catalog.searchPrompt }}</p>
      </div>

      <div v-else-if="searchResult.total === 0" class="state-panel">
        <h2>{{ uiText.search.emptyTitle }}</h2>
        <p>{{ uiText.search.emptyBody }}</p>
      </div>

      <template v-else>
        <div class="results-heading">
          <h2>
            {{
              formatUiText(uiText.search.resultSummary, {
                shown: searchResult.items.length,
                total: searchResult.total,
              })
            }}
          </h2>
          <p v-if="searchResult.total > searchResult.items.length">
            {{ uiText.search.limitedResults }}
          </p>
        </div>

        <ul class="product-list">
          <li v-for="item in searchResult.items" :key="item.productId">
            <RouterLink
              :to="{
                name: 'product',
                params: { locale, id: item.productId },
                query: { from: query },
              }"
              class="product-card"
            >
              <div class="product-card__heading">
                <h3>{{ item.tradeName }}</h3>
                <span :class="`status-badge status-badge--${item.marketingStatus}`">
                  {{ uiText.product.marketingStatus[item.marketingStatus] }}
                </span>
              </div>

              <dl class="product-card__details">
                <div>
                  <dt>{{ uiText.product.fields.components }}</dt>
                  <dd>
                    {{ item.componentNames.join(', ') || uiText.common.notAvailable }}
                  </dd>
                </div>
                <div>
                  <dt>{{ uiText.product.fields.registrationNumber }}</dt>
                  <dd>{{ item.registrationNumber || uiText.common.notAvailable }}</dd>
                </div>
                <div v-if="item.holder">
                  <dt>{{ uiText.product.fields.holder }}</dt>
                  <dd>{{ item.holder }}</dd>
                </div>
              </dl>

              <ArrowRight :size="20" aria-hidden="true" class="product-card__arrow" />
            </RouterLink>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { loadUiText, type UiText } from '../services/localeData'

export function useUiText(locale: MaybeRefOrGetter<string> = 'pt-BR') {
  const uiText = ref<UiText | null>(null)
  const isLoading = ref(true)
  const error = ref<Error | null>(null)

  watch(
    () => toValue(locale),
    async (activeLocale, _previousLocale, onCleanup) => {
      let isCurrent = true
      onCleanup(() => {
        isCurrent = false
      })

      isLoading.value = true
      error.value = null

      try {
        const loadedUiText = await loadUiText(activeLocale)
        if (isCurrent) {
          uiText.value = loadedUiText
        }
      } catch (caughtError) {
        if (isCurrent) {
          uiText.value = null
          error.value = caughtError instanceof Error
            ? caughtError
            : new Error('Unknown locale loading error')
        }
      } finally {
        if (isCurrent) {
          isLoading.value = false
        }
      }
    },
    { immediate: true },
  )

  return {
    error,
    isLoading,
    uiText,
  }
}

import { onMounted, ref } from 'vue'
import { loadUiText, type UiText } from '../services/localeData'

export function useUiText(locale = 'pt-BR') {
  const uiText = ref<UiText | null>(null)
  const isLoading = ref(true)
  const error = ref<Error | null>(null)

  onMounted(async () => {
    try {
      uiText.value = await loadUiText(locale)
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError : new Error('Unknown locale loading error')
    } finally {
      isLoading.value = false
    }
  })

  return {
    error,
    isLoading,
    uiText,
  }
}

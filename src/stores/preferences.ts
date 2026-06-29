import { defineStore } from 'pinia'

type ThemePreference = 'light' | 'dark' | 'system'

interface PreferencesState {
  locale: string
  theme: ThemePreference
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    locale: 'pt-BR',
    theme: 'system',
  }),
})

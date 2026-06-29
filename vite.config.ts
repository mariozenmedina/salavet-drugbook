import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sala Vet Drugbook',
        short_name: 'Drugbook',
        description: 'Sala Vet veterinary drugbook',
        theme_color: '#0B56A4',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

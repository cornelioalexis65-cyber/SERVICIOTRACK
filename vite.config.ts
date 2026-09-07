import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE_PATH = process.env.BASE_PATH || '/SERVICIOTRACK/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'icons.svg'],
      manifest: {
        name: 'ServicioTrack - Control de Servicio Social',
        short_name: 'ServicioTrack',
        description: 'Gestor y control de horas de servicio social con funcionamiento 100% offline.',
        theme_color: '#4f46e5',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: BASE_PATH,
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,json}'],
        navigateFallback: `${BASE_PATH}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})

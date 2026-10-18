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
      registerType: 'prompt',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'icons.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'ServicioTrack - Control de Servicio Social',
        short_name: 'ServicioTrack',
        description: 'Gestor y control de horas de servicio social con funcionamiento 100% offline.',
        lang: 'es',
        theme_color: '#4f46e5',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: BASE_PATH,
        // Android (Chrome) solo ofrece "Instalar" con iconos PNG de 192 y 512 px;
        // con un único SVG la app no se consideraba instalable
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
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

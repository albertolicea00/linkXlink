import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' + injectRegister:false: the auto-injected script would call
      // register() silently and swap in updates without telling the user
      // mid-session, which is risky here (RPC signatures keep changing) —
      // useRegisterSW() in UpdatePrompt.tsx controls registration instead, so
      // updates surface as a "reload to update" toast.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Link x Link',
        short_name: 'LinkxLink',
        description: 'Conecta con personas locales por WhatsApp',
        start_url: '/',
        display: 'standalone',
        background_color: '#fdf6f9',
        theme_color: '#ec4899',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Ver perfiles',
            short_name: 'Perfiles',
            url: '/app',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Mi cuenta',
            short_name: 'Cuenta',
            url: '/account',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Supabase REST reads: serve cached profiles when offline
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Profile photos from Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})

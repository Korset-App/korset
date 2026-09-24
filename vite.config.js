import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// ЛОКАЛЬНЫЙ DEV С API:
// `npm run dev` — только Vite (5173). Серверные функции /api/* не работают → в UI будут ошибки на AI/импорт/etc.
// `npm run dev:api` — запускает `vercel dev`, который поднимает настоящие api/*.js и проксирует vite внутри.
//
// Раньше здесь был localApiPlugin — дублирующий /api/ai с service-key без auth/rate-limit.
// Удалён в Этапе 1 hardening (дыра безопасности + drift от prod-версии api/ai.js).

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.js',
      strategies: 'injectManifest',
      injectManifest: {
        swSrc: 'src/sw.js',
        swDest: 'dist/sw.js',
        globPatterns: [
          '**/*.{js,css,html}',
          'favicon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'maskable-icon-512x512.png',
          'apple-touch-icon.png',
          'logo.png',
          'manifest.webmanifest',
          'brand/**',
          'stories/*.webp',
          'avatars/*.webp',
          'profile-bgs/*.webp',
        ],
        globIgnores: [
          '**/raw/**',
          'catalog-raw/**',
          'landing/**',
          '**/*.mp4',
          '2026-*.png',
          'ava/**',
          'stories/*.png',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        id: '/',
        name: 'Körset — Умный помощник у полки',
        short_name: 'Körset',
        description:
          'Сканируйте товар в магазине и получайте понятный Fit-Check по аллергенам, халал, диетам и КБЖУ.',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070712',
        theme_color: '#7C3AED',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Runtime caching options (precache manifest is built by injectManifest above)
      },
    }),
    // Sentry source maps — enabled only when SENTRY_AUTH_TOKEN is present (CI/production).
    // Safe to leave in config; if token missing, plugin skips silently.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || 'korset',
      project: process.env.SENTRY_PROJECT || 'korset-web',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['**/*.map'],
      },
    }),
  ],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://korset.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: true,
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// `@undecaf/barcode-detector-polyfill` imports zbar-wasm from a hard-coded
// jsDelivr URL. Left alone that makes camera startup depend on a third-party CDN:
// if the request is slow or blocked the scanner awaits a module that never
// arrives and the viewfinder stays grey forever. Resolve it to the locally
// installed package so the WASM ships with the app and works offline.
const LOCAL_ZBAR_WASM = fileURLToPath(
  new URL('./node_modules/@undecaf/zbar-wasm/dist/main.js', import.meta.url)
)

function localZbarWasm() {
  return {
    name: 'korset-local-zbar-wasm',
    enforce: 'pre',
    resolveId(source) {
      if (source.startsWith('https://') && source.includes('zbar-wasm')) {
        return LOCAL_ZBAR_WASM
      }
      return null
    },
  }
}

// ЛОКАЛЬНЫЙ DEV С API:
// `npm run dev` — только Vite (5173). Серверные функции /api/* не работают → в UI будут ошибки на AI/импорт/etc.
// `npm run dev:api` — запускает `vercel dev`, который поднимает настоящие api/*.js и проксирует vite внутри.
//
// Раньше здесь был localApiPlugin — дублирующий /api/ai с service-key без auth/rate-limit.
// Удалён в Этапе 1 hardening (дыра безопасности + drift от prod-версии api/ai.js).

export default defineConfig({
  plugins: [
    react(),
    localZbarWasm(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.js',
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,wasm}',
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
          'catalog-categories/*.webp',
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
  esbuild: {
    jsx: 'automatic',
  },
  optimizeDeps: {
    // Must not be pre-bundled: esbuild keeps the jsDelivr URL external, which
    // would make dev hit the CDN while prod uses the local WASM build.
    exclude: ['@undecaf/barcode-detector-polyfill'],
  },
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

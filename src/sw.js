/* global self, clients */
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  })
)

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    /\.(webp|png|jpg|jpeg|svg|gif|avif)(\?.*)?$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    if (event.data) payload = event.data.json()
  } catch {
    payload = { title: 'Körset', body: event.data?.text?.() || 'Новое уведомление' }
  }

  const title = payload.title || 'Körset'
  const options = {
    body: payload.body || 'У вас новое уведомление.',
    icon: '/brand/korset-app-icon.png',
    badge: '/favicon.png',
    data: {
      url: payload.url || '/profile',
      type: payload.type || 'system',
      storeSlug: payload.storeSlug || null,
    },
    tag: payload.tag || payload.type || 'korset-notification',
    renotify: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/profile'

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const matching = allClients.find((client) => client.url.includes(self.location.origin))
      if (matching) {
        matching.focus()
        matching.navigate(url)
        return
      }
      await clients.openWindow(url)
    })()
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-scans') {
    event.waitUntil(flushPendingScansFromSW())
  }
})

async function flushPendingScansFromSW() {
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of allClients) {
    client.postMessage({ type: 'FLUSH_PENDING_SCANS' })
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

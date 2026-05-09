export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  status: 'default',
  pushSupported: false,
  subscriptionActive: false,
}

export function loadNotificationSettings() {
  try {
    const raw = localStorage.getItem('korset_notification_settings')
    return raw
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) }
      : DEFAULT_NOTIFICATION_SETTINGS
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS
  }
}

export function saveNotificationSettings(settings) {
  localStorage.setItem('korset_notification_settings', JSON.stringify(settings))
}

export function browserNotificationStatus() {
  if (typeof window === 'undefined') return { pushSupported: false, status: 'unsupported' }
  const pushSupported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!pushSupported) return { pushSupported: false, status: 'unsupported' }
  return { pushSupported: true, status: Notification.permission || 'default' }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('service_worker_unsupported')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return registration
}

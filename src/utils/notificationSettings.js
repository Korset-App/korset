export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  pushEnabled: false,
  scanAlerts: true,
  favoritesAlerts: true,
  promoAlerts: false,
  restockAlerts: true,
  weeklyDigest: true,
  emailDigest: false,
  systemAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
}

export function normalizeNotificationSettings(input) {
  if (!input || typeof input !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS }
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...input,
  }
}

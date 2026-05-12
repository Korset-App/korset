export const DEFAULT_PRIVACY_SETTINGS = {
  personalizationEnabled: true,
  analyticsEnabled: true,
  localHistoryEnabled: true,
  rememberStoreEnabled: true,
}

const PRIVACY_EVENT = 'korset:privacy_changed'

function readProfileSnapshot() {
  try {
    const raw = localStorage.getItem('korset_profile')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function loadPrivacySettings() {
  const snapshot = readProfileSnapshot()
  return {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...(snapshot?.privacy || {}),
  }
}

export function writePrivacySettings(nextPrivacy) {
  try {
    const snapshot = readProfileSnapshot()
    const merged = {
      ...snapshot,
      privacy: {
        ...DEFAULT_PRIVACY_SETTINGS,
        ...(snapshot?.privacy || {}),
        ...(nextPrivacy || {}),
      },
    }
    localStorage.setItem('korset_profile', JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT))
    return merged.privacy
  } catch {
    return {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...(nextPrivacy || {}),
    }
  }
}

export function notifyPrivacyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT))
  }
}

export { PRIVACY_EVENT }

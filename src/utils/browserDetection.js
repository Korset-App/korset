export function detectBrowserContext(
  navigatorObj = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!navigatorObj) {
    return {
      isStandalone: false,
      isIos: false,
      isAndroid: false,
      isInApp: false,
      inAppName: null,
      browser: 'other',
      platform: 'other',
      badgeLabel: 'Браузер',
      canNativeInstall: false,
    }
  }

  const ua = navigatorObj.userAgent || ''
  const isStandalone =
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    Boolean(navigatorObj.standalone) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('korset:pwa-installed') === 'true')

  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) &&
      typeof navigatorObj.maxTouchPoints === 'number' &&
      navigatorObj.maxTouchPoints > 1)

  const isAndroid = /android/i.test(ua)

  // In-app webviews: installation is blocked by the platform
  let isInApp = false
  let inAppName = null

  if (/telegram/i.test(ua)) {
    isInApp = true
    inAppName = 'Telegram'
  } else if (/instagram/i.test(ua)) {
    isInApp = true
    inAppName = 'Instagram'
  } else if (/whatsapp/i.test(ua)) {
    isInApp = true
    inAppName = 'WhatsApp'
  } else if (/fban|fbav|facebook/i.test(ua)) {
    isInApp = true
    inAppName = 'Facebook'
  } else if (/vkapp|vkshare/i.test(ua)) {
    isInApp = true
    inAppName = 'VK'
  } else if (/bytedance|musical_ly|tiktok/i.test(ua)) {
    isInApp = true
    inAppName = 'TikTok'
  } else if (isAndroid && /; wv\)/i.test(ua)) {
    isInApp = true
    inAppName = 'Webview'
  }

  const platform = isIos ? 'ios' : isAndroid ? 'android' : 'desktop'

  // Specific browser detection (order matters — check specialised before generic Chrome)
  let browser = 'other'
  let badgeLabel = isIos ? 'iOS' : isAndroid ? 'Android' : 'Браузер'

  if (isInApp) {
    browser = 'in_app'
    badgeLabel = inAppName ? `${inAppName} WebView` : 'Встроенный браузер'
  } else if (/yabrowser|yasearch/i.test(ua)) {
    browser = 'yandex'
    badgeLabel = `${isIos ? 'iOS' : 'Android'} · Яндекс`
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'samsung'
    badgeLabel = 'Samsung Internet'
  } else if (/miuibrowser/i.test(ua) || (/xiaomi/i.test(ua) && /miui/i.test(ua))) {
    browser = 'xiaomi'
    badgeLabel = 'Android · Xiaomi'
  } else if (/opr\/|opera mini/i.test(ua)) {
    browser = 'opera'
    badgeLabel = `${isIos ? 'iOS' : 'Android'} · Opera`
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'firefox'
    badgeLabel = `${isIos ? 'iOS' : 'Android'} · Firefox`
  } else if (/edg[a/]/i.test(ua)) {
    // Edge Chromium: Edg/ on desktop, EdgA/ on Android, EdgiOS/ on iOS
    browser = 'edge'
    badgeLabel = isIos ? 'iOS · Edge' : isAndroid ? 'Android · Edge' : 'Edge'
  } else if (isIos) {
    if (/crios/i.test(ua)) {
      browser = 'chrome'
      badgeLabel = 'iOS · Chrome'
    } else {
      browser = 'safari'
      badgeLabel = 'iOS · Safari'
    }
  } else if (isAndroid) {
    if (/chrome|chromium/i.test(ua)) {
      browser = 'chrome'
      badgeLabel = 'Android · Chrome'
    }
  } else {
    // Desktop
    if (/chrome|crios/i.test(ua)) {
      browser = 'chrome'
      badgeLabel = 'Chrome'
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'safari'
      badgeLabel = 'Safari'
    } else if (/firefox/i.test(ua)) {
      browser = 'firefox'
      badgeLabel = 'Firefox'
    }
  }

  // Browsers that fire beforeinstallprompt on Android:
  // Chrome, Samsung Internet (≥10), Opera (Chromium), Edge Chromium
  // Firefox, Yandex, Xiaomi, iOS — do NOT fire it
  const canNativeInstall =
    !isIos &&
    !isInApp &&
    (browser === 'chrome' || browser === 'samsung' || browser === 'opera' || browser === 'edge')

  return {
    isStandalone: Boolean(isStandalone),
    isIos,
    isAndroid,
    isInApp,
    inAppName,
    browser,
    platform,
    badgeLabel,
    canNativeInstall,
  }
}

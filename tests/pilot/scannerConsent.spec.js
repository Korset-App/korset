import { test, expect } from '@playwright/test'
import { openConsumer, stores } from './consumerFixtures.js'

async function prepareCamera(page, { accepted = false, mode = 'denied' } = {}) {
  await page.addInitScript(({ accepted, mode }) => {
    if (accepted) globalThis.localStorage.setItem('korset_terms_accepted', JSON.stringify({ accepted: true }))
    globalThis.__firstCameraCalls = 0
    globalThis.__firstCameraTracks = []
    Object.defineProperty(globalThis.navigator.mediaDevices, 'enumerateDevices', {
      configurable: true,
      value: async () => [{ kind: 'videoinput', deviceId: 'rear-main', label: 'Back Camera' }],
    })
    Object.defineProperty(globalThis.navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        globalThis.__firstCameraCalls += 1
        if (mode === 'denied') throw new globalThis.DOMException('Permission denied', 'NotAllowedError')
        const makeStream = () => {
          const canvas = globalThis.document.createElement('canvas')
          canvas.width = 640
          canvas.height = 480
          const context = canvas.getContext('2d')
          let frame = 0
          const timer = globalThis.setInterval(() => {
            context.fillStyle = '#344eb7'
            context.fillRect(0, 0, 640, 480)
            context.fillStyle = '#f2f2f2'
            context.fillText(String(frame++), 30, 30)
          }, 40)
          const stream = canvas.captureStream(25)
          const track = stream.getVideoTracks()[0]
          const stop = track.stop.bind(track)
          track.stop = () => { globalThis.clearInterval(timer); stop() }
          track.getSettings = () => ({ width: 640, height: 480, deviceId: 'rear-main', facingMode: 'environment' })
          track.getCapabilities = () => ({})
          globalThis.__firstCameraTracks.push(track)
          return stream
        }
        if (mode === 'pending') {
          return new Promise((resolve) => { globalThis.__releaseFirstCamera = () => resolve(makeStream()) })
        }
        return makeStream()
      },
    })
  }, { accepted, mode })
}

async function cameraCalls(page) {
  return page.evaluate(() => globalThis.__firstCameraCalls)
}

async function liveTracks(page) {
  return page.evaluate(() => globalThis.__firstCameraTracks.filter((track) => track.readyState === 'live').length)
}

async function moveToCatalog(page) {
  await page.evaluate(() => {
    globalThis.history.pushState({}, '', '/s/pilot-a/catalog')
    globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
  })
  await expect(page.locator('.catalog-category-card').first()).toBeVisible()
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`first scan requests no camera before explicit keyboard-accessible consent (${lang}, ${theme})`, async ({ page }) => {
      await prepareCamera(page)
      await page.setViewportSize({ width: 390, height: 844 })
      await openConsumer(page, { lang, theme, cachedProfile: false })
      await page.goto('/s/pilot-a/scan')
      const dialog = page.getByRole('dialog', { name: lang === 'ru' ? 'Прежде чем начать' : 'Бастамас бұрын' })
      await expect(dialog).toBeVisible()
      await page.waitForLoadState('networkidle')
      expect(await cameraCalls(page)).toBe(0)
      const checkbox = dialog.getByRole('checkbox')
      await expect(checkbox).toBeFocused()
      await expect(dialog.locator('#consent-accept-btn')).toBeDisabled()
      await checkbox.press('Shift+Tab')
      await expect(dialog.locator('button:enabled').last()).toBeFocused()
      await checkbox.focus()
      await checkbox.press('Space')
      await expect(checkbox).toBeChecked()
      await expect(dialog.locator('#consent-accept-btn')).toBeEnabled()
      expect(await cameraCalls(page)).toBe(0)
      await page.screenshot({ path: test.info().outputPath(`first-consent-${lang}-${theme}.png`), animations: 'disabled' })
      await dialog.locator('#consent-accept-btn').click()
      await expect(dialog).toHaveCount(0)
      await expect(page.locator('.scan-status-overlay--error strong')).toHaveText(
        lang === 'ru' ? 'Нет доступа к камере' : 'Камераға рұқсат жоқ',
        { timeout: 15000 },
      )
      expect(await cameraCalls(page)).toBeGreaterThan(0)
      await page.reload()
      await expect(page.locator('.scan-status-overlay--error strong')).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })
  }
}

test('opening the terms with the keyboard does not accept consent or start the camera', async ({ page }) => {
  await prepareCamera(page)
  await openConsumer(page)
  await page.goto('/s/pilot-a/scan')
  const dialog = page.getByRole('dialog', { name: 'Прежде чем начать' })
  await expect(dialog).toBeVisible()
  const terms = dialog.getByRole('button', { name: 'условиями использования' })
  await terms.focus()
  await terms.press('Enter')
  await expect(page).toHaveURL('/s/pilot-a/terms')
  expect(await cameraCalls(page)).toBe(0)
  expect(await page.evaluate(() => globalThis.localStorage.getItem('korset_terms_accepted'))).toBe(null)
})

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`consent opens the policy document in store context (${lang}/${theme})`, async ({ page }) => {
      await prepareCamera(page)
      await openConsumer(page, { lang, theme })
      await page.goto('/s/pilot-a/scan')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: lang === 'ru' ? 'политикой конфиденциальности' : 'құпиялылық саясатымен' }).click()
      await expect(page).toHaveURL('/s/pilot-a/privacy-policy')
      await expect(page.getByRole('heading', { name: lang === 'ru' ? '1. Сбор данных' : '1. Деректерді жинау', exact: true })).toBeVisible()
      expect(await cameraCalls(page)).toBe(0)
      expect(await page.evaluate(() => globalThis.localStorage.getItem('korset_terms_accepted'))).toBe(null)
      await page.getByRole('button', { name: lang === 'ru' ? 'Назад' : 'Артқа', exact: true }).first().click()
      await expect(page).toHaveURL('/s/pilot-a/scan')
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').getByRole('checkbox')).not.toBeChecked()
      expect(await cameraCalls(page)).toBe(0)
    })
  }
}

test('a scanner waits for the newly selected store before requesting the camera', async ({ page }) => {
  await prepareCamera(page, { accepted: true })
  await openConsumer(page, { cachedStores: false })
  await expect(page.locator('.catalog-category-card').first()).toBeVisible()
  await page.evaluate(async () => {
    await import('/src/screens/ScanScreen.jsx')
    const engine = await import('/src/utils/scannerEngine.js')
    await engine.loadScannerEngine()
  })
  let release
  let requested
  const response = new Promise((resolve) => { release = resolve })
  const request = new Promise((resolve) => { requested = resolve })
  await page.route('**/rest/v1/stores**', async (route) => {
    requested()
    await response
    return route.fulfill({ json: stores['pilot-b'] })
  })
  try {
    await page.evaluate(() => {
      globalThis.history.pushState({}, '', '/s/pilot-b/scan')
      globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
    })
    await request
    await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))))
    await expect(page.getByRole('status')).toBeVisible()
    await expect(page.locator('.scan-screen')).toHaveCount(0)
    expect(await cameraCalls(page)).toBe(0)
    release()
    await expect(page.locator('.scan-status-overlay--error strong')).toHaveText('Нет доступа к камере', { timeout: 15000 })
    expect(await cameraCalls(page)).toBeGreaterThan(0)
  } finally {
    release()
  }
})

test('a guest cannot start the camera using a cached draft store', async ({ page }) => {
  await prepareCamera(page, { accepted: true })
  await openConsumer(page, { cachedStores: false })
  await expect(page.locator('.catalog-category-card').first()).toBeVisible()
  await page.evaluate(() => {
    const store = JSON.parse(globalThis.localStorage.getItem('korset_store_data_pilot-a'))
    store.is_published = false
    store.isPublished = false
    globalThis.localStorage.setItem('korset_store_data_pilot-a', JSON.stringify(store))
  })
  await page.route('**/rest/v1/stores**', (route) => route.fulfill({ json: null }))
  await page.goto('/s/pilot-a/scan')
  await expect(page).toHaveURL('/stores')
  expect(await cameraCalls(page)).toBe(0)
})

test('leaving the scanner releases its simulated live camera', async ({ page }) => {
  await prepareCamera(page, { accepted: true, mode: 'live' })
  await openConsumer(page)
  await page.goto('/s/pilot-a/scan')
  await expect.poll(() => liveTracks(page), { timeout: 15000 }).toBe(1)
  const video = page.locator('#korset-scan-view video')
  await expect(video).toBeVisible({ timeout: 15000 })
  await expect.poll(() => video.evaluate((element) => element.currentTime), { timeout: 15000 }).toBeGreaterThan(0)
  await moveToCatalog(page)
  await expect.poll(() => liveTracks(page)).toBe(0)
})

test('a permission result arriving after leaving the scanner cannot retain a camera track', async ({ page }) => {
  await prepareCamera(page, { accepted: true, mode: 'pending' })
  await openConsumer(page)
  await page.goto('/s/pilot-a/scan')
  await expect.poll(() => cameraCalls(page), { timeout: 15000 }).toBe(1)
  await moveToCatalog(page)
  await page.evaluate(() => globalThis.__releaseFirstCamera())
  await expect.poll(() => liveTracks(page)).toBe(0)
})

for (const mode of ['live', 'pending']) {
  test(`switching stores releases the ${mode} camera before waiting for the new store`, async ({ page }) => {
    await prepareCamera(page, { accepted: true, mode })
    await openConsumer(page, { cachedStores: false })
    await expect(page.locator('.catalog-category-card').first()).toBeVisible()
    await page.goto('/s/pilot-a/scan')
    await expect.poll(() => cameraCalls(page), { timeout: 15000 }).toBe(1)
    if (mode === 'live') {
      await expect(page.locator('#korset-scan-view video')).toBeVisible({ timeout: 15000 })
      await expect.poll(() => page.locator('#korset-scan-view video').evaluate((video) => video.currentTime)).toBeGreaterThan(0)
    }
    let release
    let requested
    const response = new Promise((resolve) => { release = resolve })
    const request = new Promise((resolve) => { requested = resolve })
    await page.route('**/rest/v1/stores**', async (route) => {
      requested()
      await response
      return route.fulfill({ json: stores['pilot-b'] })
    })
    try {
      await page.evaluate(() => {
        globalThis.history.pushState({}, '', '/s/pilot-b/scan')
        globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
      })
      await request
      await expect(page.getByRole('status')).toBeVisible()
      if (mode === 'pending') await page.evaluate(() => globalThis.__releaseFirstCamera())
      await expect.poll(() => liveTracks(page)).toBe(0)
      expect(await cameraCalls(page)).toBe(1)
      release()
      await expect.poll(() => cameraCalls(page), { timeout: 15000 }).toBe(2)
      if (mode === 'pending') await page.evaluate(() => globalThis.__releaseFirstCamera())
      await expect.poll(() => liveTracks(page), { timeout: 15000 }).toBe(1)
    } finally {
      release()
    }
  })
}

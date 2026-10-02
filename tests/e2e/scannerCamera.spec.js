import { test, expect } from '@playwright/test'

const storeId = '00000000-0000-4000-8000-000000000001'
const ean13Pattern = '00001010001011010011101100110010011011110100111010101011001101101100100001010111001001110100010010100000'

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    const body = url.pathname.endsWith('/stores')
      ? { id: storeId, code: 'camera-test', name: 'Camera test', is_active: true, is_published: true }
      : url.pathname.includes('/auth/') ? {} : []
    await route.fulfill({ json: body })
  })
  await page.addInitScript(({ storeId }) => {
    localStorage.setItem('korset_terms_accepted', JSON.stringify({ accepted: true }))
    localStorage.setItem('korset_store_data_camera-test', JSON.stringify({ id: storeId, slug: 'camera-test', name: 'Camera test', isActive: true, isPublished: true }))
    window.__cameraCaptures = []
    window.__cameraTracks = []
    const devices = [
      { kind: 'videoinput', deviceId: 'rear-main', label: 'Back Camera' },
      { kind: 'videoinput', deviceId: 'rear-ultra', label: 'Back Ultra Wide Camera' },
      { kind: 'videoinput', deviceId: 'rear-tele', label: 'Back Telephoto Camera' },
      { kind: 'videoinput', deviceId: 'front', label: 'Front Camera' },
    ]
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => devices })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async ({ video }) => {
      const mode = video.facingMode?.exact || video.facingMode
      const id = video.deviceId?.exact || (mode === 'user' ? 'front' : 'rear-main')
      window.__cameraCaptures.push(id)
      // Model Safari interrupting the old capture when a second camera is opened.
      window.__cameraTracks.forEach((track) => { if (track.readyState === 'live') track.enabled = false })
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')
      let frame = 0
      const timer = setInterval(() => {
        context.fillStyle = window.__cameraBarcode ? '#ffffff' : id === 'front' ? '#286e42' : '#344eb7'
        context.fillRect(0, 0, canvas.width, canvas.height)
        if (window.__cameraBarcode) {
          context.fillStyle = '#000000'
          const pattern = window.__cameraBarcode
          const scale = 4
          const offset = (canvas.width - pattern.length * scale) / 2
          for (let i = 0; i < pattern.length; i += 1) {
            if (pattern[i] === '1') context.fillRect(offset + i * scale, 140, scale, 200)
          }
        }
        context.fillStyle = '#f2f2f2'
        context.fillText(String(frame++), 30, 30)
      }, 40)
      const stream = canvas.captureStream(25)
      const track = stream.getVideoTracks()[0]
      const stop = track.stop.bind(track)
      track.stop = () => { clearInterval(timer); stop() }
      track.getSettings = () => ({ width: 640, height: 480, deviceId: id, facingMode: id === 'front' ? 'user' : 'environment' })
      track.getCapabilities = () => ({})
      window.__cameraTracks.push(track)
      return stream
    } })
  }, { storeId })
})

test('rear camera stays live and switches front/rear in one click without cycling lenses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/s/camera-test/scan')
  const video = page.locator('#korset-scan-view video')
  const shade = page.locator('#korset-scan-view #qr-shaded-region')
  const switchButton = page.getByRole('button', { name: 'Камера', exact: true })
  await expect(switchButton).toBeEnabled({ timeout: 20000 })
  await expect.poll(() => page.evaluate(() => window.__cameraCaptures)).toEqual(['rear-main'])
  await expect(shade).toHaveCount(1)
  await expect(shade).toBeHidden()
  await expect(page.locator('.scan-frame-layer')).toHaveCSS('background-image', 'none')
  expect(await video.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 })
  const time = await video.evaluate((element) => element.currentTime)
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(time + 0.5)
  await switchButton.click()
  await expect(switchButton).toBeEnabled()
  await expect.poll(() => page.evaluate(() => window.__cameraCaptures)).toEqual(['rear-main', 'front'])
  await expect(shade).toHaveCount(1)
  await expect(shade).toBeHidden()
  await switchButton.click()
  await expect(switchButton).toBeEnabled()
  await expect.poll(() => page.evaluate(() => window.__cameraCaptures)).toEqual(['rear-main', 'front', 'rear-main'])
  await expect(shade).toHaveCount(1)
  await expect(shade).toBeHidden()
  await page.evaluate(() => {
    history.pushState({}, '', '/s/camera-test/catalog')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect.poll(() => page.evaluate(() => window.__cameraTracks?.filter((track) => track.readyState === 'live').length || 0)).toBe(0)
})

test('repeated switch taps during startup do not create overlapping captures', async ({ page }) => {
  await page.goto('/s/camera-test/scan')
  const switchButton = page.getByRole('button', { name: 'Камера', exact: true })
  await expect(switchButton).toBeEnabled({ timeout: 20000 })
  await switchButton.evaluate((button) => { for (let i = 0; i < 6; i += 1) button.click() })
  await expect(switchButton).toBeEnabled()
  await expect.poll(() => page.evaluate(() => window.__cameraCaptures)).toEqual(['rear-main', 'front'])
})

test('camera actually decodes the exact EAN digits with the browser decoder', async ({ page }) => {
  // Official ZXing EAN13WriterTestCase fixture: 5901234123457.
  await page.addInitScript((pattern) => { window.__cameraBarcode = pattern }, ean13Pattern)
  await page.goto('/s/camera-test/scan')
  await expect(page).toHaveURL(/\/product\/5901234123457$/, { timeout: 20000 })
  await expect.poll(() => page.evaluate(() => window.__cameraTracks.filter((track) => track.readyState === 'live').length)).toBe(0)
})

test('ZXing fallback also decodes the same exact EAN without the browser detector', async ({ page }) => {
  await page.route('**/src/utils/scannerEngine.js*', async (route) => {
    const response = await route.fetch()
    const original = await response.text()
    const body = original.replace('zbarReady: zbarReady === true || hasBarcodeDetector()', 'zbarReady: false')
    expect(body).not.toBe(original)
    await route.fulfill({ response, body })
  })
  await page.addInitScript((pattern) => { window.__cameraBarcode = pattern }, ean13Pattern)
  await page.goto('/s/camera-test/scan')
  await expect(page).toHaveURL(/\/product\/5901234123457$/, { timeout: 10000 })
})

test('going into the background releases the camera and return opens it once', async ({ page }) => {
  await page.goto('/s/camera-test/scan')
  const switchButton = page.getByRole('button', { name: 'Камера', exact: true })
  await expect(switchButton).toBeEnabled({ timeout: 20000 })
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => page.evaluate(() => window.__cameraTracks.filter((track) => track.readyState === 'live').length)).toBe(0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(switchButton).toBeEnabled()
  await expect.poll(() => page.evaluate(() => window.__cameraCaptures)).toEqual(['rear-main', 'rear-main'])
})

test('a slow product request is not displayed as a missing product and can complete late', async ({ page }) => {
  let releaseRequest
  const pending = new Promise((resolve) => { releaseRequest = resolve })
  await page.route('**/rpc/korset_find_store_source_card', async (route) => {
    await pending
    await route.fulfill({ json: [] })
  })
  await page.goto('/s/camera-test/scan')
  await page.evaluate(() => {
    history.pushState({ usr: { fromScan: true }, key: 'slow-lookup' }, '', '/s/camera-test/product/5901234123457')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByText('Поиск занимает больше времени', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Товар не найден', { exact: true })).not.toBeVisible()
  releaseRequest()
  await expect(page.getByText('Товар не найден', { exact: true })).toBeVisible()
})

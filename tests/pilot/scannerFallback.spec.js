import { test, expect } from '@playwright/test'
import { openConsumer, MILK_EAN, UNKNOWN_EAN } from './consumerFixtures.js'

async function openDeniedScanner(page, { lang = 'ru', theme = 'light', slug = 'pilot-a' } = {}) {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('korset_terms_accepted', JSON.stringify({ accepted: true }))
    globalThis.__deniedCameraRequests = 0
    Object.defineProperty(globalThis.navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        globalThis.__deniedCameraRequests += 1
        throw new globalThis.DOMException('Permission denied', 'NotAllowedError')
      },
    })
    Object.defineProperty(globalThis.navigator.mediaDevices, 'enumerateDevices', {
      configurable: true,
      value: async () => [],
    })
  })
  await openConsumer(page, { lang, theme, slug, cachedProfile: false })
  await expect(page.locator('.catalog-category-card').first()).toBeVisible()
  await page.goto(`/s/${slug}/scan`)
  await expect(page.locator('.scan-status-overlay--error strong')).toHaveText(
    lang === 'ru' ? 'Нет доступа к камере' : 'Камераға рұқсат жоқ',
    { timeout: 15000 },
  )
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`manual lookup remains usable after camera permission denial (${lang}, ${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openDeniedScanner(page, { lang, theme })
      await expect(page.locator('.scan-screen')).not.toContainText('photo_camera')
      const input = page.locator('.scan-manual-input input')
      await input.fill(MILK_EAN)
      expect(await input.evaluate((element) => element.validity.valid)).toBe(true)
      await page.screenshot({ path: test.info().outputPath(`camera-denied-manual-${lang}-${theme}.png`) })
      await page.locator('.scan-submit-btn').click()
      await expect(page).toHaveURL(`/s/pilot-a/product/${MILK_EAN}`)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Pilot')
    })
  }
}

test('unsupported pasted input preserves every digit instead of looking up its valid prefix', async ({ page }) => {
  await openDeniedScanner(page)
  const input = page.locator('.scan-manual-input input')
  const unsupported = `${MILK_EAN}${MILK_EAN}`
  await input.fill(unsupported)
  expect((await input.inputValue()).replace(/\s/gu, '')).toBe(unsupported)
  await page.locator('.scan-submit-btn').click()
  await expect(page.locator('.scan-manual-error')).toBeVisible()
  await expect(page).toHaveURL('/s/pilot-a/scan')
})

test('pasted text cannot silently become a different numeric barcode', async ({ page }) => {
  await openDeniedScanner(page)
  const input = page.locator('.scan-manual-input input')
  await input.fill(`x${MILK_EAN}`)
  await expect(input).toHaveValue(`x${MILK_EAN}`)
  expect(await input.evaluate((element) => element.validity.valid)).toBe(false)
  await expect(page).toHaveURL('/s/pilot-a/scan')
})

test('manual lookup uses the selected second store instead of the previous store catalog', async ({ page }) => {
  await openDeniedScanner(page, { slug: 'pilot-b' })
  await page.locator('.scan-manual-input input').fill(UNKNOWN_EAN)
  await page.locator('.scan-submit-btn').click()
  await expect(page).toHaveURL(`/s/pilot-b/product/${UNKNOWN_EAN}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pilot B product')
  await expect(page.getByText(/^710\s*₸$/u)).toBeVisible()
})

test('an eight-digit entry reaches lookup with every digit and its store intact', async ({ page }) => {
  await openDeniedScanner(page)
  // Copied from the official ZXing fixture in barcodeChecksum.test.mjs, not a catalog record.
  const barcode = '12345670'
  let lookedUp
  await page.route('**/rpc/korset_find_store_source_card', (route) => {
    lookedUp = route.request().postDataJSON()
    return route.fulfill({ json: [] })
  })
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: {} }))
  const input = page.locator('.scan-manual-input input')
  await input.fill(barcode)
  expect(await input.evaluate((element) => element.validity.valid)).toBe(true)
  await page.locator('.scan-submit-btn').click()
  await expect.poll(() => lookedUp).toEqual({
    p_store_id: '00000000-0000-4000-8000-000000000001',
    p_barcode: barcode,
  })
})

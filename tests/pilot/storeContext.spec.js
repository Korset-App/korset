import { test, expect } from '@playwright/test'

const stores = Object.fromEntries(['a', 'b', 'c'].map((letter, index) => [
  `pilot-${letter}`,
  { id: `00000000-0000-4000-8000-00000000000${index + 1}`, code: `pilot-${letter}`, slug: `pilot-${letter}`, name: `Pilot ${letter}`, is_active: true },
]))

async function readState(page) {
  return JSON.parse(await page.getByTestId('state').textContent())
}

async function openProbe(page, { cached = ['pilot-a'], deferred = null, deferredSettings = false, deferredImport = false, failedReload = false, failed = [] } = {}) {
  let release
  let requested
  const responseReady = new Promise((resolve) => { release = resolve })
  const requestReady = new Promise((resolve) => { requested = resolve })
  const imported = new Map()
  const catalogRequests = []
  await page.addInitScript(({ stores, cached }) => {
    localStorage.setItem('korset_store_slug', 'pilot-a')
    for (const slug of cached) localStorage.setItem(`korset_store_data_${slug}`, JSON.stringify(stores[slug]))
  }, { stores, cached })
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'pilot.invalid') return route.abort()
    if (url.pathname === '/rest/v1/stores') {
      if (request.method() === 'PATCH') {
        if (deferredSettings) {
          requested()
          await responseReady
        }
        return route.fulfill({ json: null })
      }
      const slug = url.searchParams.get('code')?.replace(/^eq\./, '')
      if (slug === deferred) {
        requested()
        await responseReady
      }
      if (failed.includes(slug)) return route.fulfill({ status: 403, json: { message: 'Test store unavailable' } })
      return route.fulfill({ json: stores[slug] ?? null })
    }
    if (url.pathname === '/rest/v1/store_products') return route.fulfill({ json: [{ id: 'fixture-product', ean: '4870201234567' }] })
    if (url.pathname.endsWith('/bulk_update_store_products')) {
      const payload = request.postDataJSON()
      if (deferredImport) {
        requested()
        await responseReady
      }
      imported.set(payload.p_store_id, { price: payload.p_price_kzts[0], stock: payload.p_stock_statuses[0] })
      return route.fulfill({ json: 1 })
    }
    if (url.pathname.endsWith('/fn_get_store_catalog_page') || url.pathname.endsWith('/fn_search_store_products')) {
      const storeId = request.postDataJSON().p_store_id
      const store = Object.values(stores).find((value) => value.id === storeId)
      if (url.pathname.endsWith('/fn_get_store_catalog_page')) catalogRequests.push(storeId)
      if (failedReload && url.pathname.endsWith('/fn_get_store_catalog_page') && catalogRequests.length > 1) {
        return route.fulfill({ status: 503, json: { message: 'Read temporarily unavailable' } })
      }
      return route.fulfill({ json: [{
        ean: '4870201234567',
        name: `Fixture ${store?.slug}`,
        price_kzt: imported.get(storeId)?.price ?? 100,
        stock_status: imported.get(storeId)?.stock ?? 'in_stock',
      }] })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/tests/pilot/store-context.html')
  await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-a'])
  return { release, requestReady, catalogRequests }
}

test('changing store clears the previous store and prices before the new response arrives', async ({ page }) => {
  const deferred = await openProbe(page, { deferred: 'pilot-b' })
  try {
    await page.getByRole('link', { name: 'pilot-b' }).click()
    await deferred.requestReady
    await expect.poll(async () => (await readState(page)).store).toBe(null)
    const pending = await readState(page)
    expect(pending.products).toEqual([])
    expect(pending.ready).toBe(false)
    expect(pending.loading).toBe(true)
    expect(pending.catalogPath).toBe(null)
    const snapshots = await page.evaluate(() => window.pilotSnapshots)
    expect(snapshots.filter((state) => state.path === '/s/pilot-b/catalog').every((state) => state.store !== 'pilot-a' && !state.products.includes('Fixture pilot-a'))).toBe(true)
  } finally {
    deferred.release()
  }
  await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-b'])
  expect((await readState(page)).catalogPath).toBe('/s/pilot-b/catalog')
})

test('import refreshes the active catalog price and availability without changing stores', async ({ page }) => {
  await openProbe(page)
  await expect.poll(async () => (await readState(page)).prices).toEqual([100])
  await page.getByRole('button', { name: 'Import fixture' }).click()
  await expect.poll(async () => (await readState(page)).importResult?.updated).toBe(1)
  await expect.poll(async () => (await readState(page)).prices).toEqual([200])
  expect((await readState(page)).stocks).toEqual(['out_of_stock'])
})

test('import refreshes an unchanged active search instead of keeping its old cached price', async ({ page }) => {
  await openProbe(page)
  await page.getByRole('textbox', { name: 'Search fixture' }).fill('Fixture')
  await expect.poll(async () => (await readState(page)).searchPrices).toEqual([100])
  await page.getByRole('button', { name: 'Import fixture' }).click()
  await expect.poll(async () => (await readState(page)).importResult?.updated).toBe(1)
  await expect.poll(async () => (await readState(page)).searchPrices).toEqual([200])
})

test('a failed read after import retains the confirmed write count and reports stale catalog data', async ({ page }) => {
  await openProbe(page, { failedReload: true })
  await expect.poll(async () => (await readState(page)).prices).toEqual([100])
  await page.getByRole('button', { name: 'Import fixture' }).click()
  await expect.poll(async () => (await readState(page)).importResult?.updated).toBe(1)
  await expect.poll(async () => (await readState(page)).catalogError).toBe(true)
  const state = await readState(page)
  expect(state.prices).toEqual([100])
  expect(state.catalogLoading).toBe(false)
})

test('a completed import for the previous store does not reload the newly selected catalog', async ({ page }) => {
  const deferred = await openProbe(page, { deferredImport: true })
  try {
    await page.getByRole('button', { name: 'Import fixture' }).click()
    await deferred.requestReady
    await page.getByRole('link', { name: 'pilot-b' }).click()
    await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-b'])
    deferred.release()
    await expect.poll(async () => (await readState(page)).importResult?.updated).toBe(1)
    expect((await readState(page)).prices).toEqual([100])
    expect(deferred.catalogRequests.filter((id) => id === stores['pilot-b'].id)).toHaveLength(1)
  } finally {
    deferred.release()
  }
})

test('a failed uncached store request never leaves the previous store available', async ({ page }) => {
  await openProbe(page, { failed: ['pilot-b'] })
  await page.getByRole('link', { name: 'pilot-b' }).click()
  await expect.poll(async () => (await readState(page)).loading).toBe(false)
  const state = await readState(page)
  expect(state.store).toBe(null)
  expect(state.products).toEqual([])
  expect(state.ready).toBe(false)
  expect(state.catalogPath).toBe(null)
})

test('cached store fallback survives a network error without exposing the previous catalog', async ({ page }) => {
  await openProbe(page, { cached: ['pilot-a', 'pilot-b'], failed: ['pilot-b'] })
  await page.getByRole('link', { name: 'pilot-b' }).click()
  await expect.poll(async () => (await readState(page)).store).toBe('pilot-b')
  await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-b'])
  const snapshots = await page.evaluate(() => window.pilotSnapshots)
  expect(snapshots.filter((state) => state.path === '/s/pilot-b/catalog').every((state) => state.store !== 'pilot-a' && !state.products.includes('Fixture pilot-a'))).toBe(true)
})

test('a late store response cannot replace the most recently selected store', async ({ page }) => {
  const deferred = await openProbe(page, { deferred: 'pilot-b' })
  try {
    await page.getByRole('link', { name: 'pilot-b' }).click()
    await deferred.requestReady
    await page.getByRole('link', { name: 'pilot-c' }).click()
    await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-c'])
  } finally {
    deferred.release()
  }
  await expect.poll(async () => (await readState(page)).store).toBe('pilot-c')
  expect((await readState(page)).catalogPath).toBe('/s/pilot-c/catalog')
})

test('returning to a cached store while another store is pending restores its catalog', async ({ page }) => {
  const deferred = await openProbe(page, { deferred: 'pilot-b' })
  try {
    await page.getByRole('link', { name: 'pilot-b' }).click()
    await deferred.requestReady
    await page.getByRole('link', { name: 'pilot-a' }).click()
    await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-a'])
  } finally {
    deferred.release()
  }
  expect((await readState(page)).store).toBe('pilot-a')
})

test('saving old store settings cannot replace the newly selected store', async ({ page }) => {
  const deferred = await openProbe(page, { deferredSettings: true })
  try {
    await page.getByRole('button', { name: 'Save settings' }).click()
    await deferred.requestReady
    await page.getByRole('link', { name: 'pilot-b' }).click()
    await expect.poll(async () => (await readState(page)).products).toEqual(['Fixture pilot-b'])
  } finally {
    deferred.release()
  }
  await expect.poll(async () => (await readState(page)).settingsResult).toEqual({ error: null, warning: null })
  const state = await readState(page)
  expect(state.store).toBe('pilot-b')
  expect(state.storeName).toBe('Pilot b')
  expect(state.products).toEqual(['Fixture pilot-b'])
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('korset_store_data_pilot-a')).name)).toBe('Updated pilot-a')
})

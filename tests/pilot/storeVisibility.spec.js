import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { MILK_EAN, stores } from './consumerFixtures.js'

const OWNER_ID = '00000000-0000-4000-8000-000000000002'
const OTHER_ID = '00000000-0000-4000-8000-000000000003'

async function state(page) {
  return JSON.parse(await page.getByTestId('visibility').textContent())
}

async function openVisibility(page, { published = false, active = true, response = 'network' } = {}) {
  const store = { ...stores['pilot-a'], owner_id: OWNER_ID, is_published: published, isPublished: published, is_active: active }
  let signedInUser = null
  const catalogRequests = []
  await page.addInitScript((store) => {
    globalThis.localStorage.setItem('korset_store_slug', store.slug)
    const key = `korset_store_data_${store.slug}`
    if (!globalThis.localStorage.getItem(key)) globalThis.localStorage.setItem(key, JSON.stringify(store))
  }, store)
  await page.route('**/*', async (route) => {
    const url = new globalThis.URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue()
    if (url.hostname !== 'pilot.invalid') return route.abort()
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: signedInUser })
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ json: {} })
    if (url.pathname === '/rest/v1/users') return route.fulfill({ json: { id: signedInUser?.id, name: 'Fixture owner' } })
    if (url.pathname === '/rest/v1/stores') {
      if (route.request().method() === 'PATCH') return route.fulfill({ json: null })
      if (response === 'network') return route.abort()
      if (response === 'forbidden') return route.fulfill({ status: 403, json: { message: 'Store access denied' } })
      if (response === 'success') return route.fulfill({ json: store })
      return route.fulfill({ json: null })
    }
    if (url.pathname.endsWith('/fn_get_store_catalog_page')) {
      catalogRequests.push(route.request().postDataJSON().p_store_id)
      return route.fulfill({ json: [{ ean: MILK_EAN, name: 'Private fixture product', price_kzt: 890, stock_status: 'in_stock' }] })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/tests/pilot/store-visibility.html')
  await expect.poll(async () => (await state(page)).authLoading).toBe(false)
  await expect.poll(async () => (await state(page)).loading).toBe(false)
  return {
    catalogRequests,
    setResponse: (next) => { response = next },
    signIn: async ({ owner = true, superadmin = false, metadataAdmin = false } = {}) => {
      signedInUser = {
        id: owner ? OWNER_ID : OTHER_ID,
        aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test',
        app_metadata: { is_superadmin: superadmin },
        user_metadata: { is_superadmin: metadataAdmin },
      }
      const token = [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sub: signedInUser.id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
        'test-only-signature',
      ].join('.')
      await page.evaluate(async (token) => {
        const { supabase } = await import('/src/utils/supabase.js')
        const { error } = await supabase.auth.setSession({ access_token: token, refresh_token: 'test-only' })
        if (error) throw error
      }, token)
      await expect.poll(async () => (await state(page)).userId).toBe(signedInUser.id)
    },
  }
}

for (const response of ['network', 'missing']) {
  test(`a guest cannot expose a cached draft store after a ${response} response`, async ({ page }) => {
    const probe = await openVisibility(page, { response })
    await expect.poll(async () => (await state(page)).store).toBe(null)
    expect((await state(page)).products).toEqual([])
    expect(probe.catalogRequests).toEqual([])
  })
}

test('a different account cannot use a cached draft or user-editable admin metadata', async ({ page }) => {
  const probe = await openVisibility(page)
  await probe.signIn({ owner: false, metadataAdmin: true })
  expect((await state(page)).store).toBe(null)
  expect(probe.catalogRequests).toEqual([])
})

test('the owner can preview a cached draft but signing out hides its loaded catalog immediately', async ({ page }) => {
  const probe = await openVisibility(page)
  await probe.signIn()
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect.poll(async () => (await state(page)).userId).toBe(null)
  expect((await state(page)).store).toBe(null)
  expect((await state(page)).products).toEqual([])
  expect((await state(page)).ready).toBe(false)
})

test('a verified superadmin can preview a cached draft', async ({ page }) => {
  const probe = await openVisibility(page)
  await probe.signIn({ owner: false, superadmin: true })
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
})

test('a published cached store remains usable after a network failure', async ({ page }) => {
  await openVisibility(page, { published: true })
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
  expect((await state(page)).store).toBe('Pilot A')
})

for (const response of ['missing', 'forbidden']) {
  test(`an authoritative ${response} response revokes a stale published cache`, async ({ page }) => {
    await openVisibility(page, { published: true, response })
    await expect.poll(async () => (await state(page)).store).toBe(null)
    expect((await state(page)).products).toEqual([])
  })
}

test('an inactive cached store stays unavailable even for its owner', async ({ page }) => {
  const probe = await openVisibility(page, { active: false })
  await probe.signIn()
  expect((await state(page)).store).toBe(null)
  expect(probe.catalogRequests).toEqual([])
})

test('a denied published cache cannot return on reload when the network then fails', async ({ page }) => {
  const probe = await openVisibility(page, { published: true, response: 'missing' })
  await expect.poll(async () => (await state(page)).store).toBe(null)
  const requestsBeforeReload = probe.catalogRequests.length
  probe.setResponse('network')
  await page.reload()
  await expect.poll(async () => (await state(page)).authLoading).toBe(false)
  await expect.poll(async () => (await state(page)).loading).toBe(false)
  expect((await state(page)).store).toBe(null)
  expect((await state(page)).products).toEqual([])
  expect(probe.catalogRequests).toHaveLength(requestsBeforeReload)
})

test('publishing a cached draft keeps its public view available after the owner signs out', async ({ page }) => {
  const probe = await openVisibility(page)
  await probe.signIn()
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
  await page.getByRole('button', { name: 'Publish fixture' }).click()
  await expect.poll(async () => (await state(page)).saved).toBe(true)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect.poll(async () => (await state(page)).userId).toBe(null)
  expect((await state(page)).store).toBe('Pilot A')
})

test('returning online revalidates a denied store and restores a newly successful public response', async ({ page }) => {
  const probe = await openVisibility(page, { published: true, response: 'missing' })
  await expect.poll(async () => (await state(page)).store).toBe(null)
  await page.context().setOffline(true)
  await expect.poll(async () => (await state(page)).online).toBe(false)
  probe.setResponse('success')
  await page.context().setOffline(false)
  await expect.poll(async () => (await state(page)).store).toBe('Pilot A')
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
})

test('a guest denial does not revoke the known owner preview during a later store network failure', async ({ page }) => {
  const probe = await openVisibility(page, { response: 'missing' })
  probe.setResponse('network')
  await probe.signIn()
  await expect.poll(async () => (await state(page)).store).toBe('Pilot A')
})

test('an authoritative denial for the owner cannot be bypassed using the same owner session offline', async ({ page }) => {
  const probe = await openVisibility(page, { response: 'forbidden' })
  await probe.signIn()
  await expect.poll(async () => page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('korset_store_data_pilot-a')).accessRevokedFor)).toContain(OWNER_ID)
  probe.setResponse('network')
  await page.reload()
  await expect.poll(async () => (await state(page)).authLoading).toBe(false)
  expect((await state(page)).store).toBe(null)
  expect((await state(page)).products).toEqual([])
})

test('a later guest denial preserves an earlier owner denial during the next owner network failure', async ({ page }) => {
  const probe = await openVisibility(page)
  await probe.signIn()
  await expect.poll(async () => (await state(page)).products).toEqual(['Private fixture product'])
  probe.setResponse('forbidden')
  await page.reload()
  await expect.poll(async () => page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('korset_store_data_pilot-a')).accessRevokedFor)).toContain(OWNER_ID)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect.poll(async () => page.evaluate(() => {
    const denied = JSON.parse(globalThis.localStorage.getItem('korset_store_data_pilot-a')).accessRevokedFor
    return denied === null || (Array.isArray(denied) && denied.includes('guest'))
  })).toBe(true)
  probe.setResponse('network')
  await probe.signIn()
  await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))))
  expect((await state(page)).store).toBe(null)
  expect((await state(page)).products).toEqual([])
})

import { test, expect } from '@playwright/test'

test('installed app serves store deep links and reloads offline without turning API requests into HTML', async ({ page, context, baseURL }) => {
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === baseURL) return route.continue()
    return route.abort()
  })
  await page.goto('/privacy-policy')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
  await context.setOffline(true)

  for (const path of ['/s/pwa-test/catalog', '/s/pwa-test/scan']) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response.status()).toBe(200)
    expect(response.fromServiceWorker()).toBe(true)
    await expect(page.locator('#root')).toBeAttached()
  }
  const reload = await page.reload({ waitUntil: 'domcontentloaded' })
  expect(reload.status()).toBe(200)
  expect(reload.fromServiceWorker()).toBe(true)

  const api = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/pwa-offline-test')
      return response.headers.get('content-type') || ''
    } catch {
      return 'network-error'
    }
  })
  expect(api).not.toContain('text/html')
  await expect(page.goto('/api/pwa-offline-test', { waitUntil: 'domcontentloaded' })).rejects.toThrow()
})

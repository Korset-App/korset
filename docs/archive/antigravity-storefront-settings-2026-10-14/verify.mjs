import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PORT = 5187
const BASE_URL = `http://127.0.0.1:${PORT}`
const SCRATCH_DIR = 'C:/projects/korset/scratch/antigravity-storefront-settings-2026-10-14'
const SCREENSHOTS_DIR = join(SCRATCH_DIR, 'screenshots')

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

// Helper to wait for dev server
async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404 || res.status === 200) {
        return true
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`)
}

// Start vite dev server if not already running
let serverProcess = null
async function ensureServer() {
  try {
    const res = await fetch(BASE_URL)
    if (res.status === 200 || res.status === 404) {
      console.log(`Server already running at ${BASE_URL}`)
      return
    }
  } catch {
    // Need to start
  }

  console.log(`Starting Vite dev server on port ${PORT}...`)
  serverProcess = spawn(
    'npm.cmd',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      cwd: 'C:/projects/korset',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  )

  serverProcess.stdout.on('data', (d) => {
    const text = d.toString()
    if (text.includes('ready in') || text.includes('Local:')) {
      console.log('[Vite stdout]', text.trim())
    }
  })

  serverProcess.stderr.on('data', (d) => {
    console.error('[Vite stderr]', d.toString().trim())
  })

  await waitForServer(BASE_URL)
  console.log(`Vite server ready at ${BASE_URL}`)
}

async function runAudit() {
  await ensureServer()

  const browser = await chromium.launch({
    headless: true,
  })

  const results = {
    checks: [],
    overflows: [],
    consoleErrors: [],
    qrUrl: null,
    navigationPassed: true,
  }

  // Setup helper for a page
  async function setupMockPage(context, { slug = 'audit', name, isPublished = true, lang = 'ru', theme = 'light', features = {} } = {}) {
    const page = await context.newPage()

    page.on('pageerror', (err) => {
      console.error('[PageError at ' + page.url() + ']:', err.stack)
      results.consoleErrors.push({ url: page.url(), error: err.message, stack: err.stack })
    })

    const store = {
      id: '00000000-0000-4000-8000-000000000001',
      owner_id: '00000000-0000-4000-8000-000000000002',
      code: slug,
      slug,
      name: name || (lang === 'kz' ? '«Береке» азық-түлік дүкені' : 'Продуктовый магазин «Береке»'),
      address: lang === 'kz' ? 'Сығанақ к-сі, 18, Астана қ.' : 'ул. Сыганак, 18, Астана',
      opening_hours: '08:00 - 23:00',
      phone: '77011234567',
      whatsapp_number: '77011234567',
      short_description: lang === 'kz' ? 'Үй жанындағы жаңа піскен өнімдер' : 'Свежие продукты у дома каждый день',
      description: lang === 'kz' ? 'Сапалы халал ет, сүт өнімдері мен ыстық нан.' : 'Качественное халал-мясо, молочные продукты и горячий тандырный хлеб.',
      is_active: true,
      is_published: isPublished,
      isPublished: isPublished,
      type: 'minimarket',
      latitude: 51.128,
      longitude: 71.430,
      twogis_url: 'https://2gis.kz/astana/firm/70000001018342123',
      instagram_url: 'bereke_astana',
      ai_store_notes: 'Свежая выпечка поступает каждый день в 08:30. Фермерская молочка по вторникам.',
      features: {
        contacts: {
          phones: [
            { id: 'p_1', number: '77011234567', role: 'main', customLabel: '' },
            { id: 'p_2', number: '77017654321', role: 'admin', customLabel: '' }
          ],
          whatsapps: [
            { id: 'w_1', number: '77011234567', role: 'main', customLabel: '' }
          ]
        },
        payment: ['kaspi_qr', 'card', 'cash'],
        amenities: ['halal', 'bakery', 'parking', 'self_checkout'],
        ...features
      },
      images: []
    }

    await page.addInitScript(({ store, theme, lang }) => {
      localStorage.setItem(`korset_store_data_${store.slug}`, JSON.stringify(store))
      localStorage.setItem('korset_theme', theme)
      localStorage.setItem('korset_lang', lang)
    }, { store, theme, lang })

    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return route.continue()
      }
      // Intercept any Supabase rest requests
      if (url.pathname.includes('/rest/v1/stores')) {
        if (request.method() === 'PATCH' || request.method() === 'POST' || request.method() === 'PUT') {
          return route.fulfill({ status: 200, json: store })
        }
        return route.fulfill({ json: store })
      }
      if (url.pathname.startsWith('/rest/v1/')) {
        return route.fulfill({ json: [] })
      }
      if (url.pathname.startsWith('/storage/v1/')) {
        return route.fulfill({ status: 200, json: { Key: 'mocked' } })
      }
      return route.fulfill({ json: {} })
    })

    return { page, store }
  }

  // 1. Matrix configurations
  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 960 },
    { name: 'tablet-1024', width: 1024, height: 768 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-320', width: 320, height: 640 },
  ]

  const themes = [
    { theme: 'light', lang: 'ru', suffix: 'ru-light' },
    { theme: 'dark', lang: 'kz', suffix: 'kz-dark' },
  ]

  const screens = [
    { id: 'storefront', path: '/retail/audit/storefront?preview', title: 'Витрина' },
    { id: 'settings', path: '/retail/audit/settings?preview', title: 'Настройки' },
  ]

  console.log('--- Executing visual & responsive matrix ---')
  for (const vp of viewports) {
    for (const th of themes) {
      for (const scr of screens) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
        const { page } = await setupMockPage(context, { theme: th.theme, lang: th.lang })

        const targetUrl = `${BASE_URL}${scr.path}`
        await page.goto(targetUrl, { waitUntil: 'networkidle' })
        await page.waitForTimeout(600)

        const filename = `${scr.id}__${vp.name}__${th.suffix}.png`
        const filepath = join(SCREENSHOTS_DIR, filename)
        await page.screenshot({ path: filepath, fullPage: true })
        console.log(`Saved screenshot: ${filename}`)

        // Check horizontal overflow
        const overflowElements = await page.evaluate(() => {
          const bad = []
          const docScroll = document.documentElement.scrollWidth
          const docClient = document.documentElement.clientWidth
          if (docScroll > docClient + 1) {
            bad.push(`DOCUMENT_VIEWPORT (scrollWidth=${docScroll}, clientWidth=${docClient})`)
          }

          document.querySelectorAll('*').forEach((el) => {
            const tag = el.tagName.toLowerCase()
            if (['input', 'textarea', 'svg', 'path'].includes(tag)) return

            const style = window.getComputedStyle(el)
            if (style.overflowX === 'hidden' || style.overflowX === 'clip' || style.textOverflow === 'ellipsis') {
              return
            }

            if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
              const cls = el.className ? `.${String(el.className).split(' ').join('.')}` : ''
              const id = el.id ? `#${el.id}` : ''
              bad.push(`${tag}${id}${cls} (scrollWidth=${el.scrollWidth}, clientWidth=${el.clientWidth})`)
            }
          })
          return bad.slice(0, 10)
        })

        if (overflowElements.length > 0) {
          results.overflows.push({
            screen: scr.id,
            viewport: vp.name,
            theme: th.suffix,
            elements: overflowElements,
          })
        }

        await context.close()
      }
    }
  }

  // 2. Specific Targeted checks
  console.log('--- Targeted Checks: Long Names, Empty States, Draft vs Published, QR, Interactions ---')

  // Check 2a: Long store name on 390 mobile and 1440 desktop
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } })
    const longName = 'Гипермаркет фермерских свежих эко-продуктов «Bereke Grand Deluxe & Organic Halal» в Астане'
    const { page } = await setupMockPage(context, { name: longName, lang: 'ru', theme: 'light' })

    await page.goto(`${BASE_URL}/retail/audit/storefront?preview`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, `targeted__storefront__long-name__${width}px.png`), fullPage: true })

    await page.goto(`${BASE_URL}/retail/audit/settings?preview`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, `targeted__settings__long-name__${width}px.png`), fullPage: true })

    await context.close()
  }

  // Check 2b: Draft status storefront & settings (is_published = false)
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const { page } = await setupMockPage(context, { isPublished: false, lang: 'ru', theme: 'light' })

    await page.goto(`${BASE_URL}/retail/audit/storefront?preview`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__storefront__draft-state__390px.png'), fullPage: true })

    await page.goto(`${BASE_URL}/retail/audit/settings?preview`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__settings__draft-state__390px.png'), fullPage: true })

    await context.close()
  }

  // Check 2c: Storefront QR Code inspection & Link verification
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
    const { page } = await setupMockPage(context, { lang: 'ru', theme: 'light' })
    await page.goto(`${BASE_URL}/retail/audit/storefront?preview`, { waitUntil: 'networkidle' })

    // Check QR element
    const qrSvg = await page.locator('svg[role="img"], svg').filter({ has: page.locator('path') }).first()
    const qrContainer = page.locator('text=Печать QR-материалов для зала').locator('..').locator('..')
    const qrValue = await page.evaluate(() => {
      // Find react-qr-code svg or text around it
      const svg = document.querySelector('svg')
      return svg ? svg.parentElement?.innerText || svg.outerHTML.slice(0, 80) : null
    })
    console.log('QR inspection snippet:', qrValue)

    // Check link hrefs
    const openStorefrontBtn = page.getByRole('link', { name: /Открыть витрину|Витринаны ашу/i })
    const openStorefrontHref = await openStorefrontBtn.getAttribute('href')
    console.log('Storefront public button href:', openStorefrontHref)
    results.storefrontPublicHref = openStorefrontHref

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__storefront__qr-section.png') })
    await context.close()
  }

  // Check 2d: Settings Dirty state & RetailSaveBar
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
    const { page } = await setupMockPage(context, { lang: 'ru', theme: 'light' })
    await page.goto(`${BASE_URL}/retail/audit/settings?preview`, { waitUntil: 'networkidle' })

    // Save bar initially not visible
    const saveBarInitial = await page.locator('.retail-save-bar').count()

    // Type in name input
    const nameInput = page.locator('input[placeholder*="Bereke"]').first()
    await nameInput.fill('Новое измененное название магазина')
    await page.waitForTimeout(300)

    // Save bar should now be visible
    const saveBarVisible = await page.locator('.retail-save-bar').isVisible()
    console.log('Save bar after dirty change visible:', saveBarVisible)

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__settings__savebar-dirty.png') })

    // Click Discard
    const discardBtn = page.locator('.retail-save-bar__btn-discard')
    if (await discardBtn.isVisible()) {
      await discardBtn.click()
      await page.waitForTimeout(300)
    }

    await context.close()
  }

  // Check 2e: Danger zone modal (Clear Catalog)
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
    const { page } = await setupMockPage(context, { lang: 'ru', theme: 'light' })
    await page.goto(`${BASE_URL}/retail/audit/settings?preview`, { waitUntil: 'networkidle' })

    const clearBtn = page.getByRole('button', { name: 'Сброс', exact: true })
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__settings__danger-clear-modal.png') })
      // Press Escape or cancel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    await context.close()
  }

  // Check 2f: Public customer screen `/s/audit` comparison
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const { page } = await setupMockPage(context, { lang: 'ru', theme: 'light' })
    await page.goto(`${BASE_URL}/s/audit`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__public-shopper__home-390px.png'), fullPage: true })

    await page.goto(`${BASE_URL}/stores/audit`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'targeted__public-shopper__store-public-390px.png'), fullPage: true })
    await context.close()
  }

  await browser.close()

  console.log('--- Finished Browser Checks ---')
  console.log('Console Errors found:', results.consoleErrors.length)
  console.log('Overflow occurrences found:', results.overflows.length)

  // Write results JSON
  writeFileSync(join(SCRATCH_DIR, 'results.json'), JSON.stringify(results, null, 2), 'utf-8')

  return results
}

runAudit()
  .then((res) => {
    console.log('VERIFICATION COMPLETE');
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(1);
  });

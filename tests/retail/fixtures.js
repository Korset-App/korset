import { liveSnapshots } from './liveSnapshot.js'

export async function openRetail(
  page,
  {
    theme = 'light',
    lang = 'ru',
    mode = 'filled',
    large = false,
    draft = false,
    preview = true,
    snapshot,
  } = {}
) {
  const live = liveSnapshots[snapshot]
  const slug = live ? snapshot : 'audit'
  const store = {
    id: '00000000-0000-4000-8000-000000000001',
    owner_id: '00000000-0000-4000-8000-000000000002',
    code: slug,
    slug,
    name:
      live?.name ??
      (large ? 'Тестовый продуктовый магазин с длинным названием' : 'Тестовый магазин'),
    is_active: true,
    is_published: live ? live.published : !draft,
    isPublished: live ? live.published : !draft,
    images: [],
  }
  await page.addInitScript(
    ({ store, theme, lang }) => {
      localStorage.setItem(`korset_store_data_${store.slug}`, JSON.stringify(store))
      localStorage.setItem('korset_theme', theme)
      localStorage.setItem('korset_lang', lang)
    },
    { store, theme, lang }
  )
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue()
    if (live?.top.some((product) => product.image_url === request.url()))
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="58"><rect width="52" height="58" fill="#dedbd3"/></svg>',
      })
    if (url.pathname === '/rest/v1/stores') return route.fulfill({ json: store })
    if (url.pathname.startsWith('/rest/v1/')) {
      if (mode === 'error' || (mode === 'partial-error' && url.pathname.endsWith('/scan_events')))
        return route.fulfill({ status: 403, json: { message: 'Simulated unavailable data' } })
      if (request.method() === 'HEAD')
        return route.fulfill({
          body: '',
          headers: {
            'content-range': `*/${live ? (url.pathname.endsWith('/scan_events') ? live.scans : live.products) : mode === 'empty' ? 0 : url.pathname.endsWith('/scan_events') ? (large ? 1234567 : 120) : 1200}`,
            'access-control-expose-headers': 'content-range',
          },
        })
      const populated = mode !== 'empty'
      if (
        url.pathname.endsWith('/get_missed_opportunities') &&
        !('p_limit' in request.postDataJSON())
      )
        return route.fulfill({
          status: 300,
          json: {
            code: 'PGRST203',
            message:
              'Could not choose the best candidate function between overloaded get_missed_opportunities',
          },
        })
      const responses = {
        get_unique_customers: live?.customers ?? (populated ? 48 : 0),
        get_lost_revenue: live?.lost ?? (populated ? (large ? 1234567 : 18350) : 0),
        get_scan_coverage: live?.coverage ?? (populated ? 82 : 0),
        get_top_scanned_products:
          live?.top ?? (populated ? [{ ean: null, name: 'Тестовый товар', scan_count: 30 }] : []),
        get_missed_opportunities: [],
        fn_get_alternative_events_summary: [
          {
            total_count: live ? 0 : populated ? 24 : 0,
            compare_count: live ? 0 : populated ? 7 : 0,
            ai_help_count: live ? 0 : populated ? 5 : 0,
          },
        ],
        fn_get_compare_events_summary: [
          live?.comparisons ?? {
            total_count: populated ? 9 : 0,
            winner_count: populated ? 5 : 0,
            draw_count: populated ? 3 : 0,
            blocked_count: populated ? 1 : 0,
          },
        ],
      }
      return route.fulfill({ json: responses[url.pathname.split('/').at(-1)] ?? [] })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto(`/retail/${slug}/dashboard${preview ? '?preview' : ''}`, {
    waitUntil: 'domcontentloaded',
  })
  if (preview) await page.locator('.ov-title').waitFor()
}

/* global process, console */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseImages(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return JSON.parse(raw).filter(Boolean) } catch { return [] }
}

function ensureAbsolute(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `https://korset.app${url}`
}

function truncateText(str, max) {
  if (!str) return ''
  if (str.length <= max) return str
  return str.slice(0, max - 3) + '...'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).end('Method Not Allowed')
    return
  }

  const { storeSlug, ean } = req.query
  if (!storeSlug || !ean) return serveDefaultHtml(res)

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('[product-seo] Supabase env vars missing')
    return serveDefaultHtml(res)
  }

  try {
    // Fetch store and product in parallel.
    // Products live in global_products; price comes from store_products join.
    const [storeResult, productResult] = await Promise.all([
      supabase
        .from('stores')
        .select('id, name, code, logo_url, is_active, is_published')
        .eq('code', storeSlug)
        .eq('is_active', true)
        .single(),
      supabase
        .from('store_products')
        .select(
          'price_kzt, local_name, global_products!inner(ean, name, name_kz, brand, category, image_url, images, description)'
        )
        .eq('is_active', true)
        .eq('global_products.ean', String(ean))
        .eq('global_products.is_active', true)
        .limit(1)
        .maybeSingle(),
    ])

    const store = storeResult.data
    const spRow = productResult.data
    const gp = spRow?.global_products

    if (!store || !gp) {
      // Fallback: try fetching product directly from global_products (store-agnostic)
      const { data: gpFallback } = await supabase
        .from('global_products')
        .select('ean, name, name_kz, brand, category, image_url, images, description')
        .eq('ean', String(ean))
        .eq('is_active', true)
        .maybeSingle()

      if (!store || !gpFallback) {
        console.log(`[product-seo] Not found: store=${storeSlug}, ean=${ean}`)
        return serveDefaultHtml(res)
      }

      return buildAndSendHtml(res, store, gpFallback, null)
    }

    return buildAndSendHtml(res, store, gp, spRow.price_kzt ?? null, spRow.local_name ?? null)
  } catch (err) {
    console.error('[product-seo] exception', err)
    return serveDefaultHtml(res)
  }
}

function buildAndSendHtml(res, store, gp, priceKzt, localName) {
  let html = getTemplateHtml()
  if (!html) {
    res.status(500).end('Server Error')
    return
  }

  const productName = escapeHtml(localName || gp.name || 'Товар')
  const storeName = escapeHtml(store.name || 'Магазин')
  const brand = gp.brand ? ` · ${escapeHtml(gp.brand)}` : ''
  const price = priceKzt ? ` · ${Math.round(priceKzt)} ₸` : ''

  const title = `${productName}${price} | ${storeName}`
  const cleanDesc = gp.description ? gp.description.replace(/\s+/g, ' ').trim() : ''
  const description = cleanDesc
    ? escapeHtml(truncateText(cleanDesc, 160))
    : `${productName}${brand} в магазине ${storeName}. Проверьте халал-статус, аллергены и КБЖУ в Körset.`

  // Pick the best available image.
  // Priority: product images[] → single image_url → store logo → Körset default.
  const images = parseImages(gp.images)
  const rawImage =
    (images.length > 0 ? images[0] : null) ||
    gp.image_url ||
    store.logo_url ||
    null

  // og:image must be an absolute HTTPS URL that bots can fetch without auth.
  const imageUrl = ensureAbsolute(rawImage) || 'https://korset.app/brand/og-default.png'
  const productUrl = `https://korset.app/s/${store.code}/product/${gp.ean}`

  // Schema.org Product markup
  const schemaJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: gp.name || productName,
    image: imageUrl,
    '@id': productUrl,
    url: productUrl,
    brand: gp.brand ? { '@type': 'Brand', name: gp.brand } : undefined,
    offers: priceKzt
      ? {
          '@type': 'Offer',
          priceCurrency: 'KZT',
          price: Math.round(priceKzt),
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: store.name },
        }
      : undefined,
  }

  const extraMeta = [
    // Explicit image dimensions help WhatsApp and Instagram render correctly.
    // We can't know actual pixel size at runtime; 1200×630 is the recommended OG size.
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="' + escapeHtml(productName) + '" />',
    '<meta property="og:type" content="product" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`,
  ].join('\n')

  html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`)
  html = html.replace(/(<meta name="description" content=")[^"]*(")/g, `$1${description}$2`)
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/g, `$1${title}$2`)
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/g, `$1${description}$2`)
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/g, `$1${imageUrl}$2`)
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/g, `$1${productUrl}$2`)
  html = html.replace(/(<meta property="og:type" content=")[^"]*(")/g, '')
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/g, `$1${title}$2`)
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/g, `$1${description}$2`)
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/g, `$1${imageUrl}$2`)
  html = html.replace(/(<meta name="twitter:card" content=")[^"]*(")/g, '')
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/g, `$1${productUrl}$2`)
  html = html.replace('</head>', `${extraMeta}\n</head>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Short cache: 10 min, allow stale for 30 min. Prices may change.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
  res.status(200).send(html)
}

function getTemplateHtml() {
  const pathsToTry = [
    path.join(process.cwd(), 'dist/index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(__dirname, 'index.html'),
  ]
  for (const htmlPath of pathsToTry) {
    try {
      if (fs.existsSync(htmlPath)) return fs.readFileSync(htmlPath, 'utf8')
    } catch (e) {
      console.warn(`[product-seo] Failed to read ${htmlPath}:`, e)
    }
  }
  return null
}

function serveDefaultHtml(res) {
  const html = getTemplateHtml()
  if (html) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } else {
    res.status(500).end('Server Error')
  }
}

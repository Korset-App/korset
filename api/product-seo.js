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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).end('Method Not Allowed')
    return
  }

  const { storeSlug, ean } = req.query
  if (!storeSlug || !ean) {
    return serveDefaultHtml(res)
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('[product-seo] Supabase environment variables missing')
    return serveDefaultHtml(res)
  }

  try {
    // Fetch store and product in parallel
    const [storeResult, productResult] = await Promise.all([
      supabase
        .from('stores')
        .select('id, name, code, logo_url, is_active, is_published')
        .eq('code', storeSlug)
        .eq('is_active', true)
        .single(),
      supabase
        .from('products')
        .select('ean, name, name_kz, brand, category, image, images, price_kzt, short_description')
        .eq('ean', ean)
        .single(),
    ])

    const store = storeResult.data
    const product = productResult.data

    if (!store || !product) {
      console.log(`[product-seo] Not found: store=${storeSlug}, ean=${ean}`)
      return serveDefaultHtml(res)
    }

    let html = getTemplateHtml()
    if (!html) {
      console.error('[product-seo] Failed to load index.html template')
      res.status(500).end('Server Error')
      return
    }

    const productName = escapeHtml(product.name || 'Товар')
    const storeName = escapeHtml(store.name || 'Магазин')
    const brand = product.brand ? ` · ${escapeHtml(product.brand)}` : ''
    const price = product.price_kzt ? ` · ${Math.round(product.price_kzt)} ₸` : ''

    const title = `${productName}${price} | ${storeName}`
    const description = product.short_description
      ? escapeHtml(product.short_description)
      : `${productName}${brand} в магазине ${storeName}. Проверьте халал-статус, аллергены и КБЖУ в Körset.`

    // Pick best available image: product images array → single product image → store logo → default
    const rawImage =
      (product.images && product.images.length > 0 ? product.images[0] : null) ||
      product.image ||
      store.logo_url ||
      'https://korset.app/brand/korset-app-icon.png'

    // Ensure absolute URL for og:image (Supabase Storage URLs are already absolute)
    const imageUrl = rawImage.startsWith('http') ? rawImage : `https://korset.app${rawImage}`
    const productUrl = `https://korset.app/s/${store.code}/product/${ean}`

    // Schema.org Product markup
    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: imageUrl,
      '@id': productUrl,
      url: productUrl,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: product.price_kzt
        ? {
            '@type': 'Offer',
            priceCurrency: 'KZT',
            price: Math.round(product.price_kzt),
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: store.name },
          }
        : undefined,
    }

    const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`

    html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`)
    html = html.replace(
      /(<meta name="description" content=")[^"]*(")/g,
      `$1${description}$2`
    )
    html = html.replace(
      /(<meta property="og:title" content=")[^"]*(")/g,
      `$1${title}$2`
    )
    html = html.replace(
      /(<meta property="og:description" content=")[^"]*(")/g,
      `$1${description}$2`
    )
    html = html.replace(
      /(<meta property="og:image" content=")[^"]*(")/g,
      `$1${imageUrl}$2`
    )
    html = html.replace(
      /(<meta property="og:url" content=")[^"]*(")/g,
      `$1${productUrl}$2`
    )
    html = html.replace(
      /(<meta name="twitter:title" content=")[^"]*(")/g,
      `$1${title}$2`
    )
    html = html.replace(
      /(<meta name="twitter:description" content=")[^"]*(")/g,
      `$1${description}$2`
    )
    html = html.replace(
      /(<meta name="twitter:image" content=")[^"]*(")/g,
      `$1${imageUrl}$2`
    )
    html = html.replace(
      /(<link rel="canonical" href=")[^"]*(")/g,
      `$1${productUrl}$2`
    )
    html = html.replace('</head>', `${schemaScript}\n</head>`)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // 30 min cache — product prices can change, but not every second
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
    res.status(200).send(html)
  } catch (err) {
    console.error('[product-seo] handler exception', err)
    return serveDefaultHtml(res)
  }
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
      if (fs.existsSync(htmlPath)) {
        return fs.readFileSync(htmlPath, 'utf8')
      }
    } catch (e) {
      console.warn(`[product-seo] Failed to read html at ${htmlPath}:`, e)
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

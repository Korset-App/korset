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

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).end('Method Not Allowed')
    return
  }

  const { storeSlug } = req.query
  if (!storeSlug) {
    // If no slug is provided, just serve standard index.html
    return serveDefaultHtml(res)
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('[store-seo] Supabase environment variables missing')
    return serveDefaultHtml(res)
  }

  try {
    // Fetch store from DB (must be active and published)
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('code', storeSlug)
      .eq('is_active', true)
      .eq('is_published', true)
      .single()

    if (error || !store) {
      console.log(`[store-seo] Store not found or draft for slug: ${storeSlug}`)
      return serveDefaultHtml(res)
    }

    // Load original compiled index.html template
    let html = getTemplateHtml()
    if (!html) {
      console.error('[store-seo] Failed to load index.html template')
      res.status(500).end('Server Error')
      return
    }

    // Dynamic metadata content
    const storeName = store.name || 'Магазин'
    const storeCity = store.city || ''
    const storeAddress = [storeCity, store.address].filter(Boolean).join(', ')
    const title = `${storeName} — Онлайн-каталог и Fit-Check продуктов | Körset`
    const storeSummary = store.short_description || store.description || ''
    const description = storeSummary
      ? (storeCity ? `${storeSummary} в ${storeCity}. Каталог товаров с ценами, проверка халал-статуса и состава продуктов в Körset.` : `${storeSummary}. Каталог товаров с ценами, проверка халал-статуса и состава продуктов в Körset.`)
      : `Каталог товаров магазина ${storeName}${storeCity ? ` в ${storeCity}` : ''}. Цены, состав продуктов, Fit-Check по аллергенам и халал.`
    const logoUrl = store.logo_url || 'https://korset.app/brand/korset-app-icon.png'
    const imageUrl = (store.images && store.images.length > 0) ? store.images[0] : logoUrl
    const storeUrl = `https://korset.app/s/${store.code}`

    // Structure Schema.org JSON-LD (GroceryStore / LocalBusiness)
    const schemaJson = {
      "@context": "https://schema.org",
      "@type": "GroceryStore",
      "name": storeName,
      "image": logoUrl,
      "@id": storeUrl,
      "url": storeUrl,
      "telephone": store.phone || "",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": store.address || "",
        "addressLocality": storeCity || "Астана",
        "addressCountry": "KZ"
      }
    }

    if (storeAddress) {
      schemaJson.description = `Продуктовый магазин ${storeName} по адресу ${storeAddress}. Каталог товаров с ценами, проверка халал-статуса и состава продуктов в Körset.`
    }

    if (store.latitude && store.longitude) {
      schemaJson.geo = {
        "@type": "GeoCoordinates",
        "latitude": Number(store.latitude),
        "longitude": Number(store.longitude)
      }
    }

    const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`

    // Replace meta tags in HTML using simple regex or direct replaces
    html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`)
    
    // Replace standard description
    html = html.replace(/<meta name="description" content="[^"]*"/g, `<meta name="description" content="${description}"`)
    
    // Replace OpenGraph tags
    html = html.replace(/<meta property="og:title" content="[^"]*"/g, `<meta property="og:title" content="${title}"`)
    html = html.replace(/<meta property="og:description" content="[^"]*"/g, `<meta property="og:description" content="${description}"`)
    html = html.replace(/<meta property="og:image" content="[^"]*"/g, `<meta property="og:image" content="${imageUrl}"`)
    html = html.replace(/<meta property="og:url" content="[^"]*"/g, `<meta property="og:url" content="${storeUrl}"`)
    
    // Replace Twitter tags
    html = html.replace(/<meta name="twitter:title" content="[^"]*"/g, `<meta name="twitter:title" content="${title}"`)
    html = html.replace(/<meta name="twitter:description" content="[^"]*"/g, `<meta name="twitter:description" content="${description}"`)
    html = html.replace(/<meta name="twitter:image" content="[^"]*"/g, `<meta name="twitter:image" content="${imageUrl}"`)
    
    // Replace Canonical link
    html = html.replace(/<link rel="canonical" href="[^"]*"/g, `<link rel="canonical" href="${storeUrl}"`)

    // Inject Schema JSON-LD before </head>
    html = html.replace('</head>', `${schemaScript}\n</head>`)

    // Set response headers and return
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(html)

  } catch (err) {
    console.error('[store-seo] handler exception', err)
    return serveDefaultHtml(res)
  }
}

function getTemplateHtml() {
  const pathsToTry = [
    path.join(process.cwd(), 'dist/index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(__dirname, 'index.html')
  ]

  for (const htmlPath of pathsToTry) {
    try {
      if (fs.existsSync(htmlPath)) {
        return fs.readFileSync(htmlPath, 'utf8')
      }
    } catch (e) {
      console.warn(`[store-seo] Failed to read html at ${htmlPath}:`, e)
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

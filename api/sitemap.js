/* global process, console */
import { createClient } from '@supabase/supabase-js'

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

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('[sitemap] Supabase environment variables missing')
    res.status(500).end('Server misconfiguration')
    return
  }

  try {
    // Fetch all active stores (is_active = true)
    const { data: stores, error } = await supabase
      .from('stores')
      .select('code, updated_at')
      .eq('is_active', true)
      .eq('is_published', true)

    if (error) {
      console.error('[sitemap] Database fetch error', error)
      res.status(500).end('Database error')
      return
    }

    const host = req.headers.host || 'korset.app'
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const baseUrl = `${protocol}://${host}`

    // Start building XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    // 1. Home page
    xml += `  <url>\n`
    xml += `    <loc>${baseUrl}/</loc>\n`
    xml += `    <changefreq>daily</changefreq>\n`
    xml += `    <priority>1.0</priority>\n`
    xml += `  </url>\n`

    // 2. Stores list page
    xml += `  <url>\n`
    xml += `    <loc>${baseUrl}/stores</loc>\n`
    xml += `    <changefreq>daily</changefreq>\n`
    xml += `    <priority>0.9</priority>\n`
    xml += `  </url>\n`

    // 3. Dynamic active store URLs (product pages are explicitly excluded)
    if (stores && stores.length > 0) {
      stores.forEach(store => {
        const lastMod = store.updated_at ? new Date(store.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        xml += `  <url>\n`
        xml += `    <loc>${baseUrl}/s/${store.code}</loc>\n`
        xml += `    <lastmod>${lastMod}</lastmod>\n`
        xml += `    <changefreq>weekly</changefreq>\n`
        xml += `    <priority>0.8</priority>\n`
        xml += `  </url>\n`
      })
    }

    xml += `</urlset>\n`

    // Set XML response headers and caching (cache on CDN for 1 hour, serve stale up to 24 hours while revalidating)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(xml)

  } catch (err) {
    console.error('[sitemap] handler exception', err)
    res.status(500).end('Internal Server Error')
  }
}

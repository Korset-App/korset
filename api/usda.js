import {
  checkRateLimit,
  PROXY_RATE_LIMITS,
  getRateLimitKey,
  sanitizeString,
  fetchWithTimeout,
  captureApiError,
} from '../src/lib/monitoring.js'

const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const MAX_QUERY_LEN = 200
const MAX_PAGE_SIZE = 25

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const rawQuery = String(req.query?.query || '').trim()
  const rawUpc = String(req.query?.upc || '').trim()
  const rawPageSize = parseInt(req.query?.pageSize, 10) || 5
  const apiKey = process.env.USDA_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'USDA_API_KEY not configured' })

  if (!rawQuery && !rawUpc) {
    return res.status(400).json({ error: 'query or upc param is required' })
  }

  // ── Input validation ──
  const query = sanitizeString(rawQuery, MAX_QUERY_LEN)
  const upc = sanitizeString(rawUpc, 20)
  const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE)

  // ── Rate limit ──
  const rateKey = getRateLimitKey(req, { authenticated: false })
  const rateResult = checkRateLimit(rateKey, PROXY_RATE_LIMITS.anonymous)
  res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining))
  if (!rateResult.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: PROXY_RATE_LIMITS.anonymous.windowMs })
  }

  try {
    let url
    if (upc) {
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(upc)}&dataType=Branded&pageSize=${pageSize}&api_key=${apiKey}`
    } else {
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Branded&pageSize=${pageSize}&api_key=${apiKey}`
    }

    const response = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' },
    }, 15000)

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(`[usda] USDA API HTTP ${response.status}: ${text.substring(0, 200)}`)
      return res.status(502).json({ error: 'External API unavailable' })
    }

    const json = await response.json()
    const foods = (json.foods || []).map(f => ({
      fdcId: f.fdcId,
      gtinUpc: f.gtinUpc || null,
      description: f.description,
      brandName: f.brandName || null,
      brandOwner: f.brandOwner || null,
      ingredients: f.ingredients || null,
      packageWeight: f.packageWeight || null,
      foodCategory: f.foodCategory || null,
      dataSource: f.dataSource || null,
      nutrients: (f.foodNutrients || []).map(n => ({
        name: n.nutrientName,
        value: n.value,
        unit: n.unitName,
      })),
    }))

    return res.status(200).json({
      totalHits: json.totalHits || 0,
      count: foods.length,
      foods,
    })
  } catch (error) {
    captureApiError(error, req, { query, upc })
    console.error('USDA proxy error', error)
    return res.status(500).json({ error: 'Failed to fetch from USDA' })
  }
}

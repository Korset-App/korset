const CORS_ORIGINS = [
  'https://korset.app',
  'https://www.korset.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { query, ean, pageSize } = req.query
  const apiKey = process.env.EAN_SEARCH_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'EAN_SEARCH_API_KEY not configured' })

  if (!query && !ean) {
    return res.status(400).json({ error: 'query or ean param is required' })
  }

  try {
    let url
    if (ean) {
      url = `https://api.ean-search.org/api?token=${apiKey}&ean=${encodeURIComponent(ean)}&format=json`
    } else {
      url = `https://api.ean-search.org/api?token=${apiKey}&search=${encodeURIComponent(query)}&format=json&pagesize=${pageSize || 5}`
    }

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return res.status(response.status).json({ error: `EAN-Search HTTP ${response.status}`, detail: text.substring(0, 200) })
    }

    let data
    const text = await response.text()
    try {
      data = JSON.parse(text)
    } catch (_) {
      return res.status(502).json({ error: 'Invalid JSON from EAN-Search', raw: text.substring(0, 200) })
    }

    if (!Array.isArray(data)) {
      data = [data]
    }

    const results = data.map(item => ({
      ean: item.ean || item.EAN || item.barcode || null,
      name: item.name || item.productname || item.title || null,
      category: item.category || item.productgroup || null,
      manufacturer: item.manufacturer || null,
      country: item.country || null,
      issuingAgency: item.issuingAgency || null,
    }))

    return res.status(200).json({
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('EAN-Search proxy error', error)
    return res.status(500).json({ error: 'Failed to fetch from EAN-Search.org' })
  }
}

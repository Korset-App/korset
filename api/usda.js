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

  const { query, upc, pageSize } = req.query
  const apiKey = process.env.USDA_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'USDA_API_KEY not configured' })

  if (!query && !upc) {
    return res.status(400).json({ error: 'query or upc param is required' })
  }

  try {
    let url
    if (upc) {
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(upc)}&dataType=Branded&pageSize=${pageSize || 1}&api_key=${apiKey}`
    } else {
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Branded&pageSize=${pageSize || 5}&api_key=${apiKey}`
    }

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return res.status(response.status).json({ error: `USDA HTTP ${response.status}`, detail: text.substring(0, 200) })
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
    console.error('USDA proxy error', error)
    return res.status(500).json({ error: 'Failed to fetch from USDA' })
  }
}

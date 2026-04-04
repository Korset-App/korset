
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ean = String(req.query?.ean || '').trim()
  if (!ean) return res.status(400).json({ error: 'ean query param is required' })

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}?fields=product_name,brands,ingredients_text_ru,ingredients_text,allergens_tags,allergens_hierarchy,nutriments,image_front_url,labels_tags,nutriscore_grade,quantity`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Korset/1.0 (https://korset.app)',
        'From': 'hello@korset.app',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `OFF HTTP ${response.status}` })
    }

    const json = await response.json()
    if (json.status !== 1 || !json.product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.status(200).json({ product: json.product })
  } catch (error) {
    console.error('OFF proxy error', error)
    return res.status(500).json({ error: 'Failed to fetch product from Open Food Facts' })
  }
}

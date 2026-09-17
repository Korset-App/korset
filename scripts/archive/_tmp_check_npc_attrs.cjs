const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const https = require('https')
const { URL } = require('url')
const NPC_API_KEY = process.env.NPC_API_KEY

function httpReq(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
      timeout: 15000,
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

async function main() {
  // Search for products with known EANs to see attributes
  const searches = [
    'Рахат конфеты',     // Kazakh brand, likely halal
    'M&Ms',               // International, might mention halal
    'Ferrero Rocher',     // Premium, might certify halal for KZ
    'Skittles',           // Common candy
    'Halva подсолнечная', // Traditional halva
    'Mentos',             // Common candy
  ]
  
  for (const q of searches) {
    const r = await httpReq('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search', {
      'X-API-KEY': NPC_API_KEY, 'Content-Type': 'application/json',
    }, { query: q, page: 1, size: 5 })
    
    if (r.status !== 200) continue
    const items = JSON.parse(r.body).items || []
    if (items.length === 0) continue
    
    console.log(`\n=== "${q}" ===`)
    for (const item of items.slice(0, 2)) {
      console.log(`GTIN: ${item.gtin || 'N/A'}`)
      console.log(`nameRu: ${item.nameRu || 'N/A'}`)
      console.log(`nameKk: ${item.nameKk || 'N/A'}`)
      console.log(`shortNameRu: ${item.shortNameRu || 'N/A'}`)
      console.log(`categoryNameRuL1: ${item.categoryNameRuL1 || 'N/A'}`)
      console.log(`categoryNameRuL2: ${item.categoryNameRuL2 || 'N/A'}`)
      console.log(`categoryNameRuL3: ${item.categoryNameRuL3 || 'N/A'}`)
      console.log(`categoryNameRuL4: ${item.categoryNameRuL4 || 'N/A'}`)
      
      // Check attributes
      if (item.attributes) {
        console.log(`attributes type: ${typeof item.attributes}`)
        if (Array.isArray(item.attributes)) {
          for (const attr of item.attributes) {
            const strVal = JSON.stringify(attr).toLowerCase()
            if (strVal.includes('халал') || strVal.includes('halal') || strVal.includes('халял')) {
              console.log(`  HALAL ATTR: ${JSON.stringify(attr)}`)
            }
          }
          // Show all attribute names
          const attrNames = item.attributes.map(a => a.name || a.code || '?')
          console.log(`  attribute names: ${[...new Set(attrNames)].join(', ')}`)
        } else if (typeof item.attributes === 'object') {
          console.log(`attributes: ${JSON.stringify(item.attributes).substring(0, 500)}`)
        }
      } else {
        console.log(`attributes: none`)
      }
      
      console.log(`images: ${item.images ? 'yes (' + (Array.isArray(item.images) ? item.images.length : typeof item.images) + ')' : 'no'}`)
      console.log('---')
    }
  }
}

main().catch(console.error)

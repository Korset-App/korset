const https = require('https')
const { URL } = require('url')

function httpReq(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
      timeout: 15000,
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('JSON parse error: ' + data))
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  console.log('Fetching token...')
  const auth = await httpReq('POST', 'https://arbuz.kz/api/v1/auth/token', {}, { consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' })
  const token = auth.data.token
  console.log('Token:', token ? 'OK' : 'FAILED')

  const brands = ['Ahmad', 'Greenfield', 'Tess', 'Piala', 'Alokozay', 'Basilur', 'Curtis', 'Richard', 'Dilmah', 'Lipton']
  const idStats = new Map()

  for (const brand of brands) {
    console.log(`Searching for "${brand}"...`)
    const res = await httpReq('GET', `https://arbuz.kz/api/v1/shop/search/products?where[name][c]=${encodeURIComponent(brand)}&limit=50`, { 'Authorization': 'Bearer ' + token })
    const items = res.data?.items || res.data || []
    if (Array.isArray(items)) {
      items.forEach(p => {
        const cat = p.catalogId
        const parent = p.parentCatalogId
        const key = `${cat} (parent: ${parent})`
        idStats.set(key, (idStats.get(key) || 0) + 1)
        if (p.name.toLowerCase().includes('чай') || p.name.toLowerCase().includes('tea')) {
          // console.log(`  [MATCH] ${p.name} | catalog: ${cat}, parent: ${parent}`)
        }
      })
    }
  }

  console.log('\n=== CATALOG ID STATISTICS ===')
  for (const [key, count] of idStats.entries()) {
    console.log(`  Catalog ID ${key}: ${count} matches`)
  }
}

main().catch(console.error)

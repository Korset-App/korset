const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const API_BASE = 'https://arbuz.kz/api/v1'
const CONSUMER_NAME = 'arbuz-kz.web.mobile'
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj'

async function getToken() {
  const r = await fetch(API_BASE + '/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY }),
  })
  const j = await r.json()
  return j.data.token
}

async function main() {
  const token = await getToken()
  console.log('Token acquired:', token.substring(0, 20) + '...')

  const endpoints = [
    { url: `${API_BASE}/shop/catalog/201118`, desc: 'Сухарики (201118)' },
    { url: `${API_BASE}/shop/catalog/225442`, desc: 'Крекеры (225442)' },
    { url: `${API_BASE}/shop/catalog/19797`, desc: 'Семечки (19797)' },
    { url: `${API_BASE}/shop/catalog/224571`, desc: 'Кукурузные палочки (224571)' },
    { url: `${API_BASE}/shop/catalog/224626`, desc: 'Попкорн (224626)' },
    { url: `${API_BASE}/shop/catalog/224627`, desc: 'Закуски к пиву (224627)' },
    { url: `${API_BASE}/shop/catalog/225605`, desc: 'Закуски и снеки (225605)' }
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { headers: { 'Authorization': 'Bearer ' + token } })
      console.log(`\nTesting: ${ep.desc} (${ep.url})`)
      console.log(`Status: ${res.status}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && typeof json.data === 'object') {
          console.log(`Catalog: "${json.data.name}" (ID: ${json.data.id})`)
          console.log(`  - catalogCount (total products count): ${json.data.catalogCount}`)
          console.log(`  - Nested subcategories count: ${json.data.catalogs?.length || 0}`)
          if (json.data.catalogs?.length > 0) {
            console.log(`    Subcategories:`)
            for (const child of json.data.catalogs) {
              console.log(`      * "${child.name}" (ID: ${child.id}, URL: https://arbuz.kz/ru/almaty/catalog/cat/${child.id}-${child.uri})`)
            }
          }
          console.log(`  - Direct products array count: ${json.data.products?.length || 0}`)
        }
      } else {
        const text = await res.text()
        console.log(`Error body: ${text.substring(0, 150)}`)
      }
    } catch (e) {
      console.log(`Failed: ${e.message}`)
    }
  }
}

main().catch(console.error)

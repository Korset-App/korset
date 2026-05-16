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
    { url: `${API_BASE}/shop/categories/225304`, desc: 'Category detail 225304' },
    { url: `${API_BASE}/shop/categories/225304/products?limit=100`, desc: 'Category products direct link 225304' },
    { url: `${API_BASE}/shop/collections/225304/products?limit=100`, desc: 'Collection 225304' }
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { headers: { 'Authorization': 'Bearer ' + token } })
      console.log(`\nTesting: ${ep.desc} (${ep.url})`)
      console.log(`Status: ${res.status}`)
      if (res.ok) {
        const json = await res.json()
        const items = json.data?.items || json.data?.products || json.data || []
        const count = Array.isArray(items) ? items.length : (items.list ? items.list.length : 'not array')
        console.log(`Success! Items count/type: ${count}`)
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Sample product: "${items[0].name}" (ID: ${items[0].id})`)
        } else if (json.data && typeof json.data === 'object') {
          const keys = Object.keys(json.data)
          console.log(`Data keys: ${keys.join(', ')}`)
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

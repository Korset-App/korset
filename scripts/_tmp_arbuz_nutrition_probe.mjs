import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const API_BASE = 'https://arbuz.kz/api/v1'
const CONSUMER_NAME = 'arbuz-kz.web.mobile'
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj'
const SOURCE_REPORT = 'data\\arbuz-enrich\\arbuz-enrich-2026-05-24T21-56-22-401Z.json'
const OUT_PATH = 'C:\\tmp\\korset-arbuz-nutrition-probe.json'

function request(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          ...headers,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function getToken() {
  const response = await request('POST', `${API_BASE}/auth/token`, {}, {
    consumer: CONSUMER_NAME,
    key: CONSUMER_KEY,
  })
  if (response.status !== 200) throw new Error(`Auth failed: ${response.status}`)
  const json = JSON.parse(response.body)
  const token = json.data?.token
  if (!token) throw new Error('No token')
  return token
}

async function getProduct(token, id) {
  const response = await request('GET', `${API_BASE}/shop/product/${id}`, {
    Authorization: `Bearer ${token}`,
  })
  if (response.status !== 200) return { error: `HTTP ${response.status}` }
  return JSON.parse(response.body).data
}

async function main() {
  const report = JSON.parse(fs.readFileSync(SOURCE_REPORT, 'utf8'))
  const ids = report.results
    .map((item) => item.arbuzId)
    .filter(Boolean)
    .slice(0, 20)
  const token = await getToken()
  const rows = []

  for (const id of ids) {
    const product = await getProduct(token, id)
    const nutrition = product?.nutrition || null
    const characteristics = Array.isArray(product?.characteristics) ? product.characteristics : []
    rows.push({
      id,
      name: product?.name || null,
      nutrition,
      nutritionKeys: nutrition && typeof nutrition === 'object' ? Object.keys(nutrition) : [],
      characteristicNames: characteristics.map((item) => item?.name).filter(Boolean),
    })
  }

  const keyCounts = {}
  for (const row of rows) {
    for (const key of row.nutritionKeys) keyCounts[key] = (keyCounts[key] || 0) + 1
  }

  const result = { checked: rows.length, keyCounts, rows }
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8')

  console.log('=== ARBUZ NUTRITION PROBE ===')
  console.log(`Checked: ${rows.length}`)
  console.log('Nutrition keys:')
  for (const [key, count] of Object.entries(keyCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`${key}: ${count}`)
  }
  console.log(`Saved report to ${OUT_PATH}`)
}

main().catch((error) => {
  console.error('Arbuz nutrition probe failed:', error)
  process.exit(1)
})

import fs from 'node:fs/promises'
import path from 'node:path'
import { parseFoodmasterProduct } from './utils/foodmasterCatalogParser.mjs'

const base = 'https://foodmaster.kz'
const dir = path.resolve('scratch/foodmaster-night')
const rawDir = path.join(dir, 'raw')
const outputPath = path.join(dir, 'products.jsonl')
const maxPages = Number(process.env.FOODMASTER_MAX_PAGES || 500)
await fs.mkdir(rawDir, { recursive: true })

async function page(relativeUrl, filename) {
  const saved = path.join(rawDir, filename)
  try { return await fs.readFile(saved, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  const response = await fetch(`${base}${relativeUrl}`, {
    headers: { 'User-Agent': 'KorsetCatalogResearch/1.0 (public product facts; one request per 1.25s)' },
    signal: AbortSignal.timeout(20000),
  })
  if (response.status === 429 || response.status === 403) throw new Error(`Source blocked collection: HTTP ${response.status} ${relativeUrl}`)
  if (!response.ok) throw new Error(`HTTP ${response.status} ${relativeUrl}`)
  const html = await response.text()
  await fs.writeFile(saved, html, { flag: 'wx' })
  await new Promise(resolve => setTimeout(resolve, 1250))
  return html
}

const index = await page('/ru/catalog', 'index.html')
const queue = [...new Set([...index.matchAll(/href="(\/ru\/catalog\/[^"?#]+)"/g)].map(match => match[1]))]
const seen = new Set()
const recorded = new Set()
try {
  for (const line of (await fs.readFile(outputPath, 'utf8')).split(/\r?\n/).filter(Boolean)) recorded.add(JSON.parse(line).sourceId)
} catch (error) { if (error.code !== 'ENOENT') throw error }

for (let index = 0; index < queue.length && seen.size < maxPages; index++) {
  const relativeUrl = queue[index]
  if (seen.has(relativeUrl)) continue
  seen.add(relativeUrl)
  const slug = relativeUrl.split('/').pop()
  const html = await page(relativeUrl, `${slug}.html`)
  for (const match of html.matchAll(/href="(\/ru\/catalog\/[^"?#]+)"/g)) {
    if (!seen.has(match[1]) && !queue.includes(match[1])) queue.push(match[1])
  }
  const product = parseFoodmasterProduct(html, `${base}${relativeUrl}`)
  if (product && !recorded.has(product.sourceId)) {
    await fs.appendFile(outputPath, `${JSON.stringify(product)}\n`)
    recorded.add(product.sourceId)
  }
  if (seen.size % 25 === 0) console.log(JSON.stringify({ pages: seen.size, queued: queue.length, products: recorded.size }))
}
console.log(JSON.stringify({ pages: seen.size, queued: queue.length, products: recorded.size, output: outputPath }))

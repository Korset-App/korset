import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseRakhatProduct } from './utils/rakhatCatalogParser.mjs'

const dir = path.resolve('scratch/rakhat-night')
const pageLines = (await fs.readFile(path.join(dir, 'pages.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean)
const pages = new Map(pageLines.map(line => {
  const row = JSON.parse(line)
  return [row.relativeUrl, row.filename]
}))
const products = new Map()
for (const [relativeUrl, filename] of pages) {
  if (!relativeUrl.startsWith('/products/') || relativeUrl === '/products/') continue
  const html = await fs.readFile(path.join(dir, 'raw', filename), 'utf8')
  const product = parseRakhatProduct(html, `https://www.rakhat.kz${relativeUrl}`)
  if (product) products.set(product.sourceId, { ...product, sourcePageSha256: createHash('sha256').update(html).digest('hex') })
}
const rows = [...products.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId))
await fs.writeFile(path.join(dir, 'products-derived.jsonl'), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`)
const summary = {
  savedPages: pages.size,
  products: rows.length,
  withIngredients: rows.filter(row => row.ingredients_raw).length,
  withFullNutrition: rows.filter(row => row.nutriments_json).length,
  withManufacturerSku: rows.filter(row => row.manufacturer_sku).length,
}
await fs.writeFile(path.join(dir, 'products-derived-summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary))

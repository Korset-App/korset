import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseFoodmasterProduct } from './utils/foodmasterCatalogParser.mjs'

const dir = path.resolve('scratch/foodmaster-night')
const rawDir = path.join(dir, 'raw')
const entries = await fs.readdir(rawDir)
const products = []
for (const filename of entries) {
  if (filename === 'index.html' || !filename.endsWith('.html')) continue
  const html = await fs.readFile(path.join(rawDir, filename), 'utf8')
  const slug = filename.slice(0, -5)
  const product = parseFoodmasterProduct(html, `https://foodmaster.kz/ru/catalog/${slug}`)
  if (product) products.push({ ...product, sourcePageSha256: createHash('sha256').update(html).digest('hex') })
}
products.sort((a, b) => a.sourceId.localeCompare(b.sourceId))
await fs.writeFile(path.join(dir, 'products-derived.jsonl'), `${products.map(product => JSON.stringify(product)).join('\n')}\n`)
const summary = {
  savedPages: entries.length - 1,
  products: products.length,
  withFullNutrition: products.filter(product => product.nutriments_json).length,
  withIngredients: products.filter(product => product.ingredients_raw).length,
  suspectPackage: products.filter(product => product.package_quantity_suspect).length,
}
await fs.writeFile(path.join(dir, 'products-derived-summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary))

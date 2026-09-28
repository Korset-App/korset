import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseKdvGroupCatalog } from './utils/kdvGroupCatalogParser.mjs'

const dir = path.resolve('scratch/kdv-group-night')
const rawDir = path.join(dir, 'raw')
const index = await fs.readFile(path.join(rawDir, 'index.html'), 'utf8')
const categoryIds = [...new Set([...index.matchAll(/href="\/ru\/category\/(\d+)"/g)].map(match => match[1]))]
const excluded = new Set(['208', '213', '183'])
const groupIds = new Set()
for (const categoryId of categoryIds) {
  if (excluded.has(categoryId)) continue
  const html = await fs.readFile(path.join(rawDir, `category-${categoryId}.html`), 'utf8')
  for (const match of html.matchAll(/data-goodsId="(\d+)"/g)) groupIds.add(match[1])
}

const products = new Map()
let savedGroups = 0
for (const groupId of groupIds) {
  let html
  try { html = await fs.readFile(path.join(rawDir, `group-${groupId}.html`), 'utf8') }
  catch (error) { if (error.code === 'ENOENT') continue; throw error }
  savedGroups++
  const url = `https://kdv-group.com/ru/catalog/${groupId}`
  const sourcePageSha256 = createHash('sha256').update(html).digest('hex')
  for (const product of parseKdvGroupCatalog(html, url)) {
    if (products.has(product.sourceId)) continue
    products.set(product.sourceId, { ...product, sourcePageSha256 })
  }
}

const rows = [...products.values()].sort((a, b) => Number(a.sourceId) - Number(b.sourceId))
await fs.writeFile(path.join(dir, 'food-products-derived.jsonl'), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`)
const summary = {
  foodGroups: groupIds.size,
  savedGroups,
  products: rows.length,
  withIngredients: rows.filter(row => row.ingredients_raw).length,
  withFullNutrition: rows.filter(row => row.nutriments_json).length,
  withPackageQuantity: rows.filter(row => row.package_quantity_raw).length,
}
await fs.writeFile(path.join(dir, 'food-products-derived-summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary))

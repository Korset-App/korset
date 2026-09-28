import fs from 'node:fs/promises'
import path from 'node:path'
import { parseKdvGroupCatalog } from './utils/kdvGroupCatalogParser.mjs'

const base = 'https://kdv-group.com'
const dir = path.resolve('scratch/kdv-group-night')
const rawDir = path.join(dir, 'raw')
const recordsPath = path.join(dir, 'products.jsonl')
const delayMs = 1250
const maxGroups = Number(process.env.KDV_MAX_GROUPS || 1000)

await fs.mkdir(rawDir, { recursive: true })

function ids(html, pattern) {
  return [...new Set([...html.matchAll(pattern)].map(match => match[1]))]
}

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
  await new Promise(resolve => setTimeout(resolve, delayMs))
  return html
}

const index = await page('/ru/catalog/', 'index.html')
const categoryIds = ids(index, /href="\/ru\/category\/(\d+)"/g)
const groupIds = new Set()
for (const categoryId of categoryIds) {
  if (new Set(['208', '213', '183']).has(categoryId)) continue
  const html = await page(`/ru/category/${categoryId}`, `category-${categoryId}.html`)
  for (const id of ids(html, /data-goodsId="(\d+)"/g)) groupIds.add(id)
}

let completed = new Set()
let recorded = new Set()
try {
  for (const line of (await fs.readFile(recordsPath, 'utf8')).split(/\r?\n/).filter(Boolean)) {
    const row = JSON.parse(line)
    recorded.add(row.sourceId)
  }
} catch (error) { if (error.code !== 'ENOENT') throw error }
try {
  completed = new Set(JSON.parse(await fs.readFile(path.join(dir, 'completed-groups.json'), 'utf8')))
} catch (error) { if (error.code !== 'ENOENT') throw error }

let processed = 0
for (const groupId of groupIds) {
  if (completed.has(groupId)) continue
  if (processed >= maxGroups) break
  const relativeUrl = `/ru/catalog/${groupId}`
  const html = await page(relativeUrl, `group-${groupId}.html`)
  const products = parseKdvGroupCatalog(html, `${base}${relativeUrl}`)
  for (const product of products) {
    if (recorded.has(product.sourceId)) continue
    await fs.appendFile(recordsPath, `${JSON.stringify(product)}\n`)
    recorded.add(product.sourceId)
  }
  completed.add(groupId)
  await fs.writeFile(path.join(dir, 'completed-groups.json'), JSON.stringify([...completed]))
  processed++
  if (processed % 20 === 0) console.log(JSON.stringify({ processed, groups: groupIds.size, products: recorded.size }))
}
console.log(JSON.stringify({ processed, completedGroups: completed.size, groups: groupIds.size, products: recorded.size, output: recordsPath }))

import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseRakhatProduct } from './utils/rakhatCatalogParser.mjs'

const base = 'https://www.rakhat.kz'
const dir = path.resolve('scratch/rakhat-night')
const rawDir = path.join(dir, 'raw')
const outputPath = path.join(dir, 'products.jsonl')
const maxPages = Number(process.env.RAKHAT_MAX_PAGES || 2000)
await fs.mkdir(rawDir, { recursive: true })

function links(html) {
  const found = new Set()
  for (const match of html.matchAll(/href=(?:["']?)(https?:\/\/(?:www\.)?rakhat\.kz\/(?:product-category|products)\/[^\s"'<>]+)/gi)) {
    const url = new URL(match[1].replace(/&amp;/g, '&'))
    if (/\/feed\/?$/.test(url.pathname)) continue
    found.add(url.pathname)
  }
  return [...found]
}

async function page(relativeUrl) {
  const filename = `${createHash('sha1').update(relativeUrl).digest('hex')}.html`
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
  await fs.appendFile(path.join(dir, 'pages.jsonl'), `${JSON.stringify({ relativeUrl, filename })}\n`)
  await new Promise(resolve => setTimeout(resolve, 1250))
  return html
}

const queue = ['/products/']
const seen = new Set()
const recorded = new Set()
try {
  for (const line of (await fs.readFile(outputPath, 'utf8')).split(/\r?\n/).filter(Boolean)) recorded.add(JSON.parse(line).sourceId)
} catch (error) { if (error.code !== 'ENOENT') throw error }

for (let index = 0; index < queue.length && seen.size < maxPages; index++) {
  const relativeUrl = queue[index]
  if (seen.has(relativeUrl)) continue
  seen.add(relativeUrl)
  const html = await page(relativeUrl)
  for (const linked of links(html)) if (!seen.has(linked) && !queue.includes(linked)) queue.push(linked)
  if (relativeUrl.startsWith('/products/') && relativeUrl !== '/products/') {
    const product = parseRakhatProduct(html, `${base}${relativeUrl}`)
    if (product && !recorded.has(product.sourceId)) {
      await fs.appendFile(outputPath, `${JSON.stringify(product)}\n`)
      recorded.add(product.sourceId)
    }
  }
  if (seen.size % 50 === 0) console.log(JSON.stringify({ pages: seen.size, queued: queue.length, products: recorded.size }))
}
console.log(JSON.stringify({ pages: seen.size, queued: queue.length, products: recorded.size, output: outputPath }))

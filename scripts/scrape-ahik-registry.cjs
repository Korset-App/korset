const https = require('https')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://halal-kz.kz/ru/predpriyatiya'

function fetchPage(page) {
  return new Promise((resolve) => {
    const url = page === 1 ? BASE_URL : BASE_URL + '?page=' + page
    https.get(url, { timeout: 20000, headers: { 'User-Agent': 'Korset/1.0' } }, (res) => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => resolve(body))
    }).on('error', (e) => { console.error(`Page ${page} error:`, e.message); resolve(null) })
      .on('timeout', function () { this.destroy(); resolve(null) })
  })
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
}

function parseEnterprises(html) {
  if (!html) return []

  const items = []
  const itemRegex = /<div class="company-item">[\s\S]*?<div class="company-category">([\s\S]*?)<\/div>[\s\S]*?<div class="company-name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span class="company-sert_date">([\s\S]*?)<\/span>/g

  let m
  while ((m = itemRegex.exec(html)) !== null) {
    const category = decodeEntities(m[1].trim())
    const name = decodeEntities(m[2].trim())
    const certUntil = m[3].trim()

    if (!name && !category) continue

    // Determine status from the full match context
    const blockStart = Math.max(0, m.index)
    const blockEnd = Math.min(html.length, m.index + m[0].length + 500)
    const context = html.substring(blockStart, blockEnd)
    let status = 'ok'
    if (/company-status_end/.test(context)) status = 'end'
    else if (/company-status_stop/.test(context)) status = 'stop'

    items.push({ name, category, status, certUntil, source: 'ahik' })
  }

  return items
}

function getLastPage(html) {
  if (!html) return 0
  // Find all page numbers in pagination links
  const pageRegex = /<a[^>]*href="[^"]*page=(\d+)[^>]*>/g
  let maxPage = 0
  let m
  while ((m = pageRegex.exec(html)) !== null) {
    const p = parseInt(m[1], 10)
    if (p > maxPage) maxPage = p
  }
  return maxPage
}

async function main() {
  console.log('=== Scraping AHIK (halal-kz.kz) Enterprise Registry ===\n')

  // First page to detect total pages
  const firstHtml = await fetchPage(1)
  if (!firstHtml) {
    console.error('Failed to fetch first page')
    process.exit(1)
  }

  const totalPages = getLastPage(firstHtml)
  console.log(`Total pages detected: ${totalPages}`)

  // Parse first page
  let allEnterprises = parseEnterprises(firstHtml)
  console.log(`Page 1: ${allEnterprises.length} enterprises`)

  // Parse remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const html = await fetchPage(page)
    if (!html) {
      console.log(`Page ${page}: fetch failed, stopping`)
      break
    }
    const items = parseEnterprises(html)
    allEnterprises = allEnterprises.concat(items)
    console.log(`Page ${page}: ${items.length} enterprises (total: ${allEnterprises.length})`)
    await new Promise(r => setTimeout(r, 400))
  }

  console.log(`\n=== Total enterprises scraped: ${allEnterprises.length} ===`)

  // Deduplicate by name
  const unique = new Map()
  for (const e of allEnterprises) {
    const key = e.name.toLowerCase().trim()
    if (!unique.has(key)) unique.set(key, e)
  }
  const deduped = [...unique.values()]
  console.log(`Unique enterprises: ${deduped.length}`)

  // Save full data
  const outPath = path.join(__dirname, '..', 'data', 'ahik-registry-enterprises.json')
  fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2))
  console.log(`\nSaved to ${outPath}`)

  // Save names list
  const namesPath = path.join(__dirname, '..', 'data', 'ahik-enterprise-names.txt')
  fs.writeFileSync(namesPath, deduped.map(e => e.name).sort().join('\n'))
  console.log(`Saved names list to ${namesPath}`)

  // Summary by category
  const cats = {}
  for (const e of deduped) {
    const cat = e.category || 'unknown'
    cats[cat] = (cats[cat] || 0) + 1
  }
  console.log('\n--- Top categories ---')
  Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([cat, count]) => console.log(`  ${count.toString().padStart(3)}  ${cat}`))

  // Sample names
  console.log('\n--- Sample enterprise names ---')
  deduped.map(e => e.name).sort().slice(0, 30).forEach(n => console.log(`  ${n}`))
  if (deduped.length > 30) console.log(`  ... and ${deduped.length - 30} more`)

  const certActive = deduped.filter(e => e.status === 'ok')
  const certExpired = deduped.filter(e => e.status === 'end')
  const certStopped = deduped.filter(e => e.status === 'stop')
  console.log(`\nActive certificates: ${certActive.length}`)
  console.log(`Expired certificates: ${certExpired.length}`)
  console.log(`Stopped certificates: ${certStopped.length}`)
}

main().catch(console.error)

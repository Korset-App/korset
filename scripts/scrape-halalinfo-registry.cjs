const https = require('https')

function fetchCompanies(page = 1) {
  return new Promise((resolve) => {
    const data = 'action=load_companies&page=' + page
    const req = https.request({
      hostname: 'halalinfo.kz',
      path: '/wp-admin/admin-ajax.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 10000,
    }, (res) => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch (e) { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.write(data)
    req.end()
  })
}

function parseCompanies(html) {
  const items = []
  // Each item is wrapped in <div class="reestr__right_item"...>...</div>
  // Inside is <a href="..."><b>Name</b><p>Category</p><span...>...</span></a>
  const itemRegex = /<div class="reestr__right_item"[^>]*data-status="([^"]*)">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/g
  let m
  while ((m = itemRegex.exec(html)) !== null) {
    const status = m[1]
    const link = m[2].replace(/\\\//g, '/')
    const innerHtml = m[3]

    const nameMatch = innerHtml.match(/<b>([^<]+)<\/b>/)
    const name = nameMatch ? nameMatch[1].replace(/&[^;]+;/g, ' ').trim() : ''

    const catMatch = innerHtml.match(/<p>([^<]+)<\/p>/)
    const category = catMatch ? catMatch[1].trim() : ''

    const logoMatch = innerHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/)
    const logo = logoMatch ? logoMatch[1].replace(/\\\//g, '/') : ''

    // Determine cert status from class
    let certStatus = 'unknown'
    if (/reestr-active/.test(innerHtml)) certStatus = 'certified'
    else if (/reestr-expired/.test(innerHtml)) certStatus = 'expired'
    else if (/reestr-stopped/.test(innerHtml)) certStatus = 'stopped'

    // Extract cert status text after <img> in the span
    const spanMatch = innerHtml.match(/<span[^>]*>[\s\S]*?<img[^>]*>([\s\S]*?)<\/span>/)
    const certText = spanMatch ? spanMatch[1].trim() : ''

    if (name) {
      items.push({ name, category, status, certStatus, certText, link, logo })
    }
  }
  return items
}

async function main() {
  console.log('=== Scraping HalalInfo.KZ Registry ===\n')

  let allCompanies = []
  let page = 1

  while (true) {
    const result = await fetchCompanies(page)
    if (!result || !result.success || !result.data.html) {
      console.log(`Page ${page}: no data, stopping`)
      break
    }

    const companies = parseCompanies(result.data.html)
    if (companies.length === 0) {
      console.log(`Page ${page}: no companies found, stopping`)
      break
    }

    allCompanies = allCompanies.concat(companies)
    console.log(`Page ${page}: ${companies.length} companies (total: ${allCompanies.length})`)
    page++

    // Safety limit
    if (page > 100) break
  }

  console.log(`\n=== TOTAL: ${allCompanies.length} companies ===`)

  // Summary by category
  const cats = {}
  for (const c of allCompanies) {
    if (!cats[c.category]) cats[c.category] = 0
    cats[c.category]++
  }
  console.log('\n--- By category ---')
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1])
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat}: ${count}`)
  }

  // Summary by status
  const statuses = {}
  for (const c of allCompanies) {
    if (!statuses[c.certStatus]) statuses[c.certStatus] = 0
    statuses[c.certStatus]++
  }
  console.log('\n--- By cert status ---')
  for (const [s, count] of Object.entries(statuses)) {
    console.log(`  ${s}: ${count}`)
  }

  // Save to file
  const fs = require('fs')
  const path = require('path')
  const outPath = path.join(__dirname, '..', 'data', 'halalinfo-registry.json')
  fs.writeFileSync(outPath, JSON.stringify(allCompanies, null, 2))
  console.log(`\nSaved to ${outPath}`)

  // Also save just the names for easy comparison
  const namesPath = path.join(__dirname, '..', 'data', 'halalinfo-company-names.txt')
  const uniqueNames = [...new Set(allCompanies.map(c => c.name))].sort()
  fs.writeFileSync(namesPath, uniqueNames.join('\n'))
  console.log(`Saved ${uniqueNames.length} unique names to ${namesPath}`)
  console.log('\n--- All unique company names ---')
  uniqueNames.forEach(n => console.log(`  ${n}`))
}

main().catch(console.error)

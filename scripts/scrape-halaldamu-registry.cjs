const https = require('https')
const fs = require('fs')
const path = require('path')

function fetchCompanies(page = 1, status = 'certified') {
  return new Promise((resolve) => {
    const params = new URLSearchParams()
    params.append('action', 'load_companies')
    params.append('page', String(page))
    params.append('status[]', status)
    const data = params.toString()
    const req = https.request({
      hostname: 'halaldamu.kz',
      path: '/wp-admin/admin-ajax.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
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
  const itemRegex = /<div class="reestr__right_item"[^>]*data-status="([^"]*)">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/g
  let m
  while ((m = itemRegex.exec(html)) !== null) {
    const dataStatus = m[1]
    const link = m[2].replace(/\\\//g, '/')
    const innerHtml = m[3]

    const nameMatch = innerHtml.match(/<b>([^<]+)<\/b>/)
    const name = nameMatch ? nameMatch[1].replace(/&[^;]+;/g, ' ').trim() : ''

    const catMatch = innerHtml.match(/<p>([^<]+)<\/p>/)
    const category = catMatch ? catMatch[1].trim() : ''

    const logoMatch = innerHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/)
    const logo = logoMatch ? logoMatch[1].replace(/\\\//g, '/') : ''

    let certStatus = 'unknown'
    if (/reestr-active/.test(innerHtml)) certStatus = 'certified'
    else if (/reestr-expired/.test(innerHtml)) certStatus = 'expired'
    else if (/reestr-stopped/.test(innerHtml)) certStatus = 'stopped'

    const spanMatch = innerHtml.match(/<span[^>]*>[\s\S]*?<img[^>]*>([\s\S]*?)<\/span>/)
    const certText = spanMatch ? spanMatch[1].trim() : ''

    if (name) {
      items.push({ name, category, dataStatus, certStatus, certText, link, logo })
    }
  }
  return items
}

async function scrapeAll(status = 'certified') {
  let allCompanies = []
  let page = 1

  while (true) {
    const result = await fetchCompanies(page, status)
    if (!result || !result.success) {
      console.log(`Page ${page}: API error`)
      break
    }

    const companies = parseCompanies(result.data.html)
    if (companies.length === 0) {
      console.log(`Page ${page}: no companies found`)
      break
    }

    allCompanies = allCompanies.concat(companies)
    console.log(`Page ${page}: ${companies.length} companies (total: ${allCompanies.length}, has_more: ${result.data.has_more}, total: ${result.data.total})`)

    if (!result.data.has_more) break
    page++
    if (page > 200) break

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200))
  }

  return allCompanies
}

async function main() {
  console.log('=== Scraping HalalDamu.KZ Registry ===\n')

  // Scrape certified companies (most important)
  console.log('--- Certified ---')
  const certified = await scrapeAll('certified')

  // Save certified data immediately
  const outPathCert = path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json')
  fs.writeFileSync(outPathCert, JSON.stringify(certified, null, 2))
  console.log(`\nSaved ${certified.length} certified companies to ${outPathCert}`)

  const certNames = [...new Set(certified.map(c => c.name))]
  const namesPathCert = path.join(__dirname, '..', 'data', 'halaldamu-certified-names.txt')
  fs.writeFileSync(namesPathCert, certNames.sort().join('\n'))
  console.log(`Saved ${certNames.length} unique certified names to ${namesPathCert}`)

  // Summary by category
  const cats = {}
  for (const c of certified) {
    if (!cats[c.category]) cats[c.category] = 0
    cats[c.category]++
  }
  console.log('\n--- Certified by category ---')
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1])
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat}: ${count}`)
  }

  // Sample names
  console.log('\n--- Sample certified company names ---')
  certNames.sort().slice(0, 30).forEach(n => console.log(`  ${n}`))
  if (certNames.length > 30) console.log(`  ... and ${certNames.length - 30} more`)
}

main().catch(console.error)

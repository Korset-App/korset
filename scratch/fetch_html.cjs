const https = require('https')

function httpGetHtml(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      },
      timeout: 15000
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

async function main() {
  const baseUrls = [
    'https://arbuz.kz/ru/almaty/catalog/cat/225304-orehi_i_suhofrukty',
    'https://arbuz.kz/ru/almaty/catalog/cat/19786-orehi',
    'https://arbuz.kz/ru/almaty/catalog/cat/19798-suhofrukty',
    'https://arbuz.kz/ru/almaty/catalog/cat/218350-fruktovye_chipsy',
    'https://arbuz.kz/ru/almaty/catalog/cat/225603-pastila',
    'https://arbuz.kz/ru/almaty/catalog/cat/225757-finiki_na_iftar'
  ]

  const unique = new Map()

  for (const baseUrl of baseUrls) {
    console.log(`\nScanning: ${baseUrl}`)
    for (let page = 1; page <= 6; page++) {
      const url = `${baseUrl}?page=${page}`
      try {
        const res = await httpGetHtml(url)
        if (res.status === 200) {
          const html = res.body
          const itemRe = /\/catalog\/item\/(\d+)-([a-zа-я0-9_\-%]+)/gi
          let match
          let pageCount = 0
          while ((match = itemRe.exec(html)) !== null) {
            const id = parseInt(match[1], 10)
            const slug = match[2]
            if (!unique.has(id)) {
              unique.set(id, { id, slug, source: baseUrl })
              pageCount++
            }
          }
          console.log(`  Page ${page}: discovered ${pageCount} new items. Total unique so far: ${unique.size}`)
          if (pageCount === 0 && page > 1) break
        } else {
          console.log(`  Page ${page} returned status ${res.status}`)
        }
      } catch (e) {
        console.log(`  Page ${page} failed: ${e.message}`)
      }
    }
  }

  console.log(`\nTOTAL UNIQUE ITEMS DISCOVERED: ${unique.size}`)
  
  // Print some items
  const items = Array.from(unique.values())
  console.log('Sample items:')
  for (let i = 0; i < Math.min(15, items.length); i++) {
    console.log(`- ID: ${items[i].id}, Slug: ${items[i].slug}, Source: ${items[i].source}`)
  }
}

main().catch(console.error)

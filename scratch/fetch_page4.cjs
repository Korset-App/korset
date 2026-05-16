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
  const url = 'https://arbuz.kz/ru/almaty/catalog/cat/225304-orehi_i_suhofrukty?page=4'
  try {
    const res = await httpGetHtml(url)
    console.log(`Status: ${res.status}`)
    const html = res.body
    const itemRe = /\/catalog\/item\/(\d+)-([a-zA-Zа-яА-Я0-9_\-%]+)/gi
    let match
    let count = 0
    const items = []
    while ((match = itemRe.exec(html)) !== null) {
      count++
      items.push({ id: match[1], slug: match[2] })
    }
    console.log(`Matched item links count on page 4: ${count}`)
    console.log('Sample items:')
    for (let i = 0; i < Math.min(10, items.length); i++) {
      console.log(`- ${items[i].id}: ${items[i].slug}`)
    }
  } catch (e) {
    console.log(`Failed: ${e.message}`)
  }
}

main().catch(console.error)

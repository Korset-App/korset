/**
 * KORSET — Kaspi category downloader v2
 * Uses new listing API format (q=шоколад&categoryIds=XXX)
 * Uses listing unitPrice (no need for offers API)
 * Filters out non-grocery items (gifts, bouquets, custom boxes)
 * Fetches only mobile + specifications APIs per product
 *
 * Usage:
 *   node scripts/kaspi-download.cjs --category="Chocolate bars"
 *   node scripts/kaspi-download.cjs --category="Chocolate bars" --resume
 */

const fs = require('fs')
const path = require('path')
const { parseHTMLSpecs } = require(path.join(__dirname, 'parse-kaspi-html.cjs'))

const CITY_ID_DEFAULT = '750000000'
const PAGE_SIZE = 12
const DELAY_MS = 600
const DATA_DIR = path.join(__dirname, '..', 'data', 'kaspi')

const CATEGORY_MAP = {
  'Chocolate bars': { id: '03831', file: '01_chocolate-bars', query: 'шоколадная плитка' },
}

const GIFT_BRANDS = new Set([
  'Без бренда', 'Choco flowers', 'CLUBNIKA.KZ', 'Mon Marui', 'FloraLux',
  'ANDOR', 'RA Company', 'FruitWave', 'VAIT', 'IGNIS', 'Dolce',
  'Mishki.kz', 'ZakazBuketov', 'Roza Premium', 'Дарим радость',
  'Kinderbox', 'liliane.defiori', 'AAT', 'Red Box', 'Sofi sweets',
  'ИП Сладкие Букеты', 'Boom Buket-Taraz', 'Sylvie sweetss',
  'ИП Fresa', 'Vitamin Buket', 'Sladkie buketi', 'Lab_buket',
  'DR DILOR', 'Love shop', 'Razvernika Box', 'Siyliq',
  'Altyn.buket.astana', 'DR DILOR', 'taybuket_astana',
  'AlmaWine', 'Bon macarons', 'Mfood.kz', 'By Aidanella',
  '1DEA.me', 'Joy box', 'Podarki Sladosti', 'chocobar Almaty',
  'Chocobar Almaty', 'Choco berryalmaty', 'Finiki_Almaty',
  'strawberry_world_yka', 'Vkusbuket.schuchinsk', 'Floria.kz',
  'Мир Цветов', 'Элит букет', 'Клубника в шоколаде', 'В шоколаде',
  'Tomiris', 'Томирис', 'AAT', 'Snaq Fabriq', '101 Rose',
])

const GIFT_KEYWORDS = [
  'клубника в шоколаде', 'финики в шоколаде', 'дубайский шоколад',
  'киндер бокс', 'киндерторт', 'киндер бокс', 'подарочный набор',
  'букет', 'корзина', 'бокс', 'сердце', 'валентин', 'подарочн',
  'макаронс', 'макарон', 'клубник', 'см', 'штук', 'на палочке',
  'шоколадный набор', 'дубайский', 'торт киндер',
]

function isGroceryProduct(product) {
  const brand = (product.brand || '').toLowerCase()
  for (const gb of GIFT_BRANDS) {
    if (brand === gb.toLowerCase()) return false
  }

  const title = (product.title || '').toLowerCase()
  for (const kw of GIFT_KEYWORDS) {
    if (title.includes(kw.toLowerCase())) return false
  }

  if (title.match(/\d+\s*[хx×]\s*\d+/)) return false
  if (title.match(/\d+\s*см/)) return false

  return true
}

const KASPI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Referer': 'https://kaspi.kz/',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url, extraHeaders = {}) {
  const r = await fetch(url, {
    headers: { ...KASPI_HEADERS, ...extraHeaders },
    signal: AbortSignal.timeout(15000),
  })
  if (r.status === 429) {
    console.log('  Rate limited, waiting 5s...')
    await sleep(5000)
    return fetchJSON(url, extraHeaders)
  }
  if (!r.ok) return null
  return r.json()
}

async function getCategoryProducts(categoryCode, cityId, searchQuery) {
  const allProducts = []
  let page = 0

  while (true) {
    const qEncoded = encodeURIComponent(searchQuery || 'шоколад')
    const url = `https://kaspi.kz/yml/product-view/pl/results?q=${qEncoded}&c=${cityId}&page=${page}&categoryIds=${categoryCode}`
    const referer = { Referer: `https://kaspi.kz/shop/c/${encodeURIComponent(categoryCode)}/` }

    const data = await fetchJSON(url, referer)
    if (!data?.data) {
      console.log(`  Page ${page}: no data, stopping`)
      break
    }

    const products = data.data || []
    if (products.length === 0) break

    for (const p of products) {
      if (!isGroceryProduct(p)) continue

      const previewImg = p.previewImages?.[0]
      allProducts.push({
        kaspiCode: p.id || p.configSku,
        title: p.title,
        brand: p.brand || null,
        unitPrice: p.unitPrice || null,
        priceFormatted: p.priceFormatted || null,
        categoryId: p.categoryId || null,
        imageUrl: previewImg?.small || previewImg?.medium || null,
        rating: p.rating || null,
        reviewsQuantity: p.reviewsQuantity || null,
      })
    }

    console.log(`  Page ${page}: got ${products.length} raw, ${products.filter(isGroceryProduct).length} grocery (total grocery: ${allProducts.length})`)

    if (products.length < PAGE_SIZE) break
    page++
    await sleep(DELAY_MS)
  }

  return allProducts
}

async function getProductDetails(productCode) {
  const [mobile, specs] = await Promise.all([
    fetchJSON(`https://kaspi.kz/shop/rest/misc/product/mobile?productCode=${productCode}`),
    fetchJSON(`https://kaspi.kz/shop/rest/misc/product/mobile/specifications?productCode=${productCode}`),
  ])

  const card = mobile?.data?.card || {}
  const galleryImages = mobile?.data?.galleryImages || []
  const specificationGroups = specs?.data || []

  const images = galleryImages.slice(0, 2).map(img => ({
    small: img.small || null,
    medium: img.medium || null,
    large: img.large || null,
  }))

  const features = {}
  for (const group of specificationGroups) {
    if (!group.features) continue
    for (const f of group.features) {
      const val = f.featureValues?.[0]?.value || f.featureValues?.[0]?.numberValue || null
      if (f.name && val !== null) {
        features[f.name] = { value: val, code: f.code || null, unit: f.featureUnit || null }
      }
    }
  }

  let composition = features['Состав']?.value || null
  let needHTMLFallback = !composition

  if (needHTMLFallback) {
    try {
      const htmlHeaders = {
        ...KASPI_HEADERS,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
      const htmlUrl = `https://kaspi.kz/shop/p/-${productCode}/?c=750000000`
      const r = await fetch(htmlUrl, { headers: htmlHeaders, signal: AbortSignal.timeout(15000) })
      if (r.ok) {
        const html = await r.text()
        const htmlSpecs = parseHTMLSpecs(html)
        if (htmlSpecs['Состав']) {
          composition = htmlSpecs['Состав']
          needHTMLFallback = false
        }
        if (!features['Вес, г'] && htmlSpecs['Вес, г']) features['Вес, г'] = { value: htmlSpecs['Вес, г'] }
        if (!features['Условия хранения'] && htmlSpecs['Условия хранения']) features['Условия хранения'] = { value: htmlSpecs['Условия хранения'] }
        if (!features['Срок годности'] && htmlSpecs['Срок годности']) features['Срок годности'] = { value: htmlSpecs['Срок годности'] }
        if (!features['Страна производства'] && htmlSpecs['Страна производства']) features['Страна производства'] = { value: htmlSpecs['Страна производства'] }
        if (!features['Упаковка'] && htmlSpecs['Упаковка']) features['Упаковка'] = { value: htmlSpecs['Упаковка'] }
        if (!features['Энергетическая ценность в 100 г'] && htmlSpecs['Энергетическая ценность в 100 г']) features['Энергетическая ценность в 100 г'] = { value: htmlSpecs['Энергетическая ценность в 100 г'] }
        if (!features['Белки в 100 г'] && htmlSpecs['Белки в 100 г']) features['Белки в 100 г'] = { value: htmlSpecs['Белки в 100 г'] }
        if (!features['Жиры в 100 г'] && htmlSpecs['Жиры в 100 г']) features['Жиры в 100 г'] = { value: htmlSpecs['Жиры в 100 г'] }
        if (!features['Углеводы в 100 г'] && htmlSpecs['Углеводы в 100 г']) features['Углеводы в 100 г'] = { value: htmlSpecs['Углеводы в 100 г'] }
      }
    } catch {}
  }

  const weight = features['Вес, г']?.value || features['Вес']?.value || null
  const storageConditions = features['Условия хранения']?.value || null
  const shelfLife = features['Срок годности']?.value || null
  const packaging = features['Упаковка']?.value || null
  const country = features['Страна производства']?.value || features['Страна']?.value || null
  const chocolateType = features['Вид шоколада']?.value || null
  const filling = features['Начинка']?.value || null
  const productType = features['Тип']?.value || null

  const nutrition = {}
  const kcal = features['Энергетическая ценность в 100 г']
  if (kcal) nutrition.kcal = Number(String(kcal.value ?? kcal).replace(/[^\d.]/g, '')) || null
  const proteins = features['Белки в 100 г']
  if (proteins) nutrition.protein = Number(String(proteins.value ?? proteins).replace(/[^\d.]/g, '')) || null
  const fats = features['Жиры в 100 г']
  if (fats) nutrition.fat = Number(String(fats.value ?? fats).replace(/[^\d.]/g, '')) || null
  const carbs = features['Углеводы в 100 г']
  if (carbs) nutrition.carbs = Number(String(carbs.value ?? carbs).replace(/[^\d.]/g, '')) || null

  return {
    kaspiCode: productCode,
    name: card.title || null,
    brand: card.promoConditions?.brand || null,
    categoryCodes: card.promoConditions?.categoryCodes || [],
    images,
    composition,
    nutritionPer100: Object.keys(nutrition).length > 0 ? nutrition : null,
    weight,
    storageConditions,
    shelfLife,
    packaging,
    countryOfOrigin: country,
    chocolateType,
    filling,
    productType,
    unit: card.unit || null,
    rating: card.rating || card.adjustedRating || null,
    reviewsCount: card.reviewsQuantity || null,
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { category: null, city: CITY_ID_DEFAULT, resume: false }
  for (const arg of args) {
    if (arg.startsWith('--category=')) result.category = arg.split('=')[1]
    else if (arg.startsWith('--city=')) result.city = arg.split('=')[1]
    else if (arg === '--resume') result.resume = true
  }
  return result
}

async function main() {
  const opts = parseArgs()
  if (!opts.category) {
    console.error('Usage: node kaspi-download.cjs --category="Chocolate bars"')
    process.exit(1)
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const catInfo = CATEGORY_MAP[opts.category] || { file: opts.category.replace(/[^a-z0-9]/gi, '-').toLowerCase(), id: null }
  const outFile = path.join(DATA_DIR, `${catInfo.file || opts.category}_raw.json`)

  let existing = []
  if (opts.resume && fs.existsSync(outFile)) {
    existing = JSON.parse(fs.readFileSync(outFile, 'utf8')).products || []
    console.log(`Resuming from ${existing.length} existing products`)
  }

  console.log(`\n=== Kaspi Download v2: ${opts.category} ===\n`)

  console.log('Step 1: Getting product list from category (filtered for grocery)...')
  const listing = await getCategoryProducts(catInfo.id || opts.category, opts.city, catInfo.query)
  console.log(`Found ${listing.length} grocery products in category\n`)

  const existingCodes = new Set(existing.map(p => p.kaspiCode))
  const toFetch = listing.filter(p => !existingCodes.has(p.kaspiCode))
  console.log(`Already downloaded: ${existing.length}, New to fetch: ${toFetch.length}\n`)

  console.log('Step 2: Fetching details for each product (mobile + specs only)...')
  const allProducts = [...existing]
  let fetched = 0, errors = 0

  for (const item of toFetch) {
    process.stdout.write(`  [${fetched + 1}/${toFetch.length}] ${item.kaspiCode} ${(item.title || '').substring(0, 40)}... `)

    try {
      const details = await getProductDetails(item.kaspiCode)
      details.priceKzt = item.unitPrice || null
      if (details.name) {
        if (!details.brand && item.brand && item.brand !== 'Без бренда') details.brand = item.brand
        allProducts.push(details)
        process.stdout.write(`OK (${details.brand || '-'}, ${details.priceKzt || '-'}₸, specs: ${details.composition ? 'yes' : 'no'})\n`)
      } else {
        process.stdout.write('NO DATA\n')
        allProducts.push({ kaspiCode: item.kaspiCode, name: item.title, brand: item.brand, priceKzt: item.unitPrice, error: 'no_data' })
        errors++
      }
    } catch (e) {
      process.stdout.write(`ERR: ${e.message.substring(0, 60)}\n`)
      allProducts.push({ kaspiCode: item.kaspiCode, name: item.title, brand: item.brand, priceKzt: item.unitPrice, error: e.message.substring(0, 80) })
      errors++
    }

    fetched++
    if (fetched % 20 === 0) {
      const progress = { category: opts.category, cityId: opts.city, scrapedAt: new Date().toISOString(), total: listing.length, products: allProducts }
      fs.writeFileSync(outFile, JSON.stringify(progress, null, 2))
      console.log(`  [Autosaved: ${allProducts.length} products]`)
    }

    await sleep(DELAY_MS)
  }

  const result = {
    category: opts.category,
    categoryId: catInfo.id || null,
    cityId: opts.city,
    scrapedAt: new Date().toISOString(),
    total: listing.length,
    downloaded: allProducts.length,
    errors,
    products: allProducts,
  }

  fs.writeFileSync(outFile, JSON.stringify(result, null, 2))
  console.log(`\n=== Done! ===`)
  console.log(`Total products: ${allProducts.length}`)
  console.log(`With composition: ${allProducts.filter(p => p.composition).length}`)
  console.log(`With nutrition: ${allProducts.filter(p => p.nutritionPer100).length}`)
  console.log(`With images: ${allProducts.filter(p => p.images?.length > 0).length}`)
  console.log(`With price: ${allProducts.filter(p => p.priceKzt).length}`)
  console.log(`Errors: ${errors}`)
  console.log(`Saved to: ${outFile}`)
}

main()

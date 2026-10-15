import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '..', 'scratch', 'globalfoods_harvested.jsonl')
const URLS_CACHE_FILE = path.join(__dirname, '..', 'scratch', 'globalfoods_goods_urls.json')

const TARGET_CATEGORIES = [
  { slug: 'spetsii_pripravy', maxPages: 12 },
  { slug: 'ovoshchi_i_frukty', maxPages: 26 },
  { slug: 'bulony_supy_pyure_sousy', maxPages: 26 },
  { slug: 'bakaleya', maxPages: 27 },
  { slug: 'molochnye_produkty', maxPages: 33 },
  { slug: 'napitki', maxPages: 11 },
  { slug: 'produkty_dlya_panaziatskoy_kukhni', maxPages: 20 },
  { slug: 'masla', maxPages: 4 }
]

function normalizePackaging(raw) {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (/стекл|бут.*стекл/i.test(s)) return 'bottle_glass'
  if (/пэт|пластик.*бут/i.test(s)) return 'bottle_plastic'
  if (/жест|ж\/б|железн/i.test(s)) return 'can'
  if (/тетра|tetra/i.test(s)) return 'tetrapak'
  if (/пакет|подуш|пауч|pouch|дой[- ]?пак|флоу[- ]?пак|саше/i.test(s)) return 'pouch'
  if (/ведр|стакан|ванночк|туб/i.test(s)) return 'tub'
  return null
}

function parseGoodsCard(html, url) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  const eanMatch = html.match(/Штрих-код:\s*([0-9]{8,14})/i)
  if (!eanMatch || !/^\d{8,14}$/.test(eanMatch[1])) return null

  const ean = eanMatch[1]
  const ingMatch = html.match(/<b class="goods__subtitle">Состав продукта:<\/b>\s*<p class="goods__text">([\s\S]*?)<\/p>/i)
  const ingredients = ingMatch ? ingMatch[1].replace(/<[^>]+>/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() : null

  const rows = [...html.matchAll(/<div class="charachteristics__row">[\s\S]*?<div class="charachteristics__title">([\s\S]*?)<\/div>[\s\S]*?<div class="charachteristics__value">([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi)]
    .map(m => ({
      title: m[1].replace(/<[^>]+>/g, '').trim(),
      value: m[2].replace(/<[^>]+>/g, '').trim()
    }))

  const chars = {}
  rows.forEach(r => chars[r.title] = r.value)

  const kcalRaw = chars['Энергетическая ценность, ккал'] || chars['Калорийность, ккал']
  const kcal = kcalRaw ? parseFloat(kcalRaw.replace(',', '.')) : null

  let nutriments_json = null
  if (kcal !== null && !isNaN(kcal) && kcal >= 0 && kcal <= 950) {
    nutriments_json = { energy_kcal_100g: kcal }
  }

  const manufacturer = chars['Производитель'] || null
  const country = chars['Страна происхождения'] || chars['Страна'] || null
  const shelf = chars['Срок годности'] || null
  const storage = chars['Условия хранения'] || null
  const brand = chars['Торговая марка'] || null
  const packaging = normalizePackaging(chars['Вид упаковки'])
  const cert = chars['Номер сертификата'] || null

  return {
    ean,
    name: title,
    brand,
    manufacturer,
    country_of_origin: country,
    ingredients_raw: ingredients,
    nutriments_json,
    shelf_life: shelf,
    storage_conditions: storage,
    packaging_type: packaging,
    certificate: cert,
    url,
    source: 'globalfoods.ru'
  }
}

async function harvestGlobalFoods() {
  console.log('='.repeat(70))
  console.log(' HARVEST: GlobalFoods FMCG & Grocery Distributor')
  console.log('='.repeat(70))

  // 1. Collect / Load Goods URLs
  let goodsUrls = []
  if (fs.existsSync(URLS_CACHE_FILE)) {
    try {
      goodsUrls = JSON.parse(fs.readFileSync(URLS_CACHE_FILE, 'utf-8'))
      console.log(`Loaded ${goodsUrls.length} cached goods URLs.`)
    } catch {}
  }

  if (goodsUrls.length === 0) {
    console.log('Crawling category pages for goods URLs...')
    const set = new Set()

    for (const cat of TARGET_CATEGORIES) {
      console.log(`\nScanning category: ${cat.slug} (${cat.maxPages} pages)`)
      for (let p = 1; p <= cat.maxPages; p++) {
        const pageUrl = `https://www.globalfoods.ru/catalog/${cat.slug}/?PAGEN_1=${p}`
        try {
          const res = await fetch(pageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(15000)
          })
          if (res.ok) {
            const html = await res.text()
            const matches = [...html.matchAll(/href="(\/goods\/\d+\/)"/g)].map(m => m[1])
            matches.forEach(m => set.add(`https://www.globalfoods.ru${m}`))
          }
        } catch (e) {
          console.error(`  Error page ${p}:`, e.message)
        }
        await new Promise(r => setTimeout(r, 300))
      }
      console.log(`  Category ${cat.slug} done! Unique URLs so far: ${set.size}`)
    }

    goodsUrls = Array.from(set).sort()
    fs.writeFileSync(URLS_CACHE_FILE, JSON.stringify(goodsUrls, null, 2))
    console.log(`Saved ${goodsUrls.length} goods URLs to ${URLS_CACHE_FILE}`)
  }

  // 2. Load existing harvested items to allow resuming
  const existingMap = new Map()
  if (fs.existsSync(OUTPUT_FILE)) {
    const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const item = JSON.parse(l)
        if (item.url) existingMap.set(item.url, item)
      } catch {}
    }
    console.log(`Resuming harvest: ${existingMap.size} products already processed.`)
  }

  const remaining = goodsUrls.filter(u => !existingMap.has(u))
  console.log(`Total URLs to process: ${remaining.length}`)

  const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a', encoding: 'utf-8' })
  const CONCURRENCY = 4
  let processed = 0
  let validEansCount = existingMap.size

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(12000)
        })
        if (res.ok) {
          const html = await res.text()
          const product = parseGoodsCard(html, url)
          if (product) {
            writeStream.write(JSON.stringify(product) + '\n')
            validEansCount++
          }
        }
      } catch {}
    }))

    processed += batch.length
    if (processed % 50 === 0 || processed === remaining.length) {
      console.log(`  Processed ${processed}/${remaining.length} (${(processed / remaining.length * 100).toFixed(1)}%) | Valid EAN items: ${validEansCount}`)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  writeStream.end()
  console.log(`\nHarvest complete! Total items with valid EAN: ${validEansCount}`)
}

harvestGlobalFoods().catch(err => {
  console.error('Harvest failed:', err)
  process.exit(1)
})

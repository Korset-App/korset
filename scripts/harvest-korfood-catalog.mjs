import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '..', 'scratch', 'korfood_harvested.jsonl')

function parseProductHtml(html, url) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim()
  if (!title || title.includes('Страница не найдена')) return null

  // Extract schema.org PropertyValues
  const propMatches = [...html.matchAll(/itemtype="http:\/\/schema\.org\/PropertyValue"[\s\S]*?<span[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*itemprop="value"[^>]*>([\s\S]*?)<\/div>/gi)]
    .map(m => ({
      name: m[1].replace(/<[^>]+>/g, '').trim(),
      val: m[2].replace(/<[^>]+>/g, '').replace(/&mdash;/g, '-').trim()
    }))

  const props = {}
  propMatches.forEach(p => props[p.name] = p.val)

  // Standard properties fallback
  const stdMatches = [...html.matchAll(/<div class="properties__title[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="properties__value[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
    .map(m => ({
      name: m[1].replace(/<[^>]+>/g, '').trim(),
      val: m[2].replace(/<[^>]+>/g, '').trim()
    }))
  stdMatches.forEach(p => { if (!props[p.name]) props[p.name] = p.val })

  const rawEan = props['Штрих-Код'] || props['Штрихкод'] || null
  const ean = rawEan?.replace(/[^0-9]/g, '')
  if (!ean || !/^\d{8,14}$/.test(ean)) return null

  const ingredients = props['Состав']?.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || null

  const kcal = parseFloat(props['Энергетическая ценность, Ккал']?.replace(',', '.')) || null
  const proteins = parseFloat(props['Белки']?.replace(',', '.')) || null
  const fats = parseFloat(props['Жиры']?.replace(',', '.')) || null
  const carbs = parseFloat(props['Углеводы']?.replace(',', '.')) || null

  let nutriments_json = null
  if (kcal !== null || proteins !== null || fats !== null || carbs !== null) {
    nutriments_json = {
      energy_kcal_100g: kcal,
      proteins_100g: proteins,
      fat_100g: fats,
      carbohydrates_100g: carbs
    }
  }

  const shelfMonths = parseFloat(props['Срок годности, мес']?.replace(',', '.')) || null
  const shelf = shelfMonths ? `${shelfMonths} месяцев` : null
  const storage = props['Условия хранения'] || null
  const country = props['Страна'] || null
  const weight = props['Масса Нетто, г'] ? parseFloat(props['Масса Нетто, г'].replace(',', '.')) : null

  // Determine packaging type
  let packaging_type = null
  const tLower = title.toLowerCase()
  if (tLower.includes('стакан') || tLower.includes('чашка')) packaging_type = 'tub'
  else if (tLower.includes('пачка') || tLower.includes('пакет')) packaging_type = 'pouch'
  else if (tLower.includes('бутыл')) packaging_type = 'bottle_plastic'
  else if (tLower.includes('банк')) packaging_type = 'can'

  return {
    ean,
    name: title,
    ingredients_raw: ingredients,
    nutriments_json,
    shelf_life: shelf,
    storage_conditions: storage,
    country_of_origin: country,
    net_weight_g: weight,
    packaging_type,
    url,
    source: 'korfood.ru'
  }
}

async function harvestKorfood() {
  console.log('='.repeat(70))
  console.log(' HARVEST: Korfood.ru Asian Grocery Catalog')
  console.log('='.repeat(70))

  // 1. Load existing harvested items to allow resuming
  const existingMap = new Map()
  if (fs.existsSync(OUTPUT_FILE)) {
    const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const item = JSON.parse(l)
        if (item.url) existingMap.set(item.url, item)
      } catch {}
    }
    console.log(`Resuming harvest: ${existingMap.size} products already cached.`)
  }

  // 2. Fetch sitemap
  console.log('Fetching sitemap iblock 26...')
  const smRes = await fetch('https://korfood.ru/sitemap-iblock-26.xml', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const smText = await smRes.text()
  const allUrls = [...smText.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1])

  const productUrls = allUrls.filter(u => {
    const parts = u.replace('https://korfood.ru/', '').split('/').filter(Boolean)
    return parts.length >= 3
  })
  console.log(`Total candidate product URLs: ${productUrls.length}`)

  const urlsToFetch = productUrls.filter(u => !existingMap.has(u))
  console.log(`URLs remaining to fetch: ${urlsToFetch.length}`)

  const CONCURRENCY = 6
  let processed = 0
  let harvestedCount = existingMap.size

  const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a', encoding: 'utf-8' })

  for (let i = 0; i < urlsToFetch.length; i += CONCURRENCY) {
    const batch = urlsToFetch.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(6000)
        })
        if (res.ok) {
          const html = await res.text()
          const product = parseProductHtml(html, url)
          if (product) {
            writeStream.write(JSON.stringify(product) + '\n')
            harvestedCount++
          }
        }
      } catch (e) {}
    }))

    processed += batch.length
    if (processed % 50 === 0 || processed === urlsToFetch.length) {
      console.log(`  Processed ${processed}/${urlsToFetch.length} (${(processed / urlsToFetch.length * 100).toFixed(1)}%) | Valid harvested items: ${harvestedCount}`)
    }
    // Polite delay
    await new Promise(r => setTimeout(r, 200))
  }

  writeStream.end()
  console.log(`\nHarvest complete! Total saved items: ${harvestedCount}`)
}

harvestKorfood().catch(err => {
  console.error('Korfood harvest error:', err)
  process.exit(1)
})

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseBaristaProduct(html, url) {
  const result = {
    url,
    ean: null,
    name: null,
    brand: null,
    ingredients_raw: null,
    nutriments_json: {},
    quantity: null,
    packaging_type: null,
    storage_conditions: null,
    shelf_life: null,
    manufacturer: null,
    country_of_origin: null,
    image_url: null,
    images: []
  }

  // 1. EAN-13 / EAN-8
  const eanMatch = html.match(/Штрих-код товара:<\/span>\s*<span class="unified-char-value">(\d{8,14})<\/span>/i) ||
                   html.match(/Штрих[\s\-]*код(?:\s*товара)?:\s*<\/?[a-z0-9_-]+[^>]*>\s*(\d{8,14})/i) ||
                   html.match(/Штрих[\s\-]*код(?:\s*товара)?:\s*(\d{8,14})/i)
  if (eanMatch) {
    result.ean = eanMatch[1].trim()
  }

  // 2. Name
  const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<meta property="og:title" content="([^"]+)"/i)
  if (nameMatch) {
    result.name = nameMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // 3. Images (full size packshots)
  const fullImgMatches = [...html.matchAll(/href="([^"]*jshopping\/files\/img_products\/full_[^"]+)"/gi)]
  const uniqueImages = new Set()
  for (const m of fullImgMatches) {
    uniqueImages.add(m[1].startsWith('http') ? m[1] : 'https://www.barista-ltd.ru' + m[1])
  }
  if (uniqueImages.size === 0) {
    const mainImg = html.match(/<meta property="og:image" content="([^"]+)"/i)
    if (mainImg) uniqueImages.add(mainImg[1])
  }
  result.images = [...uniqueImages]
  result.image_url = result.images[0] || null

  // 4. Specs extraction
  const decoded = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')

  // Ingredients
  const ingMatch = decoded.match(/Состав:\s*([\s\S]*?)(?=(?:Вафельный|Вес нетто|Пищевая ценность|Энергетическая ценность|Упаковка|Кол-во|Условия хранения|Срок годности|Производитель|Штрих|Характеристики|Описание|<\/td|<\/div|<\/p))/i)
  if (ingMatch) {
    const ingText = ingMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (ingText.length > 5 && !ingText.toLowerCase().startsWith('нет')) {
      result.ingredients_raw = ingText
    }
  }

  // KBJU
  const proteins = decoded.match(/белки\s*[-—:]\s*([0-9.,]+)\s*г/i)
  const fat = decoded.match(/жиры\s*[-—:]\s*([0-9.,]+)\s*г/i)
  const carbs = decoded.match(/углеводы\s*[-—:]\s*([0-9.,]+)\s*г/i)
  const kcal = decoded.match(/([0-9.,]+)\s*ккал/i) || decoded.match(/Энергетическая ценность[^:]*:\s*([0-9.,]+)/i)
  const salt = decoded.match(/соль\s*[-—:]\s*([0-9.,]+)\s*г/i)
  const sodium = decoded.match(/натрий\s*[-—:]\s*([0-9.,]+)\s*г/i)
  const fiber = decoded.match(/пищевые волокна\s*[-—:]\s*([0-9.,]+)\s*г/i)

  if (proteins || fat || carbs || kcal || salt || sodium || fiber) {
    if (kcal) result.nutriments_json.calories = parseFloat(kcal[1].replace(',', '.'))
    if (proteins) result.nutriments_json.proteins = parseFloat(proteins[1].replace(',', '.'))
    if (fat) result.nutriments_json.fat = parseFloat(fat[1].replace(',', '.'))
    if (carbs) result.nutriments_json.carbohydrates = parseFloat(carbs[1].replace(',', '.'))
    if (salt) result.nutriments_json.salt = parseFloat(salt[1].replace(',', '.'))
    if (sodium) result.nutriments_json.sodium = parseFloat(sodium[1].replace(',', '.'))
    if (fiber) result.nutriments_json.fiber = parseFloat(fiber[1].replace(',', '.'))
  }

  // Net weight / Quantity
  const weightMatch = decoded.match(/Вес нетто:\s*([0-9.,]+\s*(?:грамма?|г|кг|мл|л))/i) ||
                      decoded.match(/Вес:\s*([0-9.,]+\s*(?:грамма?|г|кг|мл|л))/i) ||
                      decoded.match(/Объем:\s*([0-9.,]+\s*(?:мл|л))/i)
  if (weightMatch) {
    result.quantity = weightMatch[1].trim()
  }

  // Packaging
  const packMatch = decoded.match(/(?:Вид упаковки|Упаковка):\s*([^<\n\r]+?)(?=(?:Кол-во|Условия|Срок|Производитель|Штрих|<\/td|<\/tr|<\/div|<\/p))/i)
  if (packMatch) {
    result.packaging_type = packMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // Storage conditions
  const storageMatch = decoded.match(/Условия хранения:\s*([^<\n\r]+?)(?=(?:Срок годности|Производитель|Штрих|<\/td|<\/tr|<\/div|<\/p))/i)
  if (storageMatch) {
    result.storage_conditions = storageMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // Shelf life
  const shelfMatch = decoded.match(/Срок годности:\s*([^<\n\r]+?)(?=(?:Условия|Производитель|Штрих|<\/td|<\/tr|<\/div|<\/p))/i)
  if (shelfMatch) {
    result.shelf_life = shelfMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // Manufacturer / Brand / Country
  const manMatch = decoded.match(/Производитель:\s*([^<\n\r]+?)(?=(?:Штрих|Срок|Условия|<\/td|<\/tr|<\/div|<\/p))/i)
  if (manMatch) {
    const rawMan = manMatch[1].replace(/<[^>]+>/g, '').trim()
    result.manufacturer = rawMan
    result.brand = rawMan.split(/[–—,-]/)[0].replace(/ООО|ОАО|ЗАО|ИП|LLC/gi, '').trim()

    // Detect country if present in manufacturer text
    if (/россия|рф/i.test(rawMan)) result.country_of_origin = 'Россия'
    else if (/италия/i.test(rawMan)) result.country_of_origin = 'Италия'
    else if (/германия/i.test(rawMan)) result.country_of_origin = 'Германия'
    else if (/франция/i.test(rawMan)) result.country_of_origin = 'Франция'
    else if (/казахстан/i.test(rawMan)) result.country_of_origin = 'Казахстан'
    else if (/швейцария/i.test(rawMan)) result.country_of_origin = 'Швейцария'
  }

  return result
}

async function runHarvest() {
  const targetsFile = path.join(__dirname, '..', 'scratch', 'barista_refined_targets.json')
  const outFile = path.join(__dirname, '..', 'scratch', 'barista_harvested.jsonl')

  if (!fs.existsSync(targetsFile)) {
    console.error('Target URLs file missing. Run filter-targets.mjs first.')
    process.exit(1)
  }

  const allUrls = JSON.parse(fs.readFileSync(targetsFile, 'utf-8'))
  console.log(`Loaded ${allUrls.length} refined target URLs.`)

  // Check existing harvested items for resumption
  const seenUrls = new Set()
  if (fs.existsSync(outFile)) {
    const lines = fs.readFileSync(outFile, 'utf-8').split('\n').filter(Boolean)
    for (const l of lines) {
      try {
        const item = JSON.parse(l)
        if (item.url) seenUrls.add(item.url)
      } catch (e) {}
    }
  }
  console.log(`Already harvested: ${seenUrls.size} items. Resuming remaining...`)

  // Optional limit flag: --limit=1000
  const limitArg = process.argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : allUrls.length

  const toProcess = allUrls.filter(u => !seenUrls.has(u)).slice(0, limit)
  console.log(`To process in this session: ${toProcess.length} URLs.`)

  if (toProcess.length === 0) {
    console.log('All targets already harvested!')
    return
  }

  const outStream = fs.createWriteStream(outFile, { flags: 'a', encoding: 'utf-8' })

  let processedCount = 0
  let eanFoundCount = 0
  let ingFoundCount = 0
  let kbjuFoundCount = 0
  let idx = 0
  const CONCURRENCY = 12

  const startTime = Date.now()

  async function worker() {
    while (idx < toProcess.length) {
      const u = toProcess[idx++]
      try {
        const res = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        if (!res.ok) continue
        const html = await res.text()
        const parsed = parseBaristaProduct(html, u)

        if (parsed.ean) {
          eanFoundCount++
          if (parsed.ingredients_raw) ingFoundCount++
          if (Object.keys(parsed.nutriments_json).length > 0) kbjuFoundCount++
          outStream.write(JSON.stringify(parsed) + '\n')
        }
      } catch (e) {
        // network retry or ignore
      }

      processedCount++
      if (processedCount % 100 === 0 || processedCount === toProcess.length) {
        const rate = (processedCount / ((Date.now() - startTime) / 1000)).toFixed(1)
        process.stdout.write(
          `\rProgress: ${processedCount}/${toProcess.length} (${rate} req/s) | EANs: ${eanFoundCount} | Ings: ${ingFoundCount} | KBJU: ${kbjuFoundCount}`
        )
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker())
  await Promise.all(workers)
  outStream.end()

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n\nHarvest complete in ${totalSec}s:`)
  console.log(`  Processed URLs:     ${processedCount}`)
  console.log(`  Valid EAN products: ${eanFoundCount}`)
  console.log(`  With ingredients:   ${ingFoundCount}`)
  console.log(`  With KBJU:          ${kbjuFoundCount}`)
  console.log(`  Data saved to:      ${outFile}`)
}

runHarvest().catch(console.error)

/**
 * KORSET — Kaspi Load to DB
 * Loads enriched Kaspi data into Supabase global_products + store_products
 *
 * - Products WITH real EAN → upsert global_products with Kaspi data
 * - Products WITHOUT real EAN → insert with kaspi_XXXXXX as temp EAN, needs_ean=true
 * - Images: use Kaspi CDN URLs (R2 upload later)
 * - Prices: set to null if not available (update later)
 *
 * Usage:
 *   node scripts/kaspi-load-to-db.cjs --category="Chocolate bars"
 *   node scripts/kaspi-load-to-db.cjs --category="Chocolate bars" --dry-run
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const DATA_DIR = path.join(__dirname, '..', 'data', 'kaspi')
const DARA_STORE_ID = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'
const CONCURRENT = 3
const DELAY_MS = 100

function sanitizeText(text, maxLen = 2000) {
  if (!text) return null
  return String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, maxLen) || null
}

function buildGlobalProduct(kaspiProduct) {
  const hasRealEan = !!(kaspiProduct.ean && !kaspiProduct.ean.startsWith('kaspi_'))
  const ean = hasRealEan
    ? kaspiProduct.ean
    : `kaspi_${kaspiProduct.kaspiCode}`

  const nutritionPer100 = kaspiProduct.nutritionPer100 || {}
  const nutrimentsJson = Object.keys(nutritionPer100).length > 0 ? nutritionPer100 : null

  const specsJson = {}
  if (kaspiProduct.chocolateType) specsJson.chocolateType = kaspiProduct.chocolateType
  if (kaspiProduct.filling) specsJson.filling = kaspiProduct.filling
  if (kaspiProduct.productType) specsJson.productType = kaspiProduct.productType
  if (kaspiProduct.storageConditions) specsJson.storageConditions = kaspiProduct.storageConditions
  if (kaspiProduct.shelfLife) specsJson.shelfLife = kaspiProduct.shelfLife
  if (kaspiProduct.packaging) specsJson.packaging = kaspiProduct.packaging

  const imageUrl = kaspiProduct.images?.[0]?.large || kaspiProduct.images?.[0]?.medium || null
  const imagesJson = kaspiProduct.images?.length > 0
    ? kaspiProduct.images.map(img => img.large || img.medium || img.small).filter(Boolean)
    : null

  return {
    ean,
    name: sanitizeText(kaspiProduct.name, 500),
    name_kz: null,
    brand: sanitizeText(kaspiProduct.brand, 200),
    category: 'grocery',
    subcategory: 'chocolate',
    quantity: kaspiProduct.weight ? `${kaspiProduct.weight} г` : null,
    image_url: imageUrl,
    images: imagesJson,
    ingredients_raw: sanitizeText(kaspiProduct.composition, 2000),
    nutriments_json: nutrimentsJson,
    allergens_json: null,
    diet_tags_json: null,
    halal_status: 'unknown',
    nutriscore: null,
    data_quality_score: calculateQualityScore(kaspiProduct),
    source_primary: 'kaspi',
    source_confidence: hasRealEan ? 80 : 40,
    needs_review: !hasRealEan,
    is_verified: hasRealEan,
    manufacturer: null,
    country_of_origin: sanitizeText(kaspiProduct.countryOfOrigin, 100),
    specs_json: Object.keys(specsJson).length > 0 ? specsJson : null,
    is_active: true,
    description: sanitizeText(kaspiProduct.descriptionHtml, 2000),
    alcohol_100g: null,
    saturated_fat_100g: null,
    nova_group: null,
    tags_json: {
      kaspi_code: kaspiProduct.kaspiCode,
      kaspi_rating: kaspiProduct.rating || null,
      kaspi_reviews: kaspiProduct.reviewsCount || null,
      ean_match_score: kaspiProduct.eanMatchScore || null,
      ean_match_source: kaspiProduct.eanMatchSource || null,
    },
  }
}

function calculateQualityScore(product) {
  let score = 0
  if (product.name) score += 15
  if (product.brand) score += 15
  if (product.composition) score += 20
  if (product.nutritionPer100) score += 15
  if (product.images?.length > 0) score += 15
  if (product.weight) score += 5
  if (product.countryOfOrigin) score += 5
  if (product.shelfLife) score += 5
  if (product.ean && !product.needsEan) score += 5
  return Math.min(100, score)
}

function buildStoreProduct(globalProductId, kaspiProduct) {
  const shelf = guessShelf(kaspiProduct)
  return {
    store_id: DARA_STORE_ID,
    global_product_id: globalProductId,
    ean: (kaspiProduct.ean && !kaspiProduct.needsEan)
      ? kaspiProduct.ean
      : `kaspi_${kaspiProduct.kaspiCode}`,
    local_name: kaspiProduct.name || null,
    price_kzt: kaspiProduct.priceKzt || null,
    stock_status: 'in_stock',
    shelf_zone: shelf,
    is_active: true,
  }
}

function guessShelf(product) {
  const name = (product.name || '').toLowerCase()
  if (name.includes('батончик') || name.includes('bar')) return 'chocolate_bars'
  if (name.includes('плитка') || name.includes('tablet')) return 'chocolate_tablets'
  if (name.includes('порцион') || name.includes('portion')) return 'chocolate_portion'
  if (name.includes('фигур') || name.includes('figure')) return 'chocolate_figures'
  if (name.includes('яйцо') || name.includes('egg')) return 'chocolate_eggs'
  return 'chocolate'
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { category: null, dryRun: false }
  for (const arg of args) {
    if (arg.startsWith('--category=')) result.category = arg.split('=')[1]
    else if (arg === '--dry-run') result.dryRun = true
  }
  return result
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const opts = parseArgs()
  if (!opts.category) {
    console.error('Usage: node kaspi-load-to-db.cjs --category="Chocolate bars"')
    process.exit(1)
  }

  const catMap = { 'Chocolate bars': '01_chocolate-bars' }
  const catFile = catMap[opts.category] || opts.category.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const enrichedFile = path.join(DATA_DIR, `${catFile}_enriched.json`)

  if (!fs.existsSync(enrichedFile)) {
    console.error(`Enriched file not found: ${enrichedFile}`)
    console.error('Run kaspi-enrich-eans.cjs first')
    process.exit(1)
  }

  const enrichedData = JSON.parse(fs.readFileSync(enrichedFile, 'utf8'))
  const products = enrichedData.products || []

  console.log(`\n=== Kaspi Load to DB: ${opts.category} ===`)
  console.log(`Total products: ${products.length}`)
  console.log(`With real EAN: ${products.filter(p => p.ean && !p.needsEan).length}`)
  console.log(`With temp EAN: ${products.filter(p => p.needsEan).length}`)

  if (opts.dryRun) {
    console.log('\n[DRY RUN] Preview of first 3 products:')
    products.slice(0, 3).forEach(p => {
      const gp = buildGlobalProduct(p)
      console.log(`  EAN: ${gp.ean} | ${gp.name} | brand: ${gp.brand} | quality: ${gp.data_quality_score}`)
    })
    return
  }

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('\nStep 1: Loading to global_products...')
  let inserted = 0, updated = 0, errors = 0
  const productMap = new Map()

  const validProducts = products.filter(p => p.name && !p.error)

  for (let i = 0; i < validProducts.length; i += CONCURRENT) {
    const batch = validProducts.slice(i, i + CONCURRENT)

    const results = await Promise.allSettled(batch.map(async (kaspiProduct) => {
      const gp = buildGlobalProduct(kaspiProduct)
      const hasRealEan = gp.ean && !gp.ean.startsWith('kaspi_')

      if (hasRealEan) {
        const { data: existing } = await sb
          .from('global_products')
          .select('id, ean')
          .eq('ean', gp.ean)
          .maybeSingle()

        if (existing) {
          const updateData = {}
          if (!existing.name && gp.name) updateData.name = gp.name
          if (!existing.brand && gp.brand) updateData.brand = gp.brand
          if (!existing.ingredients_raw && gp.ingredients_raw) updateData.ingredients_raw = gp.ingredients_raw
          if (!existing.nutriments_json && gp.nutriments_json) updateData.nutriments_json = gp.nutriments_json
          if (!existing.image_url && gp.image_url) updateData.image_url = gp.image_url
          if (!existing.images && gp.images) updateData.images = gp.images
          if (!existing.specs_json && gp.specs_json) updateData.specs_json = gp.specs_json
          if (!existing.country_of_origin && gp.country_of_origin) updateData.country_of_origin = gp.country_of_origin
          if (!existing.description && gp.description) updateData.description = gp.description
          if (gp.tags_json) updateData.tags_json = gp.tags_json
          updateData.data_quality_score = Math.max(
            existing.data_quality_score || 0,
            gp.data_quality_score || 0
          )
          updateData.updated_at = new Date().toISOString()

          if (Object.keys(updateData).length > 1) {
            const { error } = await sb
              .from('global_products')
              .update(updateData)
              .eq('id', existing.id)
            if (error) throw new Error(`Update ${gp.ean}: ${error.message}`)
          }

          return { type: 'updated', ean: gp.ean, id: existing.id, name: gp.name }
        }
      }

      const { data, error } = await sb
        .from('global_products')
        .insert(gp)
        .select('id, ean')
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: existing2 } = await sb
            .from('global_products')
            .select('id, ean')
            .eq('ean', gp.ean)
            .maybeSingle()
          if (existing2) return { type: 'duplicate', ean: gp.ean, id: existing2.id, name: gp.name }
        }
        throw new Error(`Insert ${gp.ean}: ${error.message}`)
      }

      return { type: 'inserted', ean: gp.ean, id: data.id, name: gp.name }
    }))

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const res = r.value
        productMap.set(res.ean, res.id)
        if (res.type === 'inserted') { inserted++; process.stdout.write('+') }
        else if (res.type === 'updated') { updated++; process.stdout.write('u') }
        else if (res.type === 'duplicate') { process.stdout.write('d') }
      } else {
        errors++
        process.stdout.write('E')
        console.error(`\n  Error: ${r.reason?.message?.substring(0, 80)}`)
      }
    }

    if ((i + CONCURRENT) % 60 === 0) {
      console.log(`\n  [${i + CONCURRENT}/${validProducts.length}] inserted: ${inserted}, updated: ${updated}, errors: ${errors}`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n\nStep 1 done: ${inserted} inserted, ${updated} updated, ${errors} errors`)

  console.log('\nStep 2: Loading to store_products...')
  let storeInserted = 0, storeErrors = 0

  for (let i = 0; i < validProducts.length; i += CONCURRENT) {
    const batch = validProducts.slice(i, i + CONCURRENT)

    const results = await Promise.allSettled(batch.map(async (kaspiProduct) => {
      const ean = (kaspiProduct.ean && !kaspiProduct.needsEan)
        ? kaspiProduct.ean
        : `kaspi_${kaspiProduct.kaspiCode}`

      let globalId = productMap.get(ean)
      if (!globalId) {
        const { data } = await sb
          .from('global_products')
          .select('id')
          .eq('ean', ean)
          .maybeSingle()
        globalId = data?.id
      }

      if (!globalId) {
        return { type: 'skip', ean }
      }

      const sp = buildStoreProduct(globalId, kaspiProduct)

      const { data: existing } = await sb
        .from('store_products')
        .select('id')
        .eq('store_id', DARA_STORE_ID)
        .eq('global_product_id', globalId)
        .maybeSingle()

      if (existing) {
        const updateData = {}
        if (sp.price_kzt && !existing.price_kzt) updateData.price_kzt = sp.price_kzt
        if (Object.keys(updateData).length > 0) {
          await sb.from('store_products').update(updateData).eq('id', existing.id)
        }
        return { type: 'exists', ean }
      }

      const { error } = await sb.from('store_products').insert(sp)
      if (error) {
        if (error.code === '23505') return { type: 'dup', ean }
        throw new Error(`Store insert: ${error.message}`)
      }

      return { type: 'inserted', ean }
    }))

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.type === 'inserted') { storeInserted++; process.stdout.write('+') }
        else process.stdout.write('.')
      } else {
        storeErrors++
        process.stdout.write('E')
      }
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n\nStep 2 done: ${storeInserted} inserted, ${storeErrors} errors`)

  const { count: totalProducts } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  const { count: totalStoreProducts } = await sb.from('store_products').select('*', { count: 'exact', head: true })

  console.log(`\n=== Done! ===`)
  console.log(`Global products total: ${totalProducts}`)
  console.log(`Store products total: ${totalStoreProducts}`)
  console.log(`This run: ${inserted} new products, ${updated} updated, ${storeInserted} store links`)
}

main()

import fs from 'node:fs'
import readline from 'node:readline'
import crypto from 'node:crypto'

const INPUT_PATH = 'data/korset_master_catalog_v4.jsonl'
const OUTPUT_PATH = 'data/korset_master_catalog_v4_final.jsonl'
const IMAGES_PLAN_PATH = 'data/r2_upload_plan.jsonl'

async function prepareCatalog() {
  console.log('=== Step 1: Reading and Deduplicating Catalog ===')

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_PATH),
    crlfDelay: Infinity,
  })

  const productMap = new Map() // ean -> merged item
  let rawCount = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    rawCount++
    const item = JSON.parse(line)
    const ean = String(item.ean).trim()

    if (!productMap.has(ean)) {
      productMap.set(ean, { ...item, ean })
    } else {
      // Merge with existing record, picking richest data
      const existing = productMap.get(ean)
      const merged = { ...existing }

      // Prefer non-empty ingredients
      if (!merged.ingredients_raw && item.ingredients_raw) {
        merged.ingredients_raw = item.ingredients_raw
      }
      if (!merged.ingredients_kz && item.ingredients_kz) {
        merged.ingredients_kz = item.ingredients_kz
      }

      // Prefer non-empty images
      const existingImgs = (merged.images && merged.images.length > 0) ? merged.images : (merged.image_url ? [merged.image_url] : [])
      const itemImgs = (item.images && item.images.length > 0) ? item.images : (item.image_url ? [item.image_url] : [])
      if (itemImgs.length > existingImgs.length) {
        merged.images = itemImgs
        merged.image_url = item.image_url
      }

      // Higher quality score
      if ((item.data_quality_score || 0) > (merged.data_quality_score || 0)) {
        merged.data_quality_score = item.data_quality_score
      }

      // Union alternate EANs
      const altSet = new Set([...(merged.alternate_eans || [ean]), ...(item.alternate_eans || [ean])])
      merged.alternate_eans = Array.from(altSet)

      // Price
      if (!merged.price_kzt && item.price_kzt) {
        merged.price_kzt = item.price_kzt
      }

      productMap.set(ean, merged)
    }
  }

  console.log(`Raw rows read: ${rawCount}`)
  console.log(`Unique primary EANs: ${productMap.size} (Deduplicated ${rawCount - productMap.size})`)

  console.log('=== Step 2: Preparing Final Schema & R2 CDN URLs ===')

  const outStream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' })
  const planStream = fs.createWriteStream(IMAGES_PLAN_PATH, { flags: 'w' })

  let totalImagesToUpload = 0
  let itemsWithImages = 0
  let itemsWithTwoOrMore = 0

  for (const item of productMap.values()) {
    const ean = item.ean
    const id = crypto.randomUUID()

    // Determine images
    const rawImages = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : (item.image_url ? [item.image_url] : [])

    const originalFrontUrl = rawImages[0] || null
    const originalBackUrl = rawImages[1] || null

    let frontWebpUrl = null
    let backWebpUrl = null
    const finalImagesList = []

    if (originalFrontUrl) {
      itemsWithImages++
      frontWebpUrl = `https://cdn.korset.app/products/${ean}/front.webp`
      finalImagesList.push(frontWebpUrl)
      totalImagesToUpload++

      // Record for R2 upload plan
      const planItem = {
        ean,
        front: {
          original_url: originalFrontUrl,
          r2_key: `products/${ean}/front.webp`,
        },
      }

      if (originalBackUrl) {
        itemsWithTwoOrMore++
        backWebpUrl = `https://cdn.korset.app/products/${ean}/back.webp`
        finalImagesList.push(backWebpUrl)
        totalImagesToUpload++
        planItem.back = {
          original_url: originalBackUrl,
          r2_key: `products/${ean}/back.webp`,
        }
      }

      planStream.write(JSON.stringify(planItem) + '\n')
    }

    const finalRow = {
      id,
      ean,
      name: item.name,
      name_kz: item.name_kz || null,
      brand: item.brand || null,
      category: item.category || 'grocery',
      subcategory: item.subcategory || null,
      quantity: item.quantity || null,
      image_url: frontWebpUrl,
      images: finalImagesList,
      r2_key: frontWebpUrl ? `products/${ean}/front.webp` : null,
      image_source: frontWebpUrl ? 'other' : null,
      original_image_url: originalFrontUrl,
      original_image_ingredients_url: originalBackUrl,
      image_ingredients_url: backWebpUrl,
      ingredients_raw: item.ingredients_raw || null,
      ingredients_kz: item.ingredients_kz || null,
      nutriments_json: item.nutriments_json || {},
      allergens_json: item.allergens_json || [],
      diet_tags_json: item.diet_tags_json || [],
      additives_tags_json: item.additives_tags_json || [],
      halal_status: item.halal_status || 'unknown',
      halal_certifier: item.halal_certifier || null,
      halal_notes: item.halal_notes || null,
      nutriscore: item.nutriscore || null,
      nova_group: item.nova_group || null,
      data_quality_score: Math.min(100, Math.max(0, Number(item.data_quality_score) || 50)),
      source_primary: 'kz_verified',
      source_confidence: 95,
      is_verified: true,
      needs_review: false,
      is_active: true,
      manufacturer: item.manufacturer || null,
      country_of_origin: item.country_of_origin || null,
      packaging_type: item.packaging_type || null,
      fat_percent: item.fat_percent !== undefined && item.fat_percent !== null ? Number(item.fat_percent) : null,
      shelf_life: item.shelf_life || null,
      storage_conditions: item.storage_conditions || null,
      description: item.description || null,
      specs_json: {
        ...(item.specs_json || {}),
        semeiniy_price_kzt: item.price_kzt || null,
      },
      alternate_eans: item.alternate_eans || [ean],
    }

    outStream.write(JSON.stringify(finalRow) + '\n')
  }

  await new Promise((resolve) => outStream.end(resolve))
  await new Promise((resolve) => planStream.end(resolve))

  console.log('=== Summary ===')
  console.log(`Final output written: ${OUTPUT_PATH}`)
  console.log(`Total final products: ${productMap.size}`)
  console.log(`Products with images: ${itemsWithImages} (${(itemsWithImages / productMap.size * 100).toFixed(1)}%)`)
  console.log(`Products with 2+ angles (front + back): ${itemsWithTwoOrMore}`)
  console.log(`Total images scheduled for R2 upload: ${totalImagesToUpload}`)
  console.log(`Upload plan written: ${IMAGES_PLAN_PATH}`)
}

prepareCatalog().catch((err) => {
  console.error('Fatal error during preparation:', err)
  process.exit(1)
})

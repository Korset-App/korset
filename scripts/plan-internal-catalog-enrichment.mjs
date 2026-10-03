import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function parseNum(str) {
  if (!str) return null
  const clean = str.replace(',', '.').trim()
  const num = parseFloat(clean)
  return Number.isFinite(num) ? num : null
}

function extractNutrition(text) {
  if (!text || typeof text !== 'string') return null
  const lower = text.toLowerCase()

  // Must have an explicit nutrition header or table marker
  const hasMarker = /(?:пищевая|энергетическая)\s+ценность|в\s+100\s*(?:г|мл)|на\s+100\s*(?:г|мл)|содержание\s+в\s+100\s*г/i.test(lower)
  if (!hasMarker) return null

  // Isolate nutrition section to avoid matching marketing ratios or background text
  const sectionMatch = lower.match(/(?:пищевая\s+ценность[^\n.:;]*[:\-—–]|содержание\s+в\s+100\s*г[^\n.:;]*[:\-—–]|на\s+100\s*г[^\n.:;]*[:\-—–])([\s\S]{10,250}?)(?=(?:\n\n|\.\s*(?:[А-ЯA-Z]|хранить|условия|срок|изготовитель|производитель|\*|гост)|$))/i)
  const targetText = sectionMatch ? sectionMatch[1] : lower

  // Protein
  let protein = null
  let pMatch = targetText.match(/(?:бел(?:ок|ка|ков|ки|ком)?|ақуыздар?)[\s:\-—–=]+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)?/i)
  if (!pMatch) {
    pMatch = targetText.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*(?:бел(?:ок|ка|ков|ки|ком)?|ақуыз)/i)
  }
  if (pMatch) protein = parseNum(pMatch[1])

  // Fat
  let fat = null
  let fMatch = targetText.match(/(?:жир(?:ы|ов|а|ом)?|майлар?)[\s:\-—–=]+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)?/i)
  if (!fMatch) {
    fMatch = targetText.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*(?:жир(?:а|ов|ы|ом)?|май)/i)
  }
  if (fMatch) fat = parseNum(fMatch[1])

  // Carbohydrates
  let carbs = null
  let cMatch = targetText.match(/(?:углевод(?:ы|ов|а|ом|ов)?|углводов|көмірсулар?)[\s:\-—–=]+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)?/i)
  if (!cMatch) {
    cMatch = targetText.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*(?:углевод(?:а|ов|ы|ом)?|көмірсу)/i)
  }
  if (cMatch) carbs = parseNum(cMatch[1])

  // Energy
  let energy_kcal = null
  let eMatch = targetText.match(/(?:калорийность|энергетическая\s+ценность)[\s:\-—–=]+(?:(?:\d+(?:[.,]\d+)?\s*(?:кдж|kj)\s*\(?|\d+(?:[.,]\d+)?\s*(?:кдж|kj)\s*\/\s*))?(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)?/i)
  if (!eMatch) {
    eMatch = targetText.match(/(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)\b/i)
  }
  if (eMatch && parseNum(eMatch[1]) > 0 && parseNum(eMatch[1]) < 950) {
    energy_kcal = parseNum(eMatch[1])
  } else {
    const kjMatch = targetText.match(/(\d+(?:[.,]\d+)?)\s*(?:кдж|kj)\b/i)
    if (kjMatch) {
      const kj = parseNum(kjMatch[1])
      if (kj && kj > 0) energy_kcal = Math.round(kj / 4.184)
    }
  }

  // Must have at least two nutrients or full macros
  const macroCount = (protein !== null ? 1 : 0) + (fat !== null ? 1 : 0) + (carbs !== null ? 1 : 0)
  if (macroCount < 2 && energy_kcal === null) return null

  const p = protein ?? 0
  const f = fat ?? 0
  const c = carbs ?? 0

  // Strict physical laws
  if (p < 0 || p > 100) return null
  if (f < 0 || f > 100) return null
  if (c < 0 || c > 100) return null
  if (p + f + c > 102) return null // Max 102g per 100g

  if (energy_kcal === null && macroCount >= 2) {
    energy_kcal = Math.round(p * 4 + f * 9 + c * 4)
  }

  if (energy_kcal !== null) {
    if (energy_kcal <= 0 || energy_kcal > 950) return null
    const calcCal = p * 4 + f * 9 + c * 4
    if (calcCal > 0 && Math.abs(energy_kcal - calcCal) > Math.max(100, calcCal * 0.45)) {
      // Large discrepancy between stated and calculated energy
      return null
    }
  }

  const res = {}
  if (energy_kcal !== null) {
    res.energy_kcal = Number(energy_kcal.toFixed(0))
    res.calories = res.energy_kcal
  }
  if (protein !== null) {
    res.protein_100g = Number(protein.toFixed(1))
    res.proteins = res.protein_100g
  }
  if (fat !== null) {
    res.fat_100g = Number(fat.toFixed(1))
    res.fat = res.fat_100g
  }
  if (carbs !== null) {
    res.carbohydrates_100g = Number(carbs.toFixed(1))
    res.carbohydrates = res.carbohydrates_100g
  }

  return Object.keys(res).length >= 2 ? res : null
}

function extractShelfLife(text) {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/(?:срок\s+(?:годности|хранения)|жарамдылық\s+мерзімі)[\s:\-—–]+(\d+\s*(?:месяц(?:ев|а)?|дн(?:ей|я)?|сут(?:ок|ки)?|год(?:а)?|лет|час(?:ов|а)?))/i)
  return match ? match[1].trim() : null
}

function extractStorageConditions(text) {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/(?:условия\s+хранения[\s:\-—–]+|хранить\s+при\s+температуре\s+)([^.\n]+?(?:от\s*[-+]?\d+.*?до\s*[-+]?\d+.*?(?:°с|c|градусов)[^.\n]*?))/i)
  if (match) {
    const res = match[1].trim()
    if (res.length > 5 && res.length < 200) return res
  }
  return null
}

function cleanIngredientsTail(text) {
  if (!text || typeof text !== 'string') return null
  const markers = [
    /\.\s*(?:пищевая\s+ценность|энергетическая\s+ценность)/i,
    /\.\s*условия\s+хранения/i,
    /\.\s*срок\s+годности/i,
    /\.\s*изготовитель/i,
    /\.\s*производитель/i,
  ]
  let cutIdx = -1
  for (const m of markers) {
    const idx = text.search(m)
    if (idx !== -1 && (cutIdx === -1 || idx < cutIdx)) {
      cutIdx = idx
    }
  }
  if (cutIdx > 15) {
    const cleaned = text.slice(0, cutIdx).trim().replace(/[,.:;*—–\-]+$/, '').trim()
    if (cleaned.length >= 10 && cleaned !== text) return cleaned
  }
  return null
}

function extractIngredientsFromDescription(desc) {
  if (!desc || typeof desc !== 'string') return null
  // Match explicit "Состав: [список ингредиентов]" block
  const match = desc.match(/(?:^|\n|\.\s+)(?:состав|құрамы)[\s:\-—–]+([^.]+?(?:\([^)]+\)[^.]*?)*\.)/i)
  if (match) {
    const raw = match[1].trim()
    // Make sure it looks like a real recipe (contains commas or ingredients keywords)
    if (raw.length > 15 && raw.length < 1500 && raw.includes(',')) {
      const cutIdx = raw.search(/пищевая\s+ценность|энергетическая\s+ценность|условия\s+хранения|срок\s+годности|изготовитель/i)
      const clean = cutIdx !== -1 ? raw.slice(0, cutIdx).trim() : raw
      // Validate that it doesn't look like promo text
      if (!/(?:позволяет|рекомендуется|наш\s+бренд|купите|вкусный|идеально\s+подходит)/i.test(clean)) {
        return clean.replace(/[,.:;*—–\-]+$/, '').trim()
      }
    }
  }
  return null
}

async function planInternalEnrichment() {
  console.log('='.repeat(70))
  console.log(' Planning Internal Text Enrichment for Active Catalog')
  console.log(' Mode: DRY-RUN (Planning only)')
  console.log('='.repeat(70))

  let page = 0
  const limit = 1000
  const proposals = []

  let scannedCount = 0
  let matchedKbjuCount = 0
  let matchedIngCount = 0
  let cleanedTailCount = 0
  let matchedShelfCount = 0
  let matchedStorageCount = 0

  while (true) {
    const { data, error } = await sb.from('global_products')
      .select('id, ean, name, category, brand, ingredients_raw, description, nutriments_json, shelf_life, storage_conditions, specs_json')
      .eq('is_active', true)
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      console.error('Fetch error:', error.message)
      break
    }
    if (!data || data.length === 0) break

    for (const p of data) {
      scannedCount++
      // Only food products
      if (['household', 'personal_care', 'pet'].includes(p.category)) continue

      const n = p.nutriments_json || {}
      const hasFullKbju = (n.calories || n.energy_kcal) && (n.proteins || n.protein_100g) && (n.fat || n.fat_100g) && (n.carbohydrates || n.carbohydrates_100g)
      const hasIng = p.ingredients_raw && p.ingredients_raw.trim().length > 5
      const combinedText = [p.ingredients_raw, p.description].filter(Boolean).join('\n')

      const updates = {}
      const provenance = {}

      // 1. KBJU extraction
      if (!hasFullKbju) {
        const extractedNutr = extractNutrition(p.ingredients_raw) || extractNutrition(p.description)
        if (extractedNutr) {
          // Merge with any existing partial values
          const merged = { ...n, ...extractedNutr }
          updates.nutriments_json = merged
          provenance.kbju_source = 'internal_text_extraction'
          matchedKbjuCount++
        }
      }

      // 2. Ingredients from description if empty
      if (!hasIng) {
        const extractedIng = extractIngredientsFromDescription(p.description)
        if (extractedIng) {
          updates.ingredients_raw = extractedIng
          provenance.ingredients_source = 'internal_desc_extraction'
          matchedIngCount++
        }
      }

      // 3. Clean ingredients tail (if not already updating ingredients_raw)
      if (!updates.ingredients_raw && hasIng) {
        const cleaned = cleanIngredientsTail(p.ingredients_raw)
        if (cleaned) {
          updates.ingredients_raw = cleaned
          provenance.ingredients_cleaned_tail = true
          cleanedTailCount++
        }
      }

      // 4. Shelf life
      if (!p.shelf_life) {
        const shelf = extractShelfLife(combinedText)
        if (shelf) {
          updates.shelf_life = shelf
          provenance.shelf_life_source = 'internal_text_extraction'
          matchedShelfCount++
        }
      }

      // 5. Storage conditions
      if (!p.storage_conditions) {
        const storage = extractStorageConditions(combinedText)
        if (storage) {
          updates.storage_conditions = storage
          provenance.storage_source = 'internal_text_extraction'
          matchedStorageCount++
        }
      }

      if (Object.keys(updates).length > 0) {
        proposals.push({
          id: p.id,
          ean: p.ean,
          name: p.name,
          brand: p.brand,
          category: p.category,
          updates,
          provenance
        })
      }
    }

    if (data.length < limit) break
    page++
  }

  console.log(`\nScan complete! Scanned ${scannedCount} active items.`)
  console.log(`\n--- PROPOSED ENRICHMENTS ---`)
  console.log(`  Total products to enrich:     ${proposals.length}`)
  console.log(`  - KBJU added / completed:     ${matchedKbjuCount}`)
  console.log(`  - Ingredients recovered:      ${matchedIngCount}`)
  console.log(`  - Ingredients tail cleaned:   ${cleanedTailCount}`)
  console.log(`  - Shelf life recovered:       ${matchedShelfCount}`)
  console.log(`  - Storage conditions recovered: ${matchedStorageCount}`)

  // Save proposals to scratch file
  const outFile = path.join(__dirname, '..', 'scratch', 'internal-enrichment-proposal.jsonl')
  fs.writeFileSync(outFile, proposals.map(p => JSON.stringify(p)).join('\n'), 'utf-8')
  console.log(`\nProposal saved to: ${outFile}`)

  // Show samples
  console.log('\n--- SAMPLE PROPOSALS (first 10) ---\n')
  for (let i = 0; i < Math.min(10, proposals.length); i++) {
    const pr = proposals[i]
    console.log('----------------------------------------------------------------------')
    console.log(`[${pr.ean}] ${pr.name}`)
    for (const [k, v] of Object.entries(pr.updates)) {
      console.log(`  + ${k}:`, typeof v === 'object' ? JSON.stringify(v) : v.slice(0, 100))
    }
  }
}

planInternalEnrichment()

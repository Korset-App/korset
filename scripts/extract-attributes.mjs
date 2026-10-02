import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const isLive = process.argv.includes('--live')
const isDryRun = !isLive

const envPath = join(__dirname, '..', '.env.local')
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  try {
    const envContent = readFileSync(envPath, 'utf8')
    for (const rawLine of envContent.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx <= 0) continue
      const key = line.slice(0, eqIdx).trim()
      const val = line
        .slice(eqIdx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      if (!val) continue
      if (key === 'SUPABASE_URL' || (key === 'VITE_SUPABASE_URL' && !process.env.SUPABASE_URL)) {
        process.env.SUPABASE_URL = val
      }
      if (key === 'SUPABASE_SERVICE_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY') {
        process.env.SUPABASE_SERVICE_KEY = val
      }
    }
  } catch {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY — check .env.local')
    process.exit(1)
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

const CONCURRENCY = 6

function parseArrayField(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseObjectField(val) {
  if (!val) return null
  if (typeof val === 'object' && !Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

function sameStringSet(a = [], b = []) {
  const sa = [...new Set(a)].sort()
  const sb = [...new Set(b)].sort()
  if (sa.length !== sb.length) return false
  return sa.every((v, i) => v === sb[i])
}

function summarizeCounts(rows, getList) {
  const counts = {}
  let nonEmpty = 0
  for (const row of rows) {
    const list = getList(row)
    if (list.length > 0) nonEmpty++
    for (const item of list) {
      counts[item] = (counts[item] || 0) + 1
    }
  }
  return { nonEmpty, counts }
}

async function main() {
  const { extractAllAttributes, isValidPackagingType } = await import(
    pathToFileURL(join(__dirname, '..', 'src', 'domain', 'product', 'attributeExtractor.js')).href
  )

  console.log(`\n🧪 Attribute & Composition Normalization — ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const allProducts = []
  let lastId = null
  const PAGE_SIZE = 400

  while (true) {
    let data = null
    let lastErr = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      let query = supabase
        .from('global_products')
        .select(
          'id, is_active, name, category, halal_status, diet_tags_json, allergens_json, traces_json, ingredients_raw, nutriments_json, packaging_type, fat_percent'
        )
        .order('id', { ascending: true })
        .limit(PAGE_SIZE)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      try {
        const res = await query.abortSignal(AbortSignal.timeout(15000))
        if (!res.error) {
          data = res.data
          lastErr = null
          break
        }
        lastErr = res.error
      } catch (err) {
        lastErr = { message: err?.message || String(err) }
      }
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }

    if (lastErr) {
      console.error('Fetch error:', lastErr)
      process.exit(1)
    }
    if (!data || data.length === 0) {
      break
    }

    for (const row of data) {
      if (row.is_active) allProducts.push(row)
    }
    lastId = data[data.length - 1].id
    if (allProducts.length % 5000 < PAGE_SIZE) {
      console.log(`  Fetched ${allProducts.length} active products...`)
    }
    if (data.length < PAGE_SIZE) break
  }

  console.log(`Fetched: ${allProducts.length} products\n`)

  const beforeAllergens = summarizeCounts(allProducts, (r) => parseArrayField(r.allergens_json))
  const beforeTraces = summarizeCounts(allProducts, (r) => parseArrayField(r.traces_json))
  const beforeDietTags = summarizeCounts(allProducts, (r) => parseArrayField(r.diet_tags_json))
  const beforeHalal = { yes: 0, no: 0, unknown: 0 }
  for (const r of allProducts) {
    const hs = r.halal_status || 'unknown'
    beforeHalal[hs] = (beforeHalal[hs] || 0) + 1
  }

  const stats = {
    packaging: 0,
    fat_percent: 0,
    allergens_updated: 0,
    traces_updated: 0,
    diet_tags_updated: 0,
    halal_updated: 0,
    unchanged: 0,
  }

  const updates = []
  const afterPreviewRows = []

  for (const row of allProducts) {
    const existingDietTags = parseArrayField(row.diet_tags_json)
    const existingAllergens = parseArrayField(row.allergens_json)
    const existingTraces = parseArrayField(row.traces_json)
    const nutriments = parseObjectField(row.nutriments_json)

    const attrs = extractAllAttributes({
      name: row.name,
      category: row.category,
      halalStatus: row.halal_status,
      dietTags: existingDietTags,
      ingredients: row.ingredients_raw || '',
      nutriments,
      allergens: existingAllergens,
      traces: existingTraces,
    })

    afterPreviewRows.push({
      allergens: attrs.allergens,
      traces: attrs.traces,
      diet_tags: attrs.diet_tags,
      halal_status: attrs.halal_status,
    })

    const fields = {}
    if (
      attrs.packaging_type &&
      isValidPackagingType(attrs.packaging_type) &&
      attrs.packaging_type !== row.packaging_type
    ) {
      fields.packaging_type = attrs.packaging_type
      stats.packaging++
    }
    if (attrs.fat_percent !== null && attrs.fat_percent !== row.fat_percent) {
      fields.fat_percent = attrs.fat_percent
      stats.fat_percent++
    }
    if (!sameStringSet(attrs.allergens, existingAllergens)) {
      fields.allergens_json = attrs.allergens
      stats.allergens_updated++
    }
    if (!sameStringSet(attrs.traces, existingTraces)) {
      fields.traces_json = attrs.traces
      stats.traces_updated++
    }
    if (!sameStringSet(attrs.diet_tags, existingDietTags)) {
      fields.diet_tags_json = attrs.diet_tags
      stats.diet_tags_updated++
    }
    if (attrs.halal_status !== row.halal_status && attrs.halal_status !== 'unknown') {
      fields.halal_status = attrs.halal_status
      stats.halal_updated++
    }

    if (Object.keys(fields).length > 0) {
      updates.push({ id: row.id, ...fields })
    } else {
      stats.unchanged++
    }
  }

  const afterAllergens = summarizeCounts(afterPreviewRows, (r) => r.allergens)
  const afterTraces = summarizeCounts(afterPreviewRows, (r) => r.traces)
  const afterDietTags = summarizeCounts(afterPreviewRows, (r) => r.diet_tags)
  const afterHalal = { yes: 0, no: 0, unknown: 0 }
  for (const r of afterPreviewRows) {
    const hs = r.halal_status || 'unknown'
    afterHalal[hs] = (afterHalal[hs] || 0) + 1
  }

  console.log('=== BEFORE vs AFTER SUMMARY ===')
  console.log(
    `Allergens non-empty: ${beforeAllergens.nonEmpty} -> ${afterAllergens.nonEmpty}`,
    afterAllergens.counts
  )
  console.log(
    `Traces non-empty:    ${beforeTraces.nonEmpty} -> ${afterTraces.nonEmpty}`,
    afterTraces.counts
  )
  console.log(
    `Diet tags non-empty: ${beforeDietTags.nonEmpty} -> ${afterDietTags.nonEmpty}`,
    afterDietTags.counts
  )
  console.log(`Halal status:       `, beforeHalal, '->', afterHalal)
  console.log('\n=== UPDATE STATS ===')
  console.log(`  Packaging updated:  ${stats.packaging}`)
  console.log(`  Fat % updated:      ${stats.fat_percent}`)
  console.log(`  Allergens updated:  ${stats.allergens_updated}`)
  console.log(`  Traces updated:     ${stats.traces_updated}`)
  console.log(`  Diet tags updated:  ${stats.diet_tags_updated}`)
  console.log(`  Halal updated:      ${stats.halal_updated}`)
  console.log(`  Unchanged rows:     ${stats.unchanged}`)
  console.log(`  Total rows to write:${updates.length}`)

  if (isLive && updates.length > 0) {
    let applied = 0
    let failed = 0

    async function updateWithRetry(id, fields, maxAttempts = 4) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { error } = await supabase
            .from('global_products')
            .update(fields)
            .eq('id', id)
            .abortSignal(AbortSignal.timeout(8000))
          if (!error) return { id, error: null }
          if (attempt === maxAttempts) return { id, error }
        } catch (err) {
          if (attempt === maxAttempts) return { id, error: { message: err?.message || String(err) } }
        }
        await new Promise((r) => setTimeout(r, 200 * attempt))
      }
      return { id, error: { message: 'max retries exceeded' } }
    }

    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const batch = updates.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((u) => {
          const { id, ...fields } = u
          return updateWithRetry(id, fields)
        })
      )
      for (const r of results) {
        if (r.error) {
          console.error(`Update error ${r.id}:`, r.error.message)
          failed++
        } else {
          applied++
        }
      }
      if ((i + CONCURRENCY) % 500 < CONCURRENCY || i + CONCURRENCY >= updates.length) {
        console.log(
          `  Progress: ${applied + failed}/${updates.length} (applied: ${applied}, failed: ${failed})`
        )
      }
    }
    console.log(`\n  ✅ Total applied: ${applied}, Failed: ${failed}`)
  }

  console.log(`\n${isDryRun ? '🧪 DRY RUN — no changes made' : '✅ LIVE — changes applied'}\n`)
}

main().catch(console.error)

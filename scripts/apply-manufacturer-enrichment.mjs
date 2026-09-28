import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', quiet: true })
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const inputPath = 'scratch/live-enrichable-manufacturers-proposal.jsonl'
const enrichable = fs.readFileSync(inputPath, 'utf8')
  .split(/\r?\n/).filter(Boolean).map(JSON.parse)

console.log(`Starting enrichment of ${enrichable.length} verified products...`)

const runId = '2026-09-28-manufacturer-official-01'
let updatedCount = 0
let failedCount = 0

// Process in batches of 10 concurrently
const batchSize = 10
for (let i = 0; i < enrichable.length; i += batchSize) {
  const batch = enrichable.slice(i, i + batchSize)
  await Promise.all(batch.map(async (item) => {
    try {
      // First fetch current specs_json
      const { data: existing, error: fetchErr } = await client.from('global_products')
        .select('specs_json')
        .eq('ean', item.ean)
        .single()

      if (fetchErr) throw fetchErr

      const currentSpecs = existing?.specs_json || {}
      const provenance = {
        source: item.donorSource,
        source_name: item.donorName,
        source_url: item.donorUrl,
        run_id: runId,
        applied_at: new Date().toISOString()
      }

      const updates = {
        specs_json: {
          ...currentSpecs,
          official_manufacturer_provenance: provenance
        }
      }

      if (item.needsNutr && item.newNutrition) {
        updates.nutriments_json = item.newNutrition
      }

      if (item.needsIng && item.newIngredients) {
        updates.ingredients_raw = item.newIngredients
      }

      const { error: updateErr } = await client.from('global_products')
        .update(updates)
        .eq('ean', item.ean)

      if (updateErr) throw updateErr
      updatedCount++
    } catch (err) {
      console.error(`Failed to update EAN ${item.ean}:`, err.message)
      failedCount++
    }
  }))

  process.stdout.write(`Progress: ${Math.min(i + batchSize, enrichable.length)} / ${enrichable.length}\r`)
}

console.log(`\n\n=== ENRICHMENT COMPLETED ===`)
console.log(`Successfully updated: ${updatedCount}`)
console.log(`Failed: ${failedCount}`)

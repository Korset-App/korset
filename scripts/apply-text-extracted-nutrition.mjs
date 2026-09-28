import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', quiet: true })
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const inputPath = 'scratch/text-extracted-nutrition-proposal.jsonl'
const rows = fs.readFileSync(inputPath, 'utf8')
  .split(/\r?\n/).filter(Boolean).map(JSON.parse)

console.log(`Starting apply for ${rows.length} extracted text nutrition products...`)

const runId = '2026-09-28-text-nutrition-extraction-01'
let updated = 0
let failed = 0

// Generate rollback SQL file
const rollbackStatements = []
for (const r of rows) {
  const rollbackSql = `UPDATE public.global_products SET nutriments_json = '{}'::jsonb, specs_json = specs_json - 'text_extracted_nutrition' WHERE ean = '${r.ean}' AND specs_json->'text_extracted_nutrition'->>'run_id' = '${runId}';`
  rollbackStatements.push(rollbackSql)
}
fs.writeFileSync('scratch/rollback-text-extracted-nutrition-20260928.sql', `BEGIN;\n${rollbackStatements.join('\n')}\nCOMMIT;\n`)

// Apply in batches of 10
const batchSize = 10
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize)
  await Promise.all(batch.map(async (item) => {
    try {
      const { data: existing, error: fetchErr } = await client.from('global_products')
        .select('specs_json')
        .eq('ean', item.ean)
        .single()

      if (fetchErr) throw fetchErr

      const currentSpecs = existing?.specs_json || {}
      const provenance = {
        source_field: item.sourceField,
        run_id: runId,
        applied_at: new Date().toISOString()
      }

      const updates = {
        nutriments_json: item.nutrition,
        specs_json: {
          ...currentSpecs,
          text_extracted_nutrition: provenance
        }
      }

      // If ingredients were cleaned, update them too
      if (item.cleanedIngredients) {
        updates.ingredients_raw = item.cleanedIngredients
      }

      const { error: updateErr } = await client.from('global_products')
        .update(updates)
        .eq('ean', item.ean)

      if (updateErr) throw updateErr
      updated++
    } catch (err) {
      console.error(`Failed to update ${item.ean}:`, err.message)
      failed++
    }
  }))

  process.stdout.write(`Progress: ${Math.min(i + batchSize, rows.length)} / ${rows.length}\r`)
}

console.log(`\n\n=== TEXT NUTRITION APPLY COMPLETED ===`)
console.log(`Successfully updated: ${updated}`)
console.log(`Failed: ${failed}`)

/* global process, console */
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const KORSET_CATEGORIES = [
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages', 'tea_coffee',
  'sweets', 'snacks', 'grocery', 'sauces_spices', 'bread', 'frozen',
  'fruits_veg', 'baby_food', 'ready_meals', 'healthy', 'personal_care', 'household',
]

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase())
    })
  )
}

async function analyzeWithVision({ photoUrls, ean, comment, reason, shownProductName }) {
  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    throw new Error('Neither OPENAI_API_KEY nor GEMINI_API_KEY configured in .env.local')
  }

  const prompt = `You are a grocery catalog expert for Körset, a supermarket app in Kazakhstan.
Analyze the provided product packaging photos for barcode EAN: "${ean}".
Shopper note/comment: "${comment || 'none'}"
Reason for report: "${reason || 'new_product'}"
Existing product name on app: "${shownProductName || 'none'}"

Extract and structure the product information into strict JSON format with these exact keys:
{
  "name": "Full official product name in Russian (e.g. 'Шоколадный батончик Snickers с лесным орехом, 81 г')",
  "name_kz": "Product name in Kazakh if visible on the package, or null",
  "brand": "Brand name (e.g. 'Snickers', 'Рахат', 'ФудМастер')",
  "category": "Must be exactly ONE of: ${KORSET_CATEGORIES.join(', ')}",
  "quantity": "Weight or volume (e.g. '81 г', '1 л', '450 мл')",
  "ingredients_raw": "Full ingredients text in Russian exactly as printed on the pack",
  "ingredients_kz": "Full ingredients text in Kazakh if printed on the pack, or null",
  "nutriments": {
    "energy_kcal": 0,
    "protein_100g": 0,
    "fat_100g": 0,
    "carbohydrates_100g": 0
  },
  "is_halal_certified": false,
  "mismatch_notes": "Short description of what changed compared to app name or what was verified"
}

Rules:
1. Only return valid JSON, no markdown fences, no conversational prose.
2. If nutrition per 100g is not visible, use null for those nutriments fields.
3. Choose the most appropriate category from the given list.`

  if (OPENAI_API_KEY) {
    const imageContents = photoUrls.map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' },
    }))

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an accurate OCR and grocery product data extractor. Output only raw JSON.',
          },
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }, ...imageContents],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} ${errText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    return JSON.parse(content)
  }

  throw new Error('No supported Vision API key found')
}

async function main() {
  const args = process.argv.slice(2)
  const isAuto = args.includes('--auto')
  const isDryRun = args.includes('--dry-run')

  console.log('\n🚀 [Körset] Processing Product Submissions & Corrections')
  console.log('='.repeat(60))
  if (isDryRun) console.log('⚠️ DRY RUN MODE: No database changes will be saved.')
  if (isAuto) console.log('⚡ AUTO MODE: Automatically applying high confidence results.')

  // Fetch all 'new' submissions with photos
  const { data: events, error } = await admin
    .from('product_correction_events')
    .select('id, ean, shown_ean, shown_global_product_id, store_id, reason, context, comment, metadata_json, created_at')
    .eq('status', 'new')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ Failed to fetch correction events:', error)
    process.exit(1)
  }

  const submissionsWithPhotos = (events || []).filter(
    (e) => Array.isArray(e.metadata_json?.photo_urls) && e.metadata_json.photo_urls.length > 0
  )

  console.log(`📋 Found ${events?.length || 0} open events (${submissionsWithPhotos.length} with photos).\n`)

  if (submissionsWithPhotos.length === 0) {
    console.log('✅ No pending photo submissions to process. Good job!')
    return
  }

  let processedCount = 0

  for (let i = 0; i < submissionsWithPhotos.length; i++) {
    const ev = submissionsWithPhotos[i]
    const photoUrls = ev.metadata_json.photo_urls
    const subType = ev.metadata_json.submission_type || 'new_product'
    const priceKzt = ev.metadata_json.price_kzt

    console.log(`\n────────────────────────────────────────────────────────────`)
    console.log(`[${i + 1}/${submissionsWithPhotos.length}] EAN: ${ev.ean} (${subType.toUpperCase()})`)
    console.log(`Reason: ${ev.reason} | Context: ${ev.context}`)
    if (ev.comment) console.log(`User comment: "${ev.comment}"`)
    if (priceKzt) console.log(`Price: ${priceKzt} ₸`)
    console.log(`Photos (${photoUrls.length}):\n  ${photoUrls.join('\n  ')}`)

    console.log('\n⏳ Running Vision AI analysis...')
    let parsed
    try {
      parsed = await analyzeWithVision({
        photoUrls,
        ean: ev.ean,
        comment: ev.comment,
        reason: ev.reason,
        shownProductName: ev.metadata_json.shownProductName,
      })
    } catch (err) {
      console.error(`❌ Vision failed: ${err.message}`)
      continue
    }

    console.log('\n✨ AI Extraction Result:')
    console.log(`  Name (RU):    ${parsed.name}`)
    if (parsed.name_kz) console.log(`  Name (KZ):    ${parsed.name_kz}`)
    console.log(`  Brand:        ${parsed.brand || '(unknown)'}`)
    console.log(`  Category:     ${parsed.category}`)
    console.log(`  Quantity:     ${parsed.quantity || '(unknown)'}`)
    if (parsed.nutriments) {
      console.log(`  Nutrition:    ${JSON.stringify(parsed.nutriments)}`)
    }
    if (parsed.ingredients_raw) {
      console.log(`  Ingredients:  ${parsed.ingredients_raw.slice(0, 80)}...`)
    }

    let choice = isAuto ? 'a' : 'a'
    if (!isAuto) {
      choice = await askQuestion('\nAction: [a] Apply to database / [s] Skip / [r] Reject: ')
    }

    if (choice === 's') {
      console.log('⏭️ Skipped.')
      continue
    }

    if (choice === 'r') {
      if (!isDryRun) {
        await admin
          .from('product_correction_events')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', ev.id)
      }
      console.log('🚫 Marked as rejected.')
      continue
    }

    if (choice === 'a') {
      if (isDryRun) {
        console.log('✨ [Dry Run] Would apply changes to global_products and store_products.')
        continue
      }

      const primaryImage = photoUrls[0] || null

      if (subType === 'new_product') {
        // Upsert into global_products
        const { data: newProd, error: gpErr } = await admin
          .from('global_products')
          .upsert(
            {
              ean: ev.ean,
              name: parsed.name,
              name_kz: parsed.name_kz || null,
              brand: parsed.brand || null,
              category: parsed.category,
              quantity: parsed.quantity || null,
              ingredients_raw: parsed.ingredients_raw || null,
              nutriments_json: parsed.nutriments || null,
              image_url: primaryImage,
              is_active: true,
              source_primary: 'shopper_submission',
            },
            { onConflict: 'ean' }
          )
          .select('id')
          .single()

        if (gpErr) {
          console.error('❌ Failed to insert into global_products:', gpErr)
          continue
        }

        // Link to store_products if store_id is present
        if (ev.store_id && newProd?.id) {
          await admin.from('store_products').upsert(
            {
              store_id: ev.store_id,
              global_product_id: newProd.id,
              ean: ev.ean,
              price_kzt: priceKzt || 0,
              is_active: true,
            },
            { onConflict: 'store_id, ean' }
          )
        }
      } else {
        // Correction mode
        const targetId = ev.shown_global_product_id
        if (targetId) {
          const updateFields = {
            updated_at: new Date().toISOString(),
          }
          if (parsed.name) updateFields.name = parsed.name
          if (parsed.name_kz) updateFields.name_kz = parsed.name_kz
          if (parsed.brand) updateFields.brand = parsed.brand
          if (parsed.category) updateFields.category = parsed.category
          if (parsed.quantity) updateFields.quantity = parsed.quantity
          if (parsed.ingredients_raw) updateFields.ingredients_raw = parsed.ingredients_raw
          if (parsed.nutriments) updateFields.nutriments_json = parsed.nutriments
          if (primaryImage && ev.reason === 'wrong_image') updateFields.image_url = primaryImage

          await admin.from('global_products').update(updateFields).eq('id', targetId)
        }
      }

      // Mark event as fixed
      await admin
        .from('product_correction_events')
        .update({
          status: 'fixed',
          resolution_json: {
            resolved_by: 'ai_vision_script',
            applied_name: parsed.name,
            applied_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ev.id)

      console.log('✅ Applied to database and marked event as FIXED!')
      processedCount++
    }
  }

  console.log(`\n🎉 All done! Processed and applied ${processedCount} products.`)
}

main().catch(console.error)

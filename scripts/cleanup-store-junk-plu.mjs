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
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function classifyNormalEanJunk(product) {
  const name = (product.name || '').toLowerCase()

  // 1. Pet food & pet supplies & cat litter
  if (
    /наполнитель.*кош|наполнитель.*кот|наполнитель.*эконом|наполнитель.*лесной|наполнитель.*бентонит|наполнитель.*березов|наполнитель.*соснов|наполнитель.*минеральн|наполнитель.*впитывающ|наполнитель.*комкующ|наполнитель.*силикагель|наполнитель.*барсик|наполнитель ok-lock|наполнитель murkel|наполнитель 365 дней/.test(name) ||
    /корм для|корм д\.собак|корм d\.собак|корм д\.кошек|корм d\.кошек|лакомство для|полнорац.*корм|whiskas|kitekat|pedigree|chappi|felix|friskies|purina|pro plan|sheba|perfect fit|кошачий корм|собачий корм/.test(name)
  ) {
    return 'pet_food_and_litter'
  }

  // 2. BBQ & Picnic hardware
  if (
    /мангал|уголь березов|уголь древесн|жидкость для розжига|веер для мангала|решетка для барбекю|решетка для гриля|решетка-гриль/.test(name) ||
    (/шампур/.test(name) && !/паштет|колбас|мясо|сыр/.test(name)) ||
    (/щетка.*мангал/.test(name))
  ) {
    return 'bbq_picnic_hardware'
  }

  // 3. Agricultural planting seeds (exclude edible seeds like chia, sesame, sunflower snack, pumpkin snack)
  const isEdible = /чиа|кунжут|семечки|жарен|снек|к пиву|хрумка|бабкины|в шоколаде|козинаки/.test(name)
  if (!isEdible && (
    /семена томат|семена огурц|семена морков|семена перц|семена петрушк|семена укроп|семена редис|семена капуст|семена баклажан|семена кабачк|семена свекл|семена дыни|семена арбуз|семена цветов|агросоюз|огород сибири|газонн|грунт для рассады|удобрение для/.test(name)
  )) {
    return 'agricultural_planting_seeds'
  }

  // 4. Toys & School Stationery
  if (
    /ручка шариковая|ручка гелевая|стержень для ручки|пластилин|тетрадь 12л|тетрадь 48л|тетрадь ученическая|карандаши цветные|карандаш цветн|точилка |ластик |клей-карандаш|краски акварельные|гуашь|альбом для рисования|дневник школьный|игрушка мягкая|кукла |машинка металлическая|конструктор lego/.test(name)
  ) {
    return 'toys_and_stationery'
  }

  // 5. Auto supplies & Hardware & Toxic chemicals
  if (
    /автошампунь|стеклоомыватель|губка автомобильная|щетка для авто|масло моторное|клей момент|клей секунда|отвертка |удлинитель |лампочка светодиодная|паяльник|тесто-брикет nadzor|от крыс и мышей/.test(name)
  ) {
    return 'auto_hardware_toxic'
  }

  return null
}

async function runCleanup() {
  const isLive = process.argv.includes('--live')
  const isHardDelete = process.argv.includes('--hard-delete')
  const modeLabel = isHardDelete ? '[HARD-DELETE LIVE]' : isLive ? '[SOFT-DEACTIVATE LIVE]' : '[DRY-RUN]'

  console.log('='.repeat(70))
  console.log(` Körset Catalog Cleanup: PLU (20-29), Non-Food & Store Junk`)
  console.log(` Mode: ${modeLabel}`)
  console.log('='.repeat(70))

  console.log('\n[1/4] Fetching active products from global_products...')
  const BATCH_SIZE = 500
  let offset = 0
  const allActive = []

  while (true) {
    const { data, error } = await supabase
      .from('global_products')
      .select('id, ean, name, name_kz, brand, category, subcategory, source_primary, quantity')
      .eq('is_active', true)
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('Error fetching global_products:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break
    allActive.push(...data)
    if (data.length < BATCH_SIZE) break
    offset += BATCH_SIZE
    process.stdout.write(`\r  Loaded ${allActive.length} products...`)
  }

  console.log(`\n  Total active global products: ${allActive.length}\n`)

  console.log('[2/4] Analyzing and categorizing candidates for removal...')
  const pluGroup = []
  const normalEanJunkGroup = []

  for (const p of allActive) {
    if (/^2[0-9]/.test(p.ean)) {
      pluGroup.push({
        ...p,
        reason: 'local_plu_prefix_2x',
        group: 'PLU (20-29)'
      })
    } else {
      const junkReason = classifyNormalEanJunk(p)
      if (junkReason) {
        normalEanJunkGroup.push({
          ...p,
          reason: junkReason,
          group: 'Normal EAN Junk'
        })
      }
    }
  }

  const allCandidates = [...pluGroup, ...normalEanJunkGroup]

  const pluBreakdown = {}
  for (const p of pluGroup) {
    const pre = p.ean.slice(0, 2)
    pluBreakdown[`prefix_${pre}`] = (pluBreakdown[`prefix_${pre}`] || 0) + 1
  }

  const normalBreakdown = {}
  for (const p of normalEanJunkGroup) {
    normalBreakdown[p.reason] = (normalBreakdown[p.reason] || 0) + 1
  }

  console.log('--- SUMMARY OF CANDIDATES ---')
  console.log(`  1. Local PLU (20-29) items:            ${pluGroup.length}`)
  for (const [k, v] of Object.entries(pluBreakdown)) {
    console.log(`     - ${k}: ${v}`)
  }
  console.log(`  2. Normal EAN non-food / pet junk:     ${normalEanJunkGroup.length}`)
  for (const [k, v] of Object.entries(normalBreakdown)) {
    console.log(`     - ${k}: ${v}`)
  }
  console.log(`  -----------------------------------------`)
  console.log(`  TOTAL CANDIDATES TO CLEAN:             ${allCandidates.length}`)
  console.log(`  Active products after cleanup:         ${allActive.length - allCandidates.length}`)

  // Save report to scratch/
  const reportPath = path.join(__dirname, '..', 'scratch', 'cleanup-candidates-report.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: modeLabel,
      totalActive: allActive.length,
      candidatesCount: allCandidates.length,
      pluCount: pluGroup.length,
      pluBreakdown,
      normalJunkCount: normalEanJunkGroup.length,
      normalBreakdown,
      candidates: allCandidates
    }, null, 2),
    'utf-8'
  )
  console.log(`\n  Report written to: scratch/cleanup-candidates-report.json`)

  if (!isLive) {
    console.log('\n' + '='.repeat(70))
    console.log(` [DRY RUN COMPLETE] No changes were written to the database.`)
    console.log(` Run with --live to soft-deactivate candidates (is_active = false).`)
    console.log(` Run with --live --hard-delete to physically delete records.`)
    console.log('='.repeat(70) + '\n')
    return
  }

  // LIVE EXECUTION
  console.log('\n[3/4] Applying changes to Supabase in safe batches...')
  const candidateIds = allCandidates.map(c => c.id)
  const candidateEans = allCandidates.map(c => c.ean)

  let globalSuccess = 0
  let globalFailed = 0
  let storeSuccess = 0
  let storeFailed = 0

  const CHUNK_SIZE = 50

  if (isHardDelete) {
    console.log('  Executing HARD DELETE...')
    // 1. Delete linked store_products first
    for (let i = 0; i < candidateEans.length; i += CHUNK_SIZE) {
      const chunkEans = candidateEans.slice(i, i + CHUNK_SIZE)
      const { error, count } = await supabase
        .from('store_products')
        .delete()
        .in('ean', chunkEans)

      if (error) {
        console.error(`  store_products delete error at batch ${i}: ${error.message}`)
        storeFailed += chunkEans.length
      } else {
        storeSuccess += (count || chunkEans.length)
      }
    }

    // 2. Delete global_products
    for (let i = 0; i < candidateIds.length; i += CHUNK_SIZE) {
      const chunkIds = candidateIds.slice(i, i + CHUNK_SIZE)
      const { error, count } = await supabase
        .from('global_products')
        .delete()
        .in('id', chunkIds)

      if (error) {
        console.error(`  global_products delete error at batch ${i}: ${error.message}`)
        globalFailed += chunkIds.length
      } else {
        globalSuccess += (count || chunkIds.length)
      }
      process.stdout.write(`\r  Progress: ${Math.min(i + CHUNK_SIZE, candidateIds.length)}/${candidateIds.length}...`)
    }
  } else {
    console.log('  Executing SOFT DEACTIVATION (is_active = false, needs_review = false)...')
    // 1. Deactivate linked store_products
    for (let i = 0; i < candidateEans.length; i += CHUNK_SIZE) {
      const chunkEans = candidateEans.slice(i, i + CHUNK_SIZE)
      const { error } = await supabase
        .from('store_products')
        .update({ is_active: false })
        .in('ean', chunkEans)

      if (error) {
        console.error(`  store_products update error at batch ${i}: ${error.message}`)
        storeFailed += chunkEans.length
      } else {
        storeSuccess += chunkEans.length
      }
    }

    // 2. Deactivate global_products
    for (let i = 0; i < candidateIds.length; i += CHUNK_SIZE) {
      const chunkIds = candidateIds.slice(i, i + CHUNK_SIZE)
      const { error } = await supabase
        .from('global_products')
        .update({ is_active: false, needs_review: false })
        .in('id', chunkIds)

      if (error) {
        console.error(`  global_products update error at batch ${i}: ${error.message}`)
        globalFailed += chunkIds.length
      } else {
        globalSuccess += chunkIds.length
      }
      process.stdout.write(`\r  Progress: ${Math.min(i + CHUNK_SIZE, candidateIds.length)}/${candidateIds.length}...`)
    }
  }

  console.log('\n\n[4/4] Execution Summary:')
  console.log(`  global_products affected: ${globalSuccess} (errors: ${globalFailed})`)
  console.log(`  store_products affected:  ${storeSuccess} (errors: ${storeFailed})`)

  // Save log
  const logFile = path.join(__dirname, '..', 'scratch', `cleanup-store-junk-plu-log-${Date.now()}.json`)
  fs.writeFileSync(
    logFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: modeLabel,
      globalSuccess,
      globalFailed,
      storeSuccess,
      storeFailed,
      totalCandidates: allCandidates.length
    }, null, 2),
    'utf-8'
  )
  console.log(`  Execution log written to: ${logFile}`)
  console.log('\nDone!')
}

runCleanup().catch(e => {
  console.error('Fatal execution error:', e)
  process.exit(1)
})

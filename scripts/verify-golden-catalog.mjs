import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function verify() {
  console.log('=== KÖRSET GOLDEN CATALOG V4 VERIFICATION ===\n')

  // 1. Table Counts
  console.log('--- 1. Table Row Counts ---')
  const { count: globalCount } = await supabase.from('global_products').select('*', { count: 'exact', head: true })
  const { count: aliasCount } = await supabase.from('product_ean_aliases').select('*', { count: 'exact', head: true })
  const { count: storeProdCount } = await supabase.from('store_products').select('*', { count: 'exact', head: true })
  console.log(`global_products:       ${globalCount}`)
  console.log(`product_ean_aliases:   ${aliasCount}`)
  console.log(`store_products:        ${storeProdCount}`)

  // 2. Demo Stores Breakdown
  console.log('\n--- 2. Demo Store Breakdown ---')
  const { data: stores } = await supabase.from('stores').select('id, code, name')
  for (const s of stores) {
    const { count } = await supabase.from('store_products').select('*', { count: 'exact', head: true }).eq('store_id', s.id)
    console.log(`Store ${s.name} (${s.code}): ${count} products`)
  }

  // 3. Test Product Resolver via fn_resolve_product_by_ean
  console.log('\n--- 3. Testing fn_resolve_product_by_ean RPC ---')
  const berekeStore = stores.find((s) => s.code === 'bereke')
  const marsStore = stores.find((s) => s.code === 'mars')

  // Sample real EANs
  const testEans = [
    { label: 'MacCoffee 3в1', ean: '8888296038578' },
    { label: 'Сарыагаш минеральная вода', ean: '4870001020019' },
    { label: 'Конфеты Toffifee', ean: '4014400901191' },
    { label: 'Приправа Knorr', ean: '4607065373516' },
    { label: 'Lactel Молоко', ean: '4870005230049' },
  ]

  for (const testItem of testEans) {
    // A. Query store context
    const { data: storeRes, error: storeErr } = await supabase.rpc('fn_resolve_product_by_ean', {
      p_ean: testItem.ean,
      p_store_id: berekeStore.id,
    })

    if (storeRes) {
      console.log(`[PASS] ${testItem.label} (EAN ${testItem.ean}):`)
      console.log(`       Name:  ${storeRes.name}`)
      console.log(`       Price: ${storeRes._sp_price_kzt} ₸ | Shelf: ${storeRes._sp_shelf_zone} / ${storeRes._sp_shelf_position}`)
      console.log(`       Image: ${storeRes.image_url}`)
      console.log(`       Halal: ${storeRes.halal_status}`)
    } else {
      // Try global lookup
      const { data: globalRes } = await supabase.rpc('fn_resolve_product_by_ean', {
        p_ean: testItem.ean,
        p_store_id: null,
      })
      if (globalRes) {
        console.log(`[PASS (global)] ${testItem.label}: ${globalRes.name} (${globalRes.ean})`)
      } else {
        console.log(`[FAIL] ${testItem.label} (${testItem.ean}) not resolved`)
      }
    }
  }

  // 4. Test Alternate EAN Alias Resolution
  console.log('\n--- 4. Testing Alternate EAN Alias Resolution ---')
  const { data: sampleAlias } = await supabase
    .from('product_ean_aliases')
    .select('ean, global_product_id, evidence_json')
    .limit(1)
    .single()

  if (sampleAlias) {
    console.log(`Testing alias scanned EAN: ${sampleAlias.ean}`)
    console.log(`Primary product evidence:`, sampleAlias.evidence_json)

    const { data: aliasResolved, error: aliasErr } = await supabase.rpc('fn_resolve_product_by_ean', {
      p_ean: sampleAlias.ean,
      p_store_id: marsStore.id,
    })

    if (aliasResolved) {
      console.log(`[PASS] Alias successfully resolved to: ${aliasResolved.name}`)
      console.log(`       Primary EAN: ${aliasResolved.ean}, Scanned Alias: ${aliasResolved._ean_alias_ean}`)
    } else {
      console.log(`[FAIL] Alias resolution returned null`)
    }
  }

  // 5. Test Search RPC
  console.log('\n--- 5. Testing Catalog Search RPC ---')
  const queries = ['молоко', 'чай', 'шоколад', 'cola']
  for (const q of queries) {
    const { data: searchResults, error: sErr } = await supabase.rpc('fn_catalog_search_rpc_v2', {
      p_store_id: berekeStore.id,
      p_query: q,
      p_category: null,
      p_limit: 3,
      p_offset: 0,
    })

    if (searchResults && searchResults.length > 0) {
      console.log(`[PASS] Search "${q}": found ${searchResults.length} items (top: "${searchResults[0].name}")`)
    } else {
      console.log(`[FAIL] Search "${q}" returned 0 results. Error:`, sErr?.message)
    }
  }

  console.log('\n=== Verification Finished! ===')
}

verify().catch(console.error)

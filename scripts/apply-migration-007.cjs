require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const sql = `
    ALTER TABLE public.global_products
      DROP CONSTRAINT IF EXISTS global_products_source_primary_check;

    ALTER TABLE public.global_products
      ADD CONSTRAINT global_products_source_primary_check
      CHECK (source_primary IN (
        'manual', 'openfoodfacts', 'store_import', 'ai_enriched',
        'eandb', 'kz_verified', 'kaspi', 'halal_damu',
        'npc', 'arbuz', 'usda'
      ));
  `

  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/pgmeta', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Response:', text.substring(0, 500))
}

run().catch(e => console.error(e))

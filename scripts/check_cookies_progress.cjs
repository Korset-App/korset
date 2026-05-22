const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const { count: c1 } = await sb.from('global_products')
    .select('*', { count: 'exact', head: true })
    .in('subcategory', ['cookies', 'pastries'])
    .eq('category', 'sweets')
  console.log(`Existing sweets/cookies+pastries: ${c1}`)
  
  const { count: c2 } = await sb.from('global_products')
    .select('*', { count: 'exact', head: true })
  console.log(`Total global_products: ${c2}`)
})().catch(console.error)

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config({ path: '.env.local' })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run() {
  const sql = fs.readFileSync('supabase/migrations/053_admin_stores_metrics_rpc.sql', 'utf8')
  console.log('Read migration SQL. Attempting to apply via verify_migration_check RPC...')

  const { data, error } = await supabase.rpc('verify_migration_check', { p_query: sql })
  if (error) {
    console.error('Failed to apply migration:', error)
  } else {
    console.log('Migration applied successfully. Response:', data)
  }
}

run()

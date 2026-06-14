import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run() {
  console.log('--- Checking Stores ---')
  const { data: stores, error: storesError } = await supabase.from('stores').select('*')
  if (storesError) {
    console.error('Error fetching stores:', storesError)
  } else {
    console.log(`Found ${stores.length} stores:`)
    stores.forEach(s => {
      console.log(`- ID: ${s.id}, Code/Slug: ${s.code}, Name: ${s.name}, OwnerID: ${s.owner_id}, Active: ${s.is_active}`)
    })
  }

  console.log('\n--- Checking Superadmins in public.users ---')
  const { data: users, error: usersError } = await supabase.from('users').select('*')
  if (usersError) {
    console.error('Error fetching public.users:', usersError)
  } else {
    const superadmins = users.filter(u => u.is_superadmin)
    console.log(`Found ${users.length} users, ${superadmins.length} are superadmins:`)
    superadmins.forEach(u => {
      console.log(`- ID: ${u.id}, AuthID: ${u.auth_id}, Name: ${u.name}, Superadmin: ${u.is_superadmin}`)
    })
  }

  console.log('\n--- Checking Auth Users ---')
  const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
  if (authUsersError) {
    console.error('Error listing auth users:', authUsersError)
  } else {
    console.log(`Found ${authUsers.users.length} auth users:`)
    authUsers.users.forEach(u => {
      console.log(`- Email: ${u.email}, ID: ${u.id}, AppMetadata:`, u.app_metadata)
    })
  }
}

run()

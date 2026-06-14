import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function clean() {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error(error)
    return
  }
  const user = data.users.find((u) => u.email === 'tempadmin@korset.kz')
  if (user) {
    console.log('Deleting from public.users...')
    await supabase.from('users').delete().eq('auth_id', user.id)
    console.log('Deleting from auth.users...')
    await supabase.auth.admin.deleteUser(user.id)
    console.log('Cleanup complete.')
  } else {
    console.log('User not found.')
  }
}

clean()

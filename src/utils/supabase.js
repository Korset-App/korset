import { createClient } from '@supabase/supabase-js'

const ENV = import.meta.env || {}
const URL = ENV.VITE_SUPABASE_URL
const KEY = ENV.VITE_SUPABASE_ANON_KEY

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}

export const isReady = Boolean(URL && KEY)

export const supabase = isReady
  ? createClient(URL, KEY, { auth: authOptions })
  : new Proxy(
      {},
      {
        get() {
          console.warn(
            '[supabase] Client not configured — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
          )
          return () =>
            Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        },
      }
    )

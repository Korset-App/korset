/**
 * Supabase клиент без npm пакета — чистый fetch
 * Работает точно так же, просто без лишней зависимости
 */

const URL  = import.meta.env.VITE_SUPABASE_URL
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

const isReady = Boolean(URL && KEY)

const headers = () => ({
  'Content-Type':  'application/json',
  'apikey':        KEY,
  'Authorization': `Bearer ${KEY}`,
})

// Простой query builder — повторяет API supabase-js
function table(name) {
  return {
    // SELECT
    async select(cols = '*', filters = {}) {
      if (!isReady) return { data: null, error: 'not configured' }
      let url = `${URL}/rest/v1/${name}?select=${cols}`
      for (const [k, v] of Object.entries(filters)) {
        url += `&${k}=eq.${encodeURIComponent(v)}`
      }
      try {
        const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(6000) })
        const data = await res.json()
        return { data: Array.isArray(data) ? data : null, error: null }
      } catch (e) { return { data: null, error: e.message } }
    },

    // SELECT single row
    async selectOne(cols = '*', filters = {}) {
      if (!isReady) return { data: null, error: 'not configured' }
      let url = `${URL}/rest/v1/${name}?select=${cols}&limit=1`
      for (const [k, v] of Object.entries(filters)) {
        url += `&${k}=eq.${encodeURIComponent(v)}`
      }
      try {
        const res = await fetch(url, {
          headers: { ...headers(), 'Accept': 'application/vnd.pgrst.object+json' },
          signal: AbortSignal.timeout(6000)
        })
        if (res.status === 406 || res.status === 404) return { data: null, error: null }
        const data = await res.json()
        return { data: data?.id || data?.ean ? data : null, error: null }
      } catch (e) { return { data: null, error: e.message } }
    },

    // INSERT
    async insert(row) {
      if (!isReady) return { error: 'not configured' }
      try {
        await fetch(`${URL}/rest/v1/${name}`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(6000)
        })
        return { error: null }
      } catch (e) { return { error: e.message } }
    },

    // UPSERT
    async upsert(row, onConflict = 'id') {
      if (!isReady) return { error: 'not configured' }
      try {
        await fetch(`${URL}/rest/v1/${name}?on_conflict=${onConflict}`, {
          method: 'POST',
          headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(6000)
        })
        return { error: null }
      } catch (e) { return { error: e.message } }
    },
  }
}

export const supabase = { from: (name) => table(name), isReady }
